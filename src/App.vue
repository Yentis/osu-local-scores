<template>
  <router-view />
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import initPlatformService from 'src/services/PlatformService'
import initUpdateService from 'src/services/UpdateService'
import initWorkerService from 'src/services/WorkerService'
import initSettingsService from 'src/services/SettingsService'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'App',

  setup () {
    initPlatformService()
    initUpdateService()
    initWorkerService()
    const { osuPath } = initSettingsService()

    onMounted(() => {
      if (osuPath.value !== '') return
      useQuasar().notify({
        type: 'info',
        message: 'To start viewing scores please set your osu! path from the settings menu!'
      })
    })
  }
})
</script>
