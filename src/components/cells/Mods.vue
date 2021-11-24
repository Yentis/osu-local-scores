<template>
  <q-td
    v-if="visibleColumns.includes('mods')"
    class="text-center"
  >
    {{ formatMods(score?.mods) }}
  </q-td>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { MODS, Score } from 'src/interfaces/DatabaseResponse'
import SettingsService from 'src/services/SettingsService'

export default defineComponent({
  name: 'Mods',

  props: {
    score: {
      type: Object as PropType<Score | undefined>,
      required: true
    }
  },

  setup () {
    const { visibleColumns } = SettingsService()

    const getMods = (mods: number) => {
      const output: string[] = []
      const modsBits = MODS as Record<string, number>

      while (mods >= 0) {
        Object.keys(modsBits).reverse().forEach((key) => {
          const modNumber = modsBits[key]
          if (modNumber === undefined) return
          if (modNumber > mods) return

          mods -= modNumber
          if (mods === 0) mods -= 1
          output.push(key)
        })
      }

      return output
    }

    const formatMods = (val?: number) => {
      return val !== undefined ? getMods(val).join(', ') : '?'
    }

    return { visibleColumns, formatMods }
  }
})
</script>
