<template>
  <q-td
    v-if="visibleColumns.includes('pp')"
    class="text-center"
  >
    <div
      v-if="score?.pp !== undefined"
      class="column"
    >
      <span>{{ +score.pp.toFixed(2) }}</span>

      <span
        v-if="score.maxPp !== undefined"
        class="top-line"
      >{{ +score.maxPp.toFixed(2) }}</span>

      <span
        v-if="score.maxPp !== undefined"
        class="top-line"
      >{{ score.maxPp !== 0 ? `${+((score.pp / score.maxPp) * 100).toFixed(2)}%` : '∞' }}</span>
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
    return { visibleColumns }
  }
})
</script>

<style lang="scss">
.top-line {
  border-top: 0.1rem solid;
}
</style>
