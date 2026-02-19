import Jimp from 'jimp';
import {
  DebugPipelineData,
  PreviewData,
  ScreenCaptureServiceEventListenerCallback,
  ScreenCaptureServiceEventType
} from './models';
import { createWorker, PSM } from 'tesseract.js';

const TIME_MS_BETWEEEN_SCANS = 200;

const REGIONS: { [key: string]: number }[] = [
  // World UI region.
  {
    GENE_WIDTH: 0.008,
    GENE_HEIGHT: 0.015,
    FIRST_GENE_X_CENTER: 0.42,
    FIRST_GENE_Y_CENTER: 0.2845,
    DISTANCE_BETWEEN_GENES: 0.01405
  },
  // Inventory region.
  {
    GENE_WIDTH: 0.01,
    GENE_HEIGHT: 0.0185,
    FIRST_GENE_X_CENTER: 0.617,
    FIRST_GENE_Y_CENTER: 0.3512,
    DISTANCE_BETWEEN_GENES: 0.0241
  }
];

const SUPPORTED_ASPECT_RATIO = 16 / 9;

class ScreenCaptureService {
  listeners: ScreenCaptureServiceEventListenerCallback[] = [];

  isActive = false;
  withPreview = false;
  withDebug = false;
  video: HTMLVideoElement;
  workers: Tesseract.Worker[] = [];
  videoCanvas = document.createElement('canvas');

