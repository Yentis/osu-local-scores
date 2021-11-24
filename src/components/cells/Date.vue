<template>
  <q-td
    v-if="visibleColumns.includes('date')"
    class="text-center"
  >
    {{ formatDate(score?.date) }}
  </q-td>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Score } from 'src/interfaces/DatabaseResponse'
import SettingsService from 'src/services/SettingsService'

export default defineComponent({
  name: 'Date',

  props: {
    score: {
      type: Object as PropType<Score | undefined>,
      required: true
    }
  },

  setup () {
    const { visibleColumns } = SettingsService()

    const formatDate = (val?: string) => {
      return val !== undefined ? new Date(val).toLocaleString() : '?'
    }

    return { visibleColumns, formatDate }
  }
})
</script>
