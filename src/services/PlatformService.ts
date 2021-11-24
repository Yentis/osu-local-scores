import { OpenDialogReturnValue } from 'electron'
import { Notify } from 'quasar'
import ElectronWindow, { FileBufferResult } from 'src/interfaces/ElectronWindow'

class PlatformService {
  private electronWindow = (window as unknown) as ElectronWindow

  openURL (url: string) {
    this.electronWindow.osuLocalScores.openURL(url)
      .catch((error) => this.showError(error))
  }

  openFilePicker (startPath?: string): Promise<OpenDialogReturnValue> {
    return this.electronWindow.osuLocalScores.openDialog(startPath)
  }

  watchFile (path: string, onChanged: () => void): Promise<void> {
    return this.electronWindow.osuLocalScores.watchFile(path, onChanged)
  }

  getFileBuffers (pathMap: Map<string, string>): Promise<FileBufferResult> {
    return this.electronWindow.osuLocalScores.getFileBuffers(pathMap)
  }

  showError (error: unknown) {
    console.error(error)
    Notify.create({
      type: 'negative',
      message: (error instanceof Error) ? error.message : (error as string)
    })
  }
}

let platformService: PlatformService | undefined
export default function init (): PlatformService {
  if (!platformService) platformService = new PlatformService()
  return platformService
}
