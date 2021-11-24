<template>
  <q-td
    v-if="visibleColumns.includes('score')"
    class="text-center"
  >
    {{ formatScore(score?.score) }}
  </q-td>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Score } from 'src/interfaces/DatabaseResponse'
import SettingsService from 'src/services/SettingsService'

export default defineComponent({
  name: 'ScoreCell',

  props: {
    score: {
      type: Object as PropType<Score | undefined>,
      required: true
    }
  },

  setup () {
    const { visibleColumns } = SettingsService()

    const formatScore = (val?: number) => {
      return val !== undefined ? val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '?'
    }

    return { visibleColumns, formatScore }
  }
})
</script>
