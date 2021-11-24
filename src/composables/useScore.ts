import { shallowRef, reactive, toRaw } from 'vue'
import { Ref } from '@vue/runtime-core/dist/runtime-core'
import PlatformService from 'src/services/PlatformService'
import WorkerService from 'src/services/WorkerService'
import DatabaseResponse, { MODES, GRADES, STATUS } from 'src/interfaces/DatabaseResponse'
import { useQuasar } from 'quasar'
import Filter from 'src/interfaces/Filter'

export const COLUMNS = {
  name: 'Name',
  status: 'Status',
  gamemode: 'Gamemode',
  score: 'Score',
  grade: 'Grade',
  accuracy: 'Accuracy',
  misses: 'Misses',
  combo: 'Combo',
  mods: 'Mods',
  date: 'Date',
  pp: 'PP'
}

const filteredRows: Ref<DatabaseResponse[]> = shallowRef([])
const filter: Filter = reactive({
  search: '',
  status: Array.from(STATUS.keys()),
  gamemode: MODES.map((_, index) => index),
  grade: GRADES.map((_, index) => index),
  comboType: 1,
  mods: new Map<number, boolean | null>(),
  ppType: 1,
  highestScorePerMode: false
})

export default function useScore () {
  const $q = useQuasar()
  const platformService = PlatformService()
  const workerService = WorkerService()

  const filterRows = async () => {
    const filteredBeatmaps = await workerService.filterBeatmaps(toRaw(filter))
    filteredRows.value = filteredBeatmaps
  }

  const getBeatmaps = async () => {
    $q.loading.show({
      message: 'Loading database files...'
    })

    try {
      await workerService.initBeatmaps()
      await filterRows()
    } catch (error) {
      platformService.showError(error)
    }

    $q.loading.hide()
  }

  const watchScores = (osuPath: string) => {
    if (!osuPath) return

    platformService.watchFile(`${osuPath}/scores.db`, () => {
      workerService.updateBeatmaps()
        .then(filterRows)
        .catch((error) => platformService.showError(error))
        .finally(() => { $q.loading.hide() })
    }).catch((error) => platformService.showError(error))
  }

  const columns = Object.entries(COLUMNS).map(([name, label]) => {
    return {
      name,
      label,
      align: 'center',
      sortable: label !== COLUMNS.mods
    }
  })

  return {
    columns,
    filteredRows,
    filter,
    getBeatmaps,
    watchScores,
    filterRows
  }
}
