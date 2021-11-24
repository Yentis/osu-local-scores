import { OpenDialogReturnValue } from 'electron'

export interface FileBufferResult {
  buffers: Map<string, ArrayBuffer>,
  errors: Error[]
}

export interface OsuLocalScores {
  getFileBuffers: (pathMap: Map<string, string>) => Promise<FileBufferResult>
  openURL: (url: string) => Promise<void>
  openDialog: (startPath?: string) => Promise<OpenDialogReturnValue>
  watchFile: (path: string, onChanged: () => void) => Promise<void>
}

export default interface ElectronWindow {
  osuLocalScores: OsuLocalScores
}
