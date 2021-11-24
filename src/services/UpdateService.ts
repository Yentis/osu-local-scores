import { LocalStorage, Dialog, Notify } from 'quasar'
import packageInfo from '../../package.json'
import ConfirmationDialog from 'src/components/ConfirmationDialog.vue'
import PlatformService from 'src/services/PlatformService'

interface Asset {
  name: string
  'browser_download_url': string
}

interface GithubRelease {
  name: string
  'tag_name': string
  'html_url': string
  assets: Asset[],
  body: string
}

const VERSION = 'osu-local-scores-version'

export class UpdateService {
  constructor () {
    this.init().catch(console.error)
  }

  private async init () {
    const update = await this.checkUpdates()
    if (update) { this.showUpdateAvailable(update) }

    const changelog = await this.getChangelog()
    if (!changelog) return

    Dialog.create({
      component: ConfirmationDialog,
      componentProps: {
        title: 'Changelog',
        content: changelog,
        hideCancel: true
      }
    }).onDismiss(() => {
      LocalStorage.set(VERSION, packageInfo.version)
    })
  }

  private async getReleases (): Promise<GithubRelease[]> {
    const response = await fetch('https://api.github.com/repos/Yentis/osu-local-scores/releases')
    const githubReleases = (await response.json()) as GithubRelease[]
    return githubReleases
  }

  private getMigrationVersion () {
    return LocalStorage.getItem(VERSION) || ''
  }

  private async getChangelog (): Promise<string | undefined> {
    const migrationVersion = this.getMigrationVersion()
    if (migrationVersion === packageInfo.version) return
    const releases = await this.getReleases()

    let latestSeenReleaseIndex = releases.findIndex(release => release.tag_name === migrationVersion)
    if (latestSeenReleaseIndex === -1) latestSeenReleaseIndex = releases.findIndex(release => release.tag_name.endsWith('0'))
    else latestSeenReleaseIndex = Math.max(latestSeenReleaseIndex - 1, 0)
    if (latestSeenReleaseIndex === -1) return 'No release found, please notify Yentis#5218 on Discord.'

    let changelog = ''
    for (let i = 0; i < latestSeenReleaseIndex + 1; i++) {
      const release = releases[i]
      if (!release) continue

      if (i !== 0) changelog += '\n\n'
      changelog += release.tag_name + '\n' + '-----------' + '\n'
      changelog += release.body
    }

    return changelog
  }

  private async checkUpdates (): Promise<GithubRelease | undefined> {
    const latestRelease = (await this.getReleases())[0]
    if (latestRelease?.tag_name !== packageInfo.version) {
      return latestRelease
    }
  }

  private showUpdateAvailable (githubRelease: GithubRelease) {
    Notify.create({
      message: `Update available: ${githubRelease.tag_name}`,
      type: 'positive',
      position: 'bottom',
      timeout: 0,
      actions: [{
        label: 'Download',
        color: 'white',
        handler: () => {
          const asset = this.getAsset(githubRelease)
          if (!asset) return

          PlatformService().openURL(asset.browser_download_url)
        }
      }, {
        label: 'Dismiss',
        color: 'white'
      }]
    })
  }

  private getAsset (githubRelease: GithubRelease): Asset | undefined {
    const zipAsset = githubRelease.assets.find(asset => {
      return asset.name === 'osu! Score Overview-win32-x64.zip'
    })
    return zipAsset
  }
}

let updateService: UpdateService | undefined
export default function init (): UpdateService {
  if (!updateService) updateService = new UpdateService()
  return updateService
}
