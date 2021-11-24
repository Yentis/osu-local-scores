<template>
  <q-td
    v-if="visibleColumns.includes('combo')"
    class="text-center"
  >
    <div
      v-if="score"
      class="column"
    >
      <span>{{ +score.combo.toFixed(2) }}</span>

      <span
        v-if="score.maxCombo !== undefined"
        class="top-line"
      >{{ +score.maxCombo.toFixed(2) }}</span>

      <span
        v-if="MODES[score.gamemode] === MANIA || score.maxCombo !== undefined"
        class="top-line"
      >{{ formatAltCombo(score) }}</span>
    </div>
    <span v-else>?</span>
  </q-td>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Score, MANIA, MODES } from 'src/interfaces/DatabaseResponse'
import SettingsService from 'src/services/SettingsService'

export default defineComponent({
  name: 'ComboCell',

  props: {
    score: {
      type: Object as PropType<Score | undefined>,
      required: true
    }
  },

  setup () {
    const { visibleColumns } = SettingsService()

    const formatAltCombo = (score: Score) => {
      if (MODES[score.gamemode] === MANIA) {
        const altCombo = score.count300 !== 0 ? +(score.countGeki / score.count300).toFixed(2) : '∞'
        return `${altCombo}:1`
      }

      if (score.maxCombo === undefined) return ''
      return score.maxCombo !== 0 ? `${+((score.combo / score.maxCombo) * 100).toFixed(2)}%` : '∞'
    }

    return {
      visibleColumns,
      MODES,
      MANIA,
      formatAltCombo
    }
  }
})
</script>

<style lang="scss">
.top-line {
  border-top: 0.1rem solid;
}
</style>
