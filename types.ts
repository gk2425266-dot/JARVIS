export enum ConnectionState {
  IDLE = 'IDLE',
  REQUESTING_PERMISSION = 'REQUESTING_PERMISSION',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export enum AssistantMode {
  GENERAL = 'GENERAL',
  HOMEWORK = 'HOMEWORK',
  GK_QUIZ = 'GK_QUIZ',
  SCIENCE = 'SCIENCE',
}

export interface AudioVisualizerData {
  volume: number;
}