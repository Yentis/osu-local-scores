import { Dark, LocalStorage } from 'quasar'
import { ref, watch } from 'vue'
import { Ref } from '@vue/runtime-core/dist/runtime-core'
import Settings from 'src/classes/Settings'

export const SETTINGS = 'osu-local-scores-settings'

class SettingsService {
  private settings: Settings
  darkMode: Ref<boolean>
  osuPath: Ref<string>
  visibleColumns: Ref<string[]>

  constructor () {
    this.settings = LocalStorage.getItem(SETTINGS) || new Settings()
    this.darkMode = ref(this.settings.darkMode)
    this.osuPath = ref(this.settings.osuPath)
    this.visibleColumns = ref(this.settings.visibleColumns)

    this.init()
  }

  private init () {
    this.initDarkMode()
    this.initOsuPath()
    this.initVisibleColumns()
  }

  private initDarkMode () {
    watch(this.darkMode, (newDarkMode) => {
      this.settings.darkMode = newDarkMode
      Dark.set(newDarkMode)
      LocalStorage.set(SETTINGS, this.settings)
    })
    Dark.set(this.darkMode.value)
  }

  private initOsuPath () {
    watch(this.osuPath, (newPath) => {
      this.settings.osuPath = newPath
      LocalStorage.set(SETTINGS, this.settings)
    })
  }

  private initVisibleColumns () {
    watch(this.visibleColumns, (newHeaders) => {
      this.settings.visibleColumns = newHeaders
      LocalStorage.set(SETTINGS, this.settings)
    })
  }
}

let settingsService: SettingsService | undefined
export default function init (): SettingsService {
  if (!settingsService) settingsService = new SettingsService()
  return settingsService
}
