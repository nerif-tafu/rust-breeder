<template>
  <v-snackbar class="scanner_preview" v-model="isOpen" timeout="-1" right max-width="350">
    <p class="text-center">
      Scanner Preview
      <v-icon right>
        mdi-monitor-screenshot
      </v-icon>
    </p>
    <div class="scanner_preview-region pa-2">
      <p class="mb-3">
        Inventory Region
        <v-tooltip location="top" open-delay="400" z-index="1001" max-width="600">
          <template v-slot:activator="{ props }">
            <v-icon class="float-end" v-bind="props" variant="text">
              mdi-information-outline
            </v-icon>
          </template>
          <span
            >Displays the scanned region from Rust, which should contain the genes of the Sapling from your
            inventory/box. Genes should fit nicely in the preview or the scanner will not be able to recognize them. If
            they don't, you should review your Rust settings.
          </span>
        </v-tooltip>
      </p>
      <canvas ref="scannerPreview1"></canvas>
    </div>
    <div class="scanner_preview-region mt-4 pa-2">
      <p class="mb-3">
        Planter Region
        <v-tooltip location="top" open-delay="400" z-index="1001" max-width="600">
          <template v-slot:activator="{ props }">
            <v-icon class="float-end" v-bind="props" variant="text">
              mdi-information-outline
            </v-icon>
          </template>
          <span
            >Displays the scanned region from Rust, which should contain the genes of the Sapling in the planter that
            you are looking at. Genes should fit nicely in the preview or the scanner will not be able to recognize
            them. If they don't, you should review your Rust settings.
          </span>
        </v-tooltip>
      </p>
      <canvas ref="scannerPreview2"></canvas>
    </div>
  </v-snackbar>

  <Teleport to="body">
    <div
      v-if="showDebug && (debugPipelines[0] || debugPipelines[1])"
      class="scanner_debug-window"
      :style="{ left: debugWindowX + 'px', top: debugWindowY + 'px' }"
    >
      <div
        class="scanner_debug-window-header"
        @mousedown="startDrag"
      >
        <v-icon size="small" class="mr-1">mdi-drag</v-icon>
        <span>OCR pipeline debug</span>
      </div>
      <div class="scanner_debug-window-body">
        <div v-if="debugPipelines[0]" class="scanner_preview-debug pa-2 mb-3">
          <p class="mb-2 text-subtitle-2">
            Planter region (first gene)
            <span v-if="debugPipelines[0].ocrResult != null" class="ml-2 font-weight-bold">
              OCR result: {{ debugPipelines[0].ocrResult }}
            </span>
            <span v-else class="ml-2 text-medium-emphasis">OCR result: (none)</span>
          </p>
          <div class="scanner_preview-debug-steps">
            <div
              v-for="(step, i) in debugPipelines[0].steps"
              :key="'planter-' + i"
              class="scanner_preview-debug-step"
            >
              <div class="text-caption mb-1 font-weight-medium">Step {{ i + 1 }}: {{ step.name }}</div>
              <img :src="getStepImageSrc(step)" :alt="step.name" class="scanner_preview-debug-img" />
            </div>
          </div>
        </div>
        <div v-if="debugPipelines[1]" class="scanner_preview-debug pa-2">
          <p class="mb-2 text-subtitle-2">
            Inventory region (first gene)
            <span v-if="debugPipelines[1].ocrResult != null" class="ml-2 font-weight-bold">
              OCR result: {{ debugPipelines[1].ocrResult }}
            </span>
            <span v-else class="ml-2 text-medium-emphasis">OCR result: (none)</span>
          </p>
          <div class="scanner_preview-debug-steps">
            <div
              v-for="(step, i) in debugPipelines[1].steps"
              :key="'inventory-' + i"
              class="scanner_preview-debug-step"
            >
              <div class="text-caption mb-1 font-weight-medium">Step {{ i + 1 }}: {{ step.name }}</div>
              <img :src="getStepImageSrc(step)" :alt="step.name" class="scanner_preview-debug-img" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import type { DebugPipelineData } from '@/services/screen-capture/models';
import { Component, Vue, Prop } from 'vue-facing-decorator';

@Component
export default class SaplingScreenCapturePreview extends Vue {
  @Prop({ type: Boolean }) isOpen: boolean;
  @Prop({ type: Boolean }) showDebug: boolean;
  @Prop({ type: Object, default: () => ({}) }) debugPipelines: Record<number, DebugPipelineData>;

  debugWindowX = 24;
  debugWindowY = 100;

  startDrag(e: MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = this.debugWindowX;
    const startTop = this.debugWindowY;
    const onMove = (e2: MouseEvent) => {
      this.debugWindowX = startLeft + (e2.clientX - startX);
      this.debugWindowY = startTop + (e2.clientY - startY);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  getStepImageSrc(step: { name: string; base64: string }): string {
    if (!step?.base64) return '';
    return step.base64.startsWith('data:') ? step.base64 : `data:image/png;base64,${step.base64}`;
  }

  setPreview(regionIndex: number, imgData: ImageData) {
    const previewCanvas = this.$refs[`scannerPreview${regionIndex + 1}`] as HTMLCanvasElement;
    const previewCanvasCtx = previewCanvas.getContext('2d');
    if (previewCanvasCtx) {
      previewCanvas.width = imgData.width;
      previewCanvas.height = imgData.height;
      previewCanvasCtx.putImageData(imgData, 0, 0);
    }
  }
}
</script>

<style scoped lang="scss">
.scanner_preview {
  .v-snack__action {
    display: none;
  }
  .scanner_preview-region {
    border: 2px solid black;
  }
  canvas {
    width: 100%;
    display: block;
  }

  .scanner_preview-debug {
    border: 2px solid rgb(var(--v-theme-primary));
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.04);
  }

  .scanner_preview-debug-steps {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    max-height: 320px;
    overflow-y: auto;
  }

  .scanner_preview-debug-step {
    flex: 0 0 auto;
    text-align: center;
    min-width: 80px;
  }

  .scanner_preview-debug-img {
    display: block;
    width: 80px;
    height: auto;
    min-height: 40px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    border: 1px solid #ccc;
    border-radius: 2px;
    background: #fff;
  }
}

.scanner_debug-window {
  position: fixed;
  z-index: 9999;
  min-width: 320px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
}

.scanner_debug-window-header {
  padding: 8px 12px;
  cursor: grab;
  user-select: none;
  display: flex;
  align-items: center;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 600;
  font-size: 0.875rem;
}

.scanner_debug-window-header:active {
  cursor: grabbing;
}

.scanner_debug-window-body {
  padding: 8px;
  overflow-y: auto;
  max-height: calc(85vh - 44px);
}
</style>

<style lang="scss">
.scanner_preview {
  .v-snack__action {
    display: none;
  }
}
</style>
