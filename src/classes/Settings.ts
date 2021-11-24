import { COLUMNS } from 'src/composables/useScore'

export default class Settings {
  darkMode = true
  osuPath = ''
  visibleColumns = Object.keys(COLUMNS)
}
