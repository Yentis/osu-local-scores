import { OpenDialogReturnValue } from 'electron'

export interface OsuLocalScores {
  getFileBuffers: (pathMap: Map<string, string>) => Promise<Map<string, ArrayBuffer>>
  openURL: (url: string) => Promise<void>
  openDialog: (startPath?: string) => Promise<OpenDialogReturnValue>
  watchFile: (path: string, onChanged: () => void) => Promise<void>
}

export default interface ElectronWindow {
  osuLocalScores: OsuLocalScores
}
