export type ScreenCaptureServiceEventType =
  | 'SAPLING-FOUND'
  | 'STARTED'
  | 'INITIALIZING'
  | 'STOPPED'
  | 'PREVIEW'
  | 'DEBUG_PIPELINE';

export type PreviewData = {
  imgData: ImageData;
  regionIndex: number;
};

export type DebugStep = {
  name: string;
  base64: string;
};

export type DebugPipelineData = {
  regionIndex: number;
  steps: DebugStep[];
  ocrResult: string | null;
};

export interface ScreenCaptureServiceEventListenerCallback {
  (
    eventType: ScreenCaptureServiceEventType,
    data?: string | PreviewData | DebugPipelineData
  ): void;
}
