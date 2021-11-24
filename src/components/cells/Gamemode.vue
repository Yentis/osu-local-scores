<template>
  <q-td
    v-if="visibleColumns.includes('gamemode')"
    class="text-center"
  >
    {{ formatGamemode(score?.gamemode) }}
    <q-icon
      v-if="beatmap.gamemode !== score?.gamemode"
      name="loop"
    >
      <q-tooltip>
        Map converted from {{ formatGamemode(beatmap.gamemode) }} to {{ formatGamemode(score?.gamemode) }}
      </q-tooltip>
    </q-icon>
  </q-td>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Beatmap, MODES, Score } from 'src/interfaces/DatabaseResponse'
import SettingsService from 'src/services/SettingsService'

export default defineComponent({
  name: 'AccuracyCell',

  props: {
    score: {
      type: Object as PropType<Score | undefined>,
      required: true
    },
    beatmap: {
      type: Object as PropType<Beatmap>,
      required: true
    }
  },

  setup () {
    const { visibleColumns } = SettingsService()

    const formatGamemode = (val?: number) => {
      return val !== undefined ? MODES[val] : '?'
    }

    return { visibleColumns, formatGamemode }
  }
})
</script>
