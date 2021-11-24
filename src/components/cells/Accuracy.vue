<template>
  <q-td
    v-if="visibleColumns.includes('accuracy')"
    class="text-center"
  >
    {{ formatAccuracy(score?.accuracy) }}
  </q-td>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Score } from 'src/interfaces/DatabaseResponse'
import SettingsService from 'src/services/SettingsService'

export default defineComponent({
  name: 'AccuracyCell',

  props: {
    score: {
      type: Object as PropType<Score | undefined>,
      required: true
    }
  },

  setup () {
    const { visibleColumns } = SettingsService()

    const formatAccuracy = (val?: number) => {
      return val !== undefined ? `${+val.toFixed(2)}%` : '?%'
    }

    return { visibleColumns, formatAccuracy }
  }
})
</script>
