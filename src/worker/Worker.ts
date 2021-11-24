import { getBeatmaps, calculatePp, PpOutput } from 'app/src-wasm/pkg'
import DatabaseResponse, { MANIA, MODES } from 'src/interfaces/DatabaseResponse'
import { InitData, WorkerData, WorkerEvent, WorkerFunc } from 'src/interfaces/Worker'
import Filter from 'src/interfaces/Filter'
import { FileBufferResult } from 'src/interfaces/ElectronWindow'

type WorkerListener = (workerData: WorkerData) => void
const workerListeners = new Map<string, WorkerListener>()

onmessage = (event) => {
  const { data } = event as WorkerEvent
  console.debug('Got message from worker service', data)
  const { id, func, args } = data

  switch (func) {
    case WorkerFunc.INIT_BEATMAPS: {
      if (busy) {
        postMessage({ id, func, args: Error('Already processing beatmaps...') })
        return
      }
      busy = true

      const initData = args as InitData
      initBeatmaps(initData).then(() => {
        postMessage({ id, func })
      }).catch((error: unknown) => {
        postMessage({ id, func, args: error })
      }).finally(() => { busy = false })

      return
    } case WorkerFunc.UPDATE_BEATMAPS: {
      if (busy) {
        postMessage({ id, func, args: Error('Already processing beatmaps...') })
        return
      }
      busy = true

      const initData = args as InitData
      updateBeatmaps(initData).then(() => {
        postMessage({ id, func })
      }).catch((error: unknown) => {
        postMessage({ id, func, args: error })
      }).finally(() => { busy = false })

      return
    } case WorkerFunc.FILTER_BEATMAPS: {
      const result = filterBeatmaps(args as Filter)
      postMessage({ id, func, args: result })
      return
    }
  }

  workerListeners.get(data.id)?.(data)
  workerListeners.delete(data.id)
}
postMessage({ id: 'init' })

let busy = false
let beatmaps: Record<string, DatabaseResponse> | undefined
let calculatedCount = 0

async function initBeatmaps ({ osuBuffer, scoresBuffer, osuPath }: InitData): Promise<void> {
  beatmaps = getBeatmaps(new Uint8Array(osuBuffer), new Uint8Array(scoresBuffer)) as Record<string, DatabaseResponse>
  await calculateAllPpValues(osuPath)
}

async function updateBeatmaps (initData: InitData): Promise<void> {
  if (!beatmaps) {
    return initBeatmaps(initData)
  }

  const { osuBuffer, scoresBuffer, osuPath } = initData
  const newBeatmaps = getBeatmaps(new Uint8Array(osuBuffer), new Uint8Array(scoresBuffer)) as Record<string, DatabaseResponse>
  const existingBeatmaps = beatmaps

  const beatmapsToCalculate: DatabaseResponse[] = []
  Object.entries(newBeatmaps).forEach(([key, value]) => {
    const existingBeatmap = existingBeatmaps[key]
    if (!existingBeatmap || value.scores.length !== existingBeatmap.scores.length) {
      beatmapsToCalculate.push(value)
      return
    }

    if (value.scores.every((score, index) => score.date === existingBeatmap.scores[index]?.date)) {
      newBeatmaps[key] = existingBeatmap
    } else {
      beatmapsToCalculate.push(value)
    }
  })

  beatmaps = newBeatmaps
  if (beatmapsToCalculate.length === 0) return
  await calculatePpValues(osuPath, beatmapsToCalculate)
}

