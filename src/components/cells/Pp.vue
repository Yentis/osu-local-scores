<template>
  <q-td
    v-if="visibleColumns.includes('pp')"
    class="text-center"
  >
    <div
      v-if="isDefined(score?.pp)"
      class="column"
    >
      <span>{{ formatPp(score?.pp) }}</span>

      <span
        v-if="isDefined(score?.maxPp)"
        class="top-line"
      >{{ formatPp(score?.maxPp) }}</span>

      <span
        v-if="isDefined(score?.maxPp)"
        class="top-line"
      >{{ formatAltPp(score) }}</span>
    </div>
    <span v-else>?</span>
  </q-td>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Score } from 'src/interfaces/DatabaseResponse'
import SettingsService from 'src/services/SettingsService'

export default defineComponent({
  name: 'PpCell',

  props: {
    score: {
      type: Object as PropType<Score | undefined>,
      required: true
    }
  },

  setup () {
    const { visibleColumns } = SettingsService()

    const formatPp = (pp?: number) => {
      if (pp === undefined) return ''
      return +pp.toFixed(2)
    }

    const formatAltPp = (score?: Score) => {
      if (score?.pp === undefined || score?.maxPp === undefined) return ''
      return score.maxPp !== 0 ? `${+((score.pp / score.maxPp) * 100).toFixed(2)}%` : '∞'
    }

    return {
      visibleColumns,
      isDefined: (input?: unknown) => input !== undefined,
      formatPp,
      formatAltPp
    }
  }
})
</script>

<style lang="scss">
.top-line {
  border-top: 0.1rem solid;
}
</style>
