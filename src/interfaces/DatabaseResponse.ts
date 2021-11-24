export const MANIA = 'osu!mania'
export const MODES = ['osu!', 'osu!taiko', 'osu!catch', MANIA]
export const GRADES = ['D', 'C', 'B', 'A', 'S', 'SH', 'SS', 'XH']

export const MODS = {
  NM: 0,
  NF: 1,
  EZ: 2,
  'Touch Device / No Video': 4,
  HD: 8,
  HR: 16,
  SD: 32,
  DT: 64,
  RX: 128,
  HT: 256,
  NC: 512,
  FL: 1024,
  Auto: 2048,
  SO: 4096,
  AP: 8192,
  PF: 16384,
  '4K': 32768,
  '5K': 65536,
  '6K': 131072,
  '7K': 262144,
  '8K': 524288,
  '4-5-6-7-8K': 1015808,
  FI: 1048576,
  Random: 2097152,
  Cinema: 4194304,
  'Target Practice': 8388608,
  '9K': 16777216,
  'Co-op': 33554432,
  '1K': 67108864,
  '3K': 134217728,
  '2K': 268435456,
  'Score V2': 536870912,
  Mirror: 1073741824
}

export const UNSUBMITTED = 'Unsubmitted'
export const LOVED = 'Loved'

export const STATUS = new Map<number, string>()
STATUS.set(0, 'Unknown')
STATUS.set(1, UNSUBMITTED)
STATUS.set(2, 'Submitted')
STATUS.set(4, 'Ranked')
STATUS.set(5, 'Approved')
STATUS.set(6, 'Qualified')
STATUS.set(7, LOVED)

export interface Beatmap {
  name: string
  beatmapId: number
  beatmapsetId: number
  gamemode: number
  status: number
  hash: string
  folderName?: string
  filePath?: string
}

export interface Score {
  gamemode: number
  score: number
  accuracy: number
  grade: number
  count300: number
  count100: number
  count50: number
  countGeki: number
  countKatsu: number
  misses: number
  combo: number
  mods: number
  date: string
  pp?: number
  maxPp?: number
  maxCombo?: number
}

export default interface DatabaseResponse {
  beatmap: Beatmap
  scores: Score[]
}