function filterBeatmaps (filter: Filter): DatabaseResponse[] {
  if (!beatmaps) return []
  const matchingRows: DatabaseResponse[] = []

  Object.values(beatmaps).forEach((row) => {
    const matchingRow: DatabaseResponse = {
      beatmap: row.beatmap,
      scores: row.scores
    }

    // Search
    const searchWords = filter.search.split(' ')
    const searchMatching = searchWords.every((word) => {
      const lowerCaseWord = word.toLowerCase()

      return row.beatmap.name.toLowerCase().includes(lowerCaseWord)
    })
    if (!searchMatching) return

    // Status
    if (!filter.status.includes(row.beatmap.status)) return

    const seenGamemodes: number[] = []
    const filteredScores = row.scores.filter((score) => {
      // Already sorted by score
      if (filter.highestScorePerMode) {
        if (seenGamemodes.includes(score.gamemode)) return false
        seenGamemodes.push(score.gamemode)
      }

      // Gamemode
      if (!filter.gamemode.includes(score.gamemode)) return false

      // Score
      const scoreMin = filter.scoreMin || score.score
      const scoreMax = filter.scoreMax || score.score
      if (score.score < scoreMin || score.score > scoreMax) {
        return false
      }

      // Grade
      if (!filter.grade.includes(score.grade)) return false

      // Accuracy
      const accuracyMin = filter.accuracyMin || score.accuracy
      const accuracyMax = filter.accuracyMax || score.accuracy
      if (score.accuracy < accuracyMin || score.accuracy > accuracyMax) {
        return false
      }

      // Misses
      const missesMin = filter.missesMin || score.misses
      const missesMax = filter.missesMax || score.misses
      if (score.misses < missesMin || score.misses > missesMax) {
        return false
      }

      // Combo
      const comboMin = filter.comboMin || score.combo
      const comboMax = filter.comboMax || score.combo
      if (score.combo < comboMin || score.combo > comboMax) {
        return false
      }

      // Max Combo
      const maxCombo = score.maxCombo || 0
      const maxComboMin = filter.maxComboMin || maxCombo
      const maxComboMax = filter.maxComboMax || maxCombo
      if (maxCombo < maxComboMin || maxCombo > maxComboMax) {
        return false
      }

      // Alt Combo
      let altCombo: number
      if (MODES[score.gamemode] === MANIA) {
        altCombo = score.count300 !== 0 ? (score.countGeki / score.count300) : 0
      } else {
        altCombo = maxCombo !== 0 ? ((score.combo / maxCombo) * 100) : 0
      }

      const altComboMin = filter.altComboMin || altCombo
      const altComboMax = filter.altComboMax || altCombo
      if (altCombo < altComboMin || altCombo > altComboMax) {
        return false
      }

      // Mods
      let modsMatching = true
      for (const [modBits, state] of filter.mods) {
        if (state === true) {
          if (modBits === 0) {
            if (score.mods > 0) {
              modsMatching = false
              break
            } else {
              continue
            }
          }

          if (!(score.mods & modBits)) {
            modsMatching = false
            break
          }
        } else if (state === false) {
          if (modBits === 0) {
            if (score.mods === 0) {
              modsMatching = false
              break
            } else {
              continue
            }
          }

          if (score.mods & modBits) {
            modsMatching = false
            break
          }
        }
      }
      if (!modsMatching) return false

      // Date
      const date = new Date(score.date).getTime()
      const dateMin = filter.dateMin ? new Date(filter.dateMin).getTime() : date
      const dateMax = filter.dateMax ? new Date(filter.dateMax).getTime() : date
      if (date < dateMin || date > dateMax) {
        return false
      }

      // PP
      const pp = score.pp || 0
      const ppMin = filter.ppMin || pp
      const ppMax = filter.ppMax || pp
      if (pp < ppMin || pp > ppMax) {
        return false
      }

      // Max PP
      const maxPp = score.maxPp || 0
      const maxPpMin = filter.maxPpMin || maxPp
      const maxPpMax = filter.maxPpMax || maxPp
      if (maxPp < maxPpMin || maxPp > maxPpMax) {
        return false
      }

      // Alt PP
      const altPp = maxPp !== 0 ? ((pp / maxPp) * 100) : 0
      const altPpMin = filter.altPpMin || altPp
      const altPpMax = filter.altPpMax || altPp
      if (altPp < altPpMin || altPp > altPpMax) {
        return false
      }

      return true
    })
    if (filteredScores.length === 0) return
    matchingRow.scores = filteredScores

    matchingRows.push(matchingRow)
  })

  return matchingRows
}

function getFileBuffers (pathMap: Map<string, string>): Promise<FileBufferResult> {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString()

    workerListeners.set(id, (workerData) => {
      if (workerData.args instanceof Error) {
        reject(workerData.args)
        return
      }

      const result = workerData.args as FileBufferResult
      resolve(result)
    })

    const workerData: WorkerData = { id, func: WorkerFunc.GET_FILE_BUFFERS, args: pathMap }
    postMessage(workerData)
  })
}

const PP_CHUNK = 100

async function calculateAllPpValues (osuPath: string) {
  if (!beatmaps) return
  let i, j, temporary
  const promises: Promise<void>[] = []
  const beatmapList = Object.values(beatmaps)

  for (i = 0, j = beatmapList.length; i < j; i += PP_CHUNK) {
    temporary = beatmapList.slice(i, i + PP_CHUNK)
    promises.push(calculatePpValues(osuPath, temporary))
  }

  await Promise.all(promises)
  calculatedCount = 0
}

async function calculatePpValues (osuPath: string, beatmaps: DatabaseResponse[]) {
  const songsPath = `${osuPath}/Songs`
  const pathMap = new Map<string, string>()

  for (let i = 0; i < Math.min(PP_CHUNK, beatmaps.length); i++) {
    const beatmap = beatmaps[i]
    if (!beatmap) {
      continue
    }

    const filePath = beatmap.beatmap.filePath
    if (!filePath) {
      continue
    }

    const path = `${songsPath}/${filePath}`
    pathMap.set(beatmap.beatmap.hash, path)
  }

  const { buffers, errors } = await getFileBuffers(pathMap)
  if (errors) console.error(errors)

  batchCalculatePp(buffers)
}

function batchCalculatePp (bufferMap: Map<string, ArrayBuffer>) {
  bufferMap.forEach((buffer, hash) => {
    if (buffer.byteLength === 0) return
    const beatmap = beatmaps?.[hash]
    if (!beatmap) return
    const gamemode = beatmap.beatmap.gamemode

    // TODO CONVERTS
    try {
      calculatePp(gamemode, beatmap.scores, new Uint8Array(buffer)).forEach((ppOutput: PpOutput, index) => {
        const score = beatmap.scores[index]
        if (!score) return

        score.pp = ppOutput.pp === null ? undefined : ppOutput.pp
        score.maxPp = ppOutput.maxPp === null ? undefined : ppOutput.maxPp
        score.maxCombo = ppOutput.maxCombo === null ? undefined : ppOutput.maxCombo
      })
    } catch (error) {
      console.error(error)
    }
  })

  if (!beatmaps) return
  calculatedCount += bufferMap.size
  const progress = Math.min(100, Math.max(0, (calculatedCount / Object.keys(beatmaps).length) * 100))
  const workerData: WorkerData = { id: 'pp-progress', func: WorkerFunc.BATCH_CALCULATE_PP, args: progress }
  postMessage(workerData)
}
