export enum WorkerFunc {
  INIT_BEATMAPS,
  UPDATE_BEATMAPS,
  FILTER_BEATMAPS,
  GET_FILE_BUFFERS,
  BATCH_CALCULATE_PP
}

export interface WorkerData {
  id: string,
  func: WorkerFunc,
  args?: unknown
}

export interface WorkerEvent {
  data: WorkerData
}

export interface InitData {
  osuBuffer: ArrayBuffer
  scoresBuffer: ArrayBuffer
  osuPath: string
}
