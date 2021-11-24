<template>
  <q-td
    v-if="visibleColumns.includes('grade')"
    class="text-center"
  >
    {{ formatGrade(score?.grade) }}
  </q-td>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { GRADES, Score } from 'src/interfaces/DatabaseResponse'
import SettingsService from 'src/services/SettingsService'

export default defineComponent({
  name: 'GradeCell',

  props: {
    score: {
      type: Object as PropType<Score | undefined>,
      required: true
    }
  },

  setup () {
    const { visibleColumns } = SettingsService()

    const formatGrade = (val?: number) => {
      return val !== undefined ? GRADES[val] : '?'
    }

    return { visibleColumns, formatGrade }
  }
})
</script>
