<template>
  <q-table
    ref="table"
    binary-state-sort
    :rows="filteredRows"
    :columns="columns"
    :rows-per-page-options="[]"
    :visible-columns="visibleColumns"
    :pagination="{
      sortBy: 'name'
    }"
    :sort-method="doSort"
    row-key="scores"
  >
    <template #header="props">
      <ColumnHeader
        :props="props"
      />
    </template>

    <template #body="props">
      <ColumnBody
        :row="props.row"
        :first-score="props.row.scores[0]"
        :expanded="expanded"
        @update:expand="expand"
      />
    </template>
  </q-table>
</template>

<script lang="ts">
import { defineComponent, watch, onMounted, ref } from 'vue'
import { Ref } from '@vue/runtime-core/dist/runtime-core'
import useWindowSize from 'src/composables/useWindowSize'
import useScore, { COLUMNS } from 'src/composables/useScore'
import PlatformService from 'src/services/PlatformService'
import SettingsService from 'src/services/SettingsService'
import ColumnHeader from 'src/components/ColumnHeader.vue'
import ColumnBody from 'src/components/ColumnBody.vue'
import DatabaseResponse, { Score } from 'src/interfaces/DatabaseResponse'

interface Table {
  setPagination: (pagination: {
    rowsPerPage: number
  }) => void
}

export default defineComponent({
  components: {
    ColumnHeader,
    ColumnBody
  },

  setup () {
    const table: Ref<Table | undefined> = ref(undefined)
    const { windowSize } = useWindowSize()
    const { columns, filteredRows, filter, getBeatmaps, watchScores, filterRows } = useScore()
    const platformService = PlatformService()
    const { visibleColumns, osuPath } = SettingsService()

    onMounted(() => {
      const updateRowsPerPage = () => {
        const availableSpace = windowSize.value.y * 0.8
        const rowsPerPage = Math.floor(availableSpace / 75) - 1

        table.value?.setPagination({
          rowsPerPage: Math.max(1, rowsPerPage)
        })
      }

      watch(windowSize, updateRowsPerPage)
      updateRowsPerPage()

      const onPathChanged = (newPath: string) => {
        if (!newPath) return

        getBeatmaps()
          .then(() => watchScores(newPath))
          .catch(console.error)
      }

      watch(osuPath, onPathChanged)
      onPathChanged(osuPath.value)

      watch(filter, () => {
        filterRows().catch(console.error)
      })
    })

    const openURL = (url: string) => { platformService.openURL(url) }

    const doScoreSort = (rows: DatabaseResponse[], getValue: (score?: Score) => number, descending: boolean) => {
      rows.forEach((row) => {
        row.scores.sort((a, b) => getValue(a) - getValue(b))
        if (descending) row.scores.reverse()
      })
      rows.sort((a, b) => (getValue(a.scores[0]) - getValue(b.scores[0])))
    }

    const doSort = (rows: DatabaseResponse[], sortBy: string, descending: boolean) => {
      const columns = COLUMNS as Record<string, string>

      switch (columns[sortBy]) {
        case COLUMNS.name: {
          rows.forEach((row) => row.scores.sort((a, b) => a.score - b.score).reverse())
          rows.sort((a, b) => a.beatmap.name.localeCompare(b.beatmap.name))
          break
        }
        case COLUMNS.status: {
          rows.forEach((row) => row.scores.sort((a, b) => a.score - b.score).reverse())
          rows.sort((a, b) => a.beatmap.status - b.beatmap.status)
          break
        }
        case COLUMNS.gamemode: {
          doScoreSort(rows, (score) => score?.gamemode !== undefined ? score.gamemode : 0, descending)
          break
        }
        case COLUMNS.score: {
          doScoreSort(rows, (score) => score?.score !== undefined ? score.score : 0, descending)
          break
        }
        case COLUMNS.grade: {
          doScoreSort(rows, (score) => score?.grade !== undefined ? score.grade : 0, descending)
          break
        }
        case COLUMNS.accuracy: {
          doScoreSort(rows, (score) => score?.accuracy !== undefined ? score.accuracy : 0, descending)
          break
        }
        case COLUMNS.misses: {
          doScoreSort(rows, (score) => score?.misses !== undefined ? score.misses : 0, descending)
          break
        }
        case COLUMNS.combo: {
          doScoreSort(rows, (score) => score?.combo !== undefined ? score.combo : 0, descending)
          break
        }
        case COLUMNS.date: {
          doScoreSort(rows, (score) => score?.date !== undefined ? new Date(score.date).getTime() : 0, descending)
          break
        }
        case COLUMNS.pp: {
          doScoreSort(rows, (score) => score?.pp !== undefined ? score.pp : 0, descending)
          break
        }
      }

      return descending ? rows.reverse() : rows
    }

    const expanded = ref(new Map<number, boolean>())
    const expand = (key: number) => {
      const map = expanded.value
      const isExpanded = map.get(key) === true

      map.set(key, !isExpanded)
      expanded.value = map
    }

    return {
      table,
      columns,
      filteredRows,
      filter,
      openURL,
      visibleColumns,
      doSort,
      expanded,
      expand
    }
  }
})
</script>

<style lang="scss">
.image {
  min-width: 96px;
  width: 96px;
}

.q-table th, .q-table td {
  padding: 0.1rem;
}
</style>
