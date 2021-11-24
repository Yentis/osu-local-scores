import DatabaseResponse from 'src/interfaces/DatabaseResponse'
import Filter from 'src/interfaces/Filter'
import { InitData, WorkerData, WorkerEvent, WorkerFunc } from 'src/interfaces/Worker'
import PlatformService from 'src/services/PlatformService'
import SettingsService from 'src/services/SettingsService'

type WorkerListener = (workerData: WorkerData) => void
type Transferable = (ArrayBuffer | MessagePort | ImageBitmap)[]

class WorkerService {
  workerListeners = new Map<string, WorkerListener>()
  private worker: Worker
  private messageQueue: { data: WorkerData, transferable?: Transferable }[] = []
  private initialized = false
  private platformService = PlatformService()

  constructor () {
    this.worker = new Worker(new URL('../worker/Worker.ts', import.meta.url))
    this.startInitListener()

    this.worker.onmessage = (event) => {
      const { data } = event as WorkerEvent
      console.debug('Got message from worker', data)
      const { id, func, args } = data

      switch (data.func) {
        case WorkerFunc.GET_FILE_BUFFERS: {
          const pathMap = args as Map<string, string>
          this.platformService.getFileBuffers(pathMap).then((bufferResult) => {
            this.worker.postMessage({ id, func, args: bufferResult }, Array.from(bufferResult.buffers.values()))
          }).catch((error: unknown) => {
            this.worker.postMessage({ id, func, args: error })
          })
          return
        }
      }

      this.workerListeners.get(data.id)?.(data)
    }
  }

  private startInitListener () {
    const id = 'init'
    this.workerListeners.set(id, () => {
      this.initialized = true
      this.workerListeners.delete(id)

      this.messageQueue.forEach((message) => {
        if (message.transferable) this.worker.postMessage(message.data, message.transferable)
        else this.worker.postMessage(message.data)
      })
      this.messageQueue = []
    })
  }

  private postMessage (data: WorkerData, transferable?: Transferable) {
    if (!this.initialized) {
      this.messageQueue.push({ data, transferable })
      return
    }

    if (transferable) this.worker.postMessage(data, transferable)
    else this.worker.postMessage(data)
  }

  private async prepareInitBeatmaps (): Promise<InitData | undefined> {
    const settingsService = SettingsService()
    const osuPath = settingsService.osuPath.value
    if (!osuPath) return

    const pathMap = new Map<string, string>()
    pathMap.set('osu', `${osuPath}/osu!.db`)
    pathMap.set('scores', `${osuPath}/scores.db`)
    const { buffers, errors } = await this.platformService.getFileBuffers(pathMap)

    if (errors.length > 0) {
      console.error(errors)
      throw errors[0]
    }

    return {
      osuBuffer: buffers.get('osu') as ArrayBuffer,
      scoresBuffer: buffers.get('scores') as ArrayBuffer,
      osuPath
    }
  }

  async initBeatmaps (): Promise<void> {
    const initData = await this.prepareInitBeatmaps()
    if (!initData) return
    const id = Math.random().toString()

    return new Promise((resolve, reject) => {
      this.workerListeners.set(id, (workerData) => {
        this.workerListeners.delete(id)
        if (workerData.args instanceof Error) {
          reject(workerData.args)
          return
        }

        resolve()
      })

      const workerData: WorkerData = { id, func: WorkerFunc.INIT_BEATMAPS, args: initData }
      this.postMessage(workerData, [initData.osuBuffer, initData.scoresBuffer])
    })
  }

  async updateBeatmaps (): Promise<void> {
    const initData = await this.prepareInitBeatmaps()
    if (!initData) return
    const id = Math.random().toString()

    return new Promise((resolve, reject) => {
      this.workerListeners.set(id, (workerData) => {
        this.workerListeners.delete(id)
        if (workerData.args instanceof Error) {
          reject(workerData.args)
          return
        }

        resolve()
      })

      const workerData: WorkerData = { id, func: WorkerFunc.UPDATE_BEATMAPS, args: initData }
      this.postMessage(workerData, [initData.osuBuffer, initData.scoresBuffer])
    })
  }

  async filterBeatmaps (filter: Filter): Promise<DatabaseResponse[]> {
    return new Promise((resolve) => {
      const id = Math.random().toString()

      this.workerListeners.set(id, (workerData) => {
        this.workerListeners.delete(id)
        const result = workerData.args as DatabaseResponse[]
        resolve(result)
      })

      const workerData: WorkerData = { id, func: WorkerFunc.FILTER_BEATMAPS, args: filter }
      this.postMessage(workerData)
    })
  }
}

let workerService: WorkerService | undefined
export default function init (): WorkerService {
  if (!workerService) workerService = new WorkerService()
  return workerService
}
