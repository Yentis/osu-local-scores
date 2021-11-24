<template>
  <q-td
    v-if="visibleColumns.includes('misses')"
    class="text-center"
  >
    {{ score?.misses !== undefined ? score.misses : '?' }}
  </q-td>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Score } from 'src/interfaces/DatabaseResponse'
import SettingsService from 'src/services/SettingsService'

export default defineComponent({
  name: 'MissesCell',

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
