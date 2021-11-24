import { contextBridge, ipcRenderer, shell } from 'electron'
import { OsuLocalScores } from 'src/interfaces/ElectronWindow'

let watchFileCallback: (() => void) | undefined

const exposedFunctions: OsuLocalScores = {
  getFileBuffers: (pathMap: Map<string, string>) => {
    return ipcRenderer.invoke('get-file-buffers', pathMap)
  },

  openURL: (url: string) => {
    return shell.openExternal(url)
  },

  openDialog: (startPath?: string) => {
    return ipcRenderer.invoke('open-dialog', startPath)
  },

  watchFile: (path: string, onChanged: () => void) => {
    watchFileCallback = onChanged
    return ipcRenderer.invoke('watch-file', path)
  }
}

ipcRenderer.on('file-changed', () => {
  watchFileCallback?.()
})

contextBridge.exposeInMainWorld('osuLocalScores', exposedFunctions)
