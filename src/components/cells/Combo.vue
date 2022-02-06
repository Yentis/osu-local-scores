<template>
  <q-td
    v-if="visibleColumns.includes('combo')"
    class="text-center"
  >
    <div
      v-if="score"
      class="column"
    >
      <span>{{ formatCombo(score.combo) }}</span>

      <span
        v-if="hasMaxCombo(score)"
        class="top-line"
      >{{ formatCombo(score.maxCombo) }}</span>

      <span
        v-if="MODES[score.gamemode] === MANIA || hasMaxCombo(score)"
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

    const formatCombo = (combo?: number) => {
      if (combo === undefined) return ''
      return +combo.toFixed(2)
    }

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
      formatCombo,
      formatAltCombo,
      hasMaxCombo: (score: Score) => score.maxCombo !== undefined
    }
  }
})
</script>

<style lang="scss">
.top-line {
  border-top: 0.1rem solid;
}
</style>
