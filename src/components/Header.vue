<template>
  <q-header>
    <q-toolbar>
      <q-btn
        flat
        dense
        round
        icon="settings_brightness"
        aria-label="Dark Mode"
        @click="toggleDarkMode"
      />

      <q-space />

      <span class="text-bold">
        osu! Score Overview
      </span>

      <q-space />

      <q-btn
        flat
        dense
        round
        icon="settings"
        aria-label="Settings"
        @click="showSettingsDialog"
      />
    </q-toolbar>
  </q-header>
</template>

<script lang="ts">
import { useQuasar } from 'quasar'
import { defineComponent, onMounted, ref } from 'vue'
import SettingsDialog from 'src/components/SettingsDialog.vue'
import SettingsService from 'src/services/SettingsService'
import WorkerService from 'src/services/WorkerService'

export default defineComponent({
  name: 'Header',

  setup () {
    const { darkMode } = SettingsService()
    const $q = useQuasar()
    const progress = ref(0)

    const toggleDarkMode = () => {
      darkMode.value = !darkMode.value
    }

    const showSettingsDialog = () => {
      $q.dialog({
        component: SettingsDialog
      })
    }

    onMounted(() => {
      WorkerService().workerListeners.set('pp-progress', (workerData) => {
        const progress = workerData.args as number
        $q.loading.show({
          message: `Calculating pp values... ${+progress.toFixed(2)}%`
        })
      })
    })

    return {
      toggleDarkMode,
      showSettingsDialog,
      progress
    }
  }
})
</script>
