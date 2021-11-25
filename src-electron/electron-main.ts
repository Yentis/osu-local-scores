import { app, BrowserWindow, dialog, ipcMain, nativeTheme, OpenDialogReturnValue, protocol, ProtocolRequest, ProtocolResponse } from 'electron'
import path from 'path'
import os from 'os'
import { FileBufferResult } from 'src/interfaces/ElectronWindow'
import fs, { FSWatcher } from 'graceful-fs'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

try {
  if (platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    fs.unlinkSync(path.join(app.getPath('userData'), 'DevTools Extensions'))
  }
} catch (_) { }

// determine which icon to use for the platform
// works for both dev and build
const iconPath = path.resolve(__dirname, 'icons',
  platform === 'win32' ? 'icon.ico'
    : platform === 'darwin' ? 'icon.icns'
      : 'linux-512x512.png'
)

let mainWindow: BrowserWindow | undefined

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: iconPath,
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegrationInWorker: true,
      // More info: /quasar-cli/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD || '')
    }
  })

  mainWindow.loadURL(process.env.APP_URL || '').catch(console.error)

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.whenReady().then(() => {
  protocol.registerFileProtocol('atom', (request, callback) => {
    getImageForProtocolRequest(request).then((path) => {
      const result: ProtocolResponse = { path }
      callback(result)
    }).catch(() => {
      const result: ProtocolResponse = { path: '' }
      callback(result)
    })
  })
}).catch(console.error)

async function getImageForProtocolRequest (request: ProtocolRequest): Promise<string | undefined> {
  const path = decodeURIComponent(request.url.replace('atom://', ''))
  const backgroundName = await getBackgroundName(path)
  if (!backgroundName) {
    return undefined
  }

  const folderPath = path.substring(0, path.lastIndexOf('/'))
  return `${folderPath}/${backgroundName}`
}

async function getBackgroundName (path: string): Promise<string | undefined> {
  const content = await new Promise<string>((resolve, reject) => {
    fs.readFile(path, 'utf8', (error, data) => {
      if (error) return reject(error)
      resolve(data)
    })
  })

  const eventsSubstring = content.substring(content.indexOf('[Events]'))
  const lines = eventsSubstring.split('\n').filter((line) => line.startsWith('0,0'))
  const backgroundFieldValues = lines[0]?.split(',')
  const backgroundImage = backgroundFieldValues?.[2]?.replace(/"/g, '')

  return backgroundImage?.trim()
}

ipcMain.handle('get-file-buffers', async (_, pathMap: Map<string, string>): Promise<FileBufferResult> => {
  await app.whenReady()
  const bufferMap = new Map<string, ArrayBuffer>()
  const promises: Promise<void>[] = []
  const errors: Error[] = []

  pathMap.forEach((path, hash) => {
    const promise = new Promise<ArrayBuffer>((resolve) => {
      fs.readFile(path, (err, data) => {
        if (err) {
          if (err instanceof Error) errors.push(err)
          else errors.push(Error(err as string))

          return resolve(new ArrayBuffer(0))
        }
        resolve(data.buffer)
      })
    })

    promises.push(promise.then((buffer) => {
      bufferMap.set(hash, buffer)
    }))
  })

  await Promise.all(promises)
  return { buffers: bufferMap, errors }
})

let fsWait = false
let fileWatcher: FSWatcher | undefined

ipcMain.handle('watch-file', async (event, path: string): Promise<void> => {
  await app.whenReady()
  fileWatcher?.close()
  fileWatcher = undefined

  const watcher = fs.watch(path, () => {
    if (fsWait) return
    fsWait = true
    setTimeout(() => {
      fsWait = false
    }, 100)

    event.sender.send('file-changed')
  })
  fileWatcher = watcher
})

ipcMain.handle('open-dialog', async (_, defaultPath?: string): Promise<OpenDialogReturnValue> => {
  await app.whenReady()

  return dialog.showOpenDialog({
    title: 'Select your osu! folder',
    defaultPath,
    properties: ['openDirectory']
  })
})