  startCapturing(withPreview: boolean, withDebug = false) {
    this.isActive = true;
    this.withPreview = withPreview;
    this.withDebug = withDebug;
    navigator.mediaDevices
      .getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })
      .then(async (mediaStream) => {
        await this.setupRecognitionWorkers();

        this.video = document.createElement('video');
        this.video.srcObject = mediaStream;
        this.video.addEventListener('loadedmetadata', () => {
          this.startScanning();
        });
        const track = mediaStream.getVideoTracks()[0];
        track.addEventListener('ended', () => {
          this.stopCapturing();
        });
        this.video.play();
      })
      .catch(() => {
        // Fail silently. It's likely that permission to capture screen was denied by the User.
      });
  }

  stopCapturing() {
    this.isActive = false;
    this.stopScanning();
    const stream: MediaStream = this.video.srcObject as MediaStream;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
      this.video.srcObject = null;
    }
  }

  async setupRecognitionWorkers() {
    this.sendEventToListeners('INITIALIZING');
    if (this.workers.length === 0) {
      try {
        this.workers = await Promise.all(
          Array(REGIONS.length * 6)
            .fill(0)
            .map(this.setupWorker.bind(this))
        );
      } catch (err) {
        // It can happen that the data for Tesseract text recognition is corrupted.
        // In this case we clear the database and reinitialize the workers.
        await this.clearTesseractDB();
        await this.setupRecognitionWorkers();
      }
    }
  }

  private async setupWorker(): Promise<Tesseract.Worker> {
    let worker;
    try {
      worker = await createWorker();

      await worker.setParameters({
        // eslint-disable-next-line @typescript-eslint/camelcase
        tessedit_pageseg_mode: PSM.SINGLE_CHAR,
        // Only consider gene letters so W is not confused or rejected
        // eslint-disable-next-line @typescript-eslint/camelcase
        tessedit_char_whitelist: 'GHWXY'
      });
      return worker;
    } catch (err) {
      if (worker) {
        await worker.terminate();
      }
      throw err;
    }
  }

  private async clearTesseractDB() {
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('keyval-store');
      request.onsuccess = () => {
        resolve(null);
      };
      request.onerror = () => {
        reject();
      };
      request.onblocked = () => {
        reject();
      };
      request.onupgradeneeded = () => {
        reject();
      };
    }).catch(() => {
      return this.clearTesseractDB();
    });
  }

  private startScanning() {
    this.sendEventToListeners('STARTED');
    this.scanFrameRecurrent();
  }

  private scanFrameRecurrent() {
    if (this.isActive) {
      window.requestAnimationFrame(() => {
        this.scanFrame().then(() => {
          setTimeout(() => {
            this.scanFrameRecurrent();
          }, TIME_MS_BETWEEEN_SCANS);
        });
      });
    }
  }

  private async stopScanning() {
    this.sendEventToListeners('STOPPED');
  }

  private scanFrame() {
    const allGeneScans = this.getSaplingGenesScans();

    const promises: Promise<string | null>[] = [];
    allGeneScans.forEach((geneScans, regionIndex) => {
      geneScans.forEach((geneImgData, index) => {
        promises.push(this.getRecognizedGene(geneImgData, regionIndex * 6 + index));
      });
    });

    return Promise.all(promises).then((results) => {
      const regionResults: (string | null)[][] = [];
      REGIONS.forEach(() => {
        regionResults.push(results.splice(0, 6));
      });

      regionResults.forEach((regionGenes) => {
        const saplingGenesString = regionGenes.map((gene) => (gene ? gene : '')).join('');
        if (saplingGenesString.match(/^[GHYWX]{6}$/g)) {
          this.sendEventToListeners('SAPLING-FOUND', saplingGenesString);
        }
      });
    });
  }

  private jimpToBase64(image: Jimp): Promise<string> {
    return new Promise((resolve, reject) => {
      image.getBase64('image/png', (err, data) => (err ? reject(err) : resolve(data)));
    });
  }

  private async getRecognizedGeneWithDebug(imgData: ImageData, workerIndex: number): Promise<string | null> {
    const steps: { name: string; base64: string }[] = [];
    try {
      const image = await new Promise<Jimp>((resolve, reject) => {
        new Jimp(
          { data: Buffer.from(imgData.data), width: imgData.width, height: imgData.height },
          (err, img) => (err ? reject(err) : resolve(img))
        );
      });
      steps.push({ name: '1. Raw crop', base64: await this.jimpToBase64(image) });

      image.greyscale();
      steps.push({ name: '2. Greyscale', base64: await this.jimpToBase64(image) });

      image.invert();
      steps.push({ name: '3. Invert', base64: await this.jimpToBase64(image) });

      image.normalize();
      steps.push({ name: '4. Normalize', base64: await this.jimpToBase64(image) });

      image.scale(2);
      steps.push({ name: '5. Scale 2×', base64: await this.jimpToBase64(image) });

      image.convolute([
        [0, -0.5, 0],
        [-0.5, 4, -0.5],
        [0, -0.5, 0]
      ]);
      steps.push({ name: '6. Convolute (sharpen)', base64: await this.jimpToBase64(image) });

      image.contrast(0.5);
      steps.push({ name: '7. Contrast', base64: await this.jimpToBase64(image) });

      const data = await this.jimpToBase64(image);
      const {
        data: { text: rawText }
      } = await this.workers[workerIndex].recognize(data);
      const text = rawText.replace(/\s/g, '').toUpperCase();
      const ocrResult = text.match(/^[GHYWX]{1}$/g) ? text : null;

      const regionIndex = Math.floor(workerIndex / 6);
      this.sendEventToListeners('DEBUG_PIPELINE', { regionIndex, steps, ocrResult } as DebugPipelineData);
      return ocrResult;
    } catch {
      const regionIndex = Math.floor(workerIndex / 6);
      this.sendEventToListeners('DEBUG_PIPELINE', { regionIndex, steps, ocrResult: null } as DebugPipelineData);
      return null;
    }
  }

  private getRecognizedGene(imgData: ImageData, workerIndex: number): Promise<string | null> {
    const isFirstGeneOfRegion = workerIndex === 0 || workerIndex === 6;
    if (this.withDebug && isFirstGeneOfRegion) {
      return this.getRecognizedGeneWithDebug(imgData, workerIndex);
    }
    const promise = new Promise<string | null>((resolve) => {
      new Jimp({ data: Buffer.from(imgData.data), width: imgData.width, height: imgData.height }, (err, image) => {
        if (err) {
          resolve(null);
        }
        image
          .greyscale()
          .invert()
          .normalize()
          .scale(2)
          .convolute([
            [0, -0.5, 0],
            [-0.5, 4, -0.5],
            [0, -0.5, 0]
          ])
          .contrast(0.5)
          .getBase64('image/png', async (_err, data) => {
            let {
              data: { text }
            } = await this.workers[workerIndex].recognize(data);

            text = text.replace(/\s/g, '').toUpperCase();

            if (text.match(/^[GHYWX]{1}$/g)) {
              resolve(text);
            } else {
              resolve(null);
            }
          });
      });
    });
    return promise;
  }

  private getSaplingGenesScans(): ImageData[][] {
    const allGeneScans: ImageData[][] = [];
    const aspectRatio = this.video.videoWidth / this.video.videoHeight;
    let yPxOffset = 0;
    if (aspectRatio !== SUPPORTED_ASPECT_RATIO) {
      const expectedHeight = Math.round(this.video.videoWidth / SUPPORTED_ASPECT_RATIO);
      // If ratio is not 16:9 it means user should use windowed mode and that there is Application Bar at the top.
      yPxOffset = -(this.video.videoHeight - expectedHeight);
      this.videoCanvas.height = expectedHeight;
    } else {
      this.videoCanvas.height = this.video.videoHeight;
    }
    this.videoCanvas.width = this.video.videoWidth;

    const videoCanvasCtx = this.videoCanvas.getContext('2d');
    if (this.videoCanvas.width !== 0 && videoCanvasCtx) {
      videoCanvasCtx.drawImage(this.video, 0, yPxOffset, this.videoCanvas.width, this.videoCanvas.height - yPxOffset);
      REGIONS.forEach((region, regionIndex) => {
        if (this.withPreview) {
          this.sendPreview(regionIndex, this.videoCanvas, videoCanvasCtx);
        }
        const geneScans = [];
        for (let genePosition = 0; genePosition < 6; genePosition++) {
          const saplingGenesXPxStart = Math.round(
            this.videoCanvas.width *
              (region.FIRST_GENE_X_CENTER - region.GENE_WIDTH / 2 + region.DISTANCE_BETWEEN_GENES * genePosition)
          );
          const saplingGenesXPxWidth = Math.round(this.videoCanvas.width * region.GENE_WIDTH);
          const saplingGenesYPxStart = Math.round(
            this.videoCanvas.height * (region.FIRST_GENE_Y_CENTER - region.GENE_HEIGHT / 2)
          );
          const saplingGenesYPxWidth = Math.round(this.videoCanvas.height * region.GENE_HEIGHT);
          const imgData = videoCanvasCtx.getImageData(
            saplingGenesXPxStart,
            saplingGenesYPxStart,
            saplingGenesXPxWidth,
            saplingGenesYPxWidth
          );
          geneScans.push(imgData);
        }
        allGeneScans.push(geneScans);
      });
    }
    return allGeneScans;
  }

  sendPreview(regionIndex: number, videoCanvas: HTMLCanvasElement, videoCanvasCtx: CanvasRenderingContext2D) {
    const region = REGIONS[regionIndex];
    const previewTopLeftCornerXPx = Math.round(
      videoCanvas.width * (region.FIRST_GENE_X_CENTER - region.GENE_WIDTH / 2)
    );
    const previewTopLeftCornerYPx = Math.round(
      videoCanvas.height * (region.FIRST_GENE_Y_CENTER - region.GENE_HEIGHT / 2)
    );
    const previewXPxWidth = Math.round(
      this.videoCanvas.width *
        (region.FIRST_GENE_X_CENTER + 5 * region.DISTANCE_BETWEEN_GENES + region.GENE_WIDTH / 2) -
        previewTopLeftCornerXPx
    );
    const previewYPxWidth = Math.round(this.videoCanvas.height * region.GENE_HEIGHT);
    const imgData = videoCanvasCtx.getImageData(
      previewTopLeftCornerXPx,
      previewTopLeftCornerYPx,
      previewXPxWidth,
      previewYPxWidth
    );

    this.sendEventToListeners('PREVIEW', { imgData, regionIndex });
  }

  sendEventToListeners(
    eventName: ScreenCaptureServiceEventType,
    data?: string | PreviewData | DebugPipelineData
  ) {
    this.listeners.forEach((listenerCallback) => {
      listenerCallback(eventName, data);
    });
  }

  addEventListener(callback: ScreenCaptureServiceEventListenerCallback) {
    this.listeners.push(callback);
  }
}

export default new ScreenCaptureService();
