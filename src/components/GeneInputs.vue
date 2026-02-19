<template>
  <div class="gene-inputs">
    <div class="gene-inputs_tabs-container">
      <v-tabs v-model="tab">
        <v-tab value="0">{{ functionalCookiesAccepted ? 'Current' : 'Genes' }}</v-tab>
        <v-tab v-if="functionalCookiesAccepted" value="1" :class="{ 'gene-inputs_tab--animate': animatePreviousGenesTabIn }"
          >Saved</v-tab
        >
      </v-tabs>
      <v-btn
        :tile="!$vuetify.display.xs"
        :icon="$vuetify.display.xs"
        :disabled="!isFormValid"
        v-if="functionalCookiesAccepted && !autoSaveInputSets && tab !== '1'"
        class="gene-inputs_store-button"
        plain
        @click="handleStoreSetClick"
      >
        <v-icon :left="!$vuetify.display.xs" :class="{ 'mr-1': !$vuetify.display.xs }">
          mdi-plus
        </v-icon>
        <span v-if="!$vuetify.display.xs">Save</span>
      </v-btn>
    </div>

    <v-window v-model="tab">
      <v-window-item value="0">
        <v-form ref="form" v-model="isFormValid" spellcheck="false" class="gene-inputs_form">
          <div
            class="gene-inputs_genes-area"
            ref="genesAreaRef"
            @wheel="handleGenesAreaWheel"
          >
            <SaplingInputHighlights :input-string="saplingGenesString" :highlighted-map="highlightedMap" />
            <div
              class="gene-inputs_numbering-scroll"
              ref="numberingScrollWrapperRef"
            >
              <SaplingListNumbering :sapling-gene-list="saplingGeneList"></SaplingListNumbering>
            </div>
            <v-textarea
              :key="genesInputKey"
              full-width
              ref="saplingGenesInput"
              class="gene-inputs_input"
              placeholder="Add your genes here..."
              :value="saplingGenesString"
              @update:model-value="handleSaplingGenesInput($event)"
              @blur="handleSaplingGenesInputBlur"
              @focus="handleSaplingGenesInputFocus"
              @keydown="handleSaplingGenesInputKeyDown($event)"
              outlined
              no-resize
              :disabled="disabled"
              :rows="Math.max(5, saplingGenesString.split(`\n`).length || 0)"
              :rules="sourceSaplingRules"
              autocomplete="off"
            ></v-textarea>
            <SaplingListPreview
              :sapling-gene-list="saplingGeneList"
              ref="saplingListPreview"
              :highlight-errors="highlightInputErrors"
            ></SaplingListPreview>
          </div>
        </v-form>
      </v-window-item>
      <v-window-item value="1" v-if="functionalCookiesAccepted" eager>
        <PreviousGenes
          ref="previousGenes"
          :selected-plant-type-name="selectedPlantTypeName"
          @genes-selected="handlePreviousGenesSelectedEvent"
        ></PreviousGenes>
      </v-window-item>
    </v-window>
  </div>
</template>

<script lang="ts">
import SaplingInputHighlights from './SaplingInputHighlights.vue';
import SaplingListPreview from './SaplingListPreview.vue';
import SaplingListNumbering from './SaplingListNumbering.vue';
import PreviousGenes from './PreviousGenes.vue';

import { Component, Prop, Vue } from 'vue-facing-decorator';
import { GeneticsMap } from '@/services/crossbreeding-service/models';
import { playAudio } from '@/lib/ui-utils';
import StoredSet from '@/interfaces/stored-set';
import eventBus, { GLOBAL_EVENT_SELECTED_PLANT_TYPE_CHANGED } from '@/lib/global-event-bus';

@Component({
  components: {
    SaplingInputHighlights,
    SaplingListPreview,
    SaplingListNumbering,
    PreviousGenes
  },
  emits: ['validity-change']
})
export default class GeneInputs extends Vue {
  @Prop({ type: Boolean }) readonly functionalCookiesAccepted: boolean;
  @Prop({ type: Boolean }) readonly disabled: boolean;
  @Prop({ type: Boolean }) readonly soundsEnabled: boolean;
  @Prop({ type: Boolean }) readonly autoSaveInputSets: boolean;
  @Prop({ type: String }) readonly selectedPlantTypeName: string;
  @Prop({ type: GeneticsMap, required: false }) readonly highlightedMap: GeneticsMap | null;

  saplingGenes = ``;
  isFormValid = false;
  isInputFocused = false;
  animatePreviousGenesTabIn = false;
  wasLastInputLongTimeAgo = false;
  lastInputTimeStamp = null;
  lastInputLongAgoTimeoutRef: undefined | NodeJS.Timeout;
  tab: string = '0';
  private genesInputKey = 0;
  private textareaScrollListener: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  sourceSaplingRules = [
    (v: string) =>
      this.isGenesListValid((v?.trim() ?? '') || this.saplingGenesString) ||
      'The list of genes is incomplete or invalid. Review if you provided them all correctly.',
    (v: string) => v !== '' || 'Give me some genes to work with!',
    (v: string) => !/^([GHWYX]{6}\n{0})*\n*$/.test(v) || 'Give me some more genes to work with!'
  ];

  private isGenesListValid(v: string): boolean {
    const raw = (v ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '').trim();
    if (raw === '') return false;
    const normalized = raw.toUpperCase().replace(/[^GHWYX\n]/g, '');
    const lines = normalized.split(/\n/).filter((line) => line.length > 0);
    return lines.length > 0 && lines.every((line) => /^[GHWYX]{6}$/.test(line));
  }

  get saplingGenesString(): string {
    return typeof this.saplingGenes === 'string' ? this.saplingGenes : '';
  }

  get saplingGeneList() {
    const s = this.saplingGenesString.trim();
    return s === '' ? [] : s.split(/\r?\n/);
  }

  get highlightInputErrors() {
    return this.wasLastInputLongTimeAgo || !this.isInputFocused;
  }

  mounted() {
    const searchParams = new URLSearchParams(window.location.search);
    const genesUrlParam = searchParams.get('genes');
    if (genesUrlParam) {
      this.saplingGenes = genesUrlParam.split(',').join('\n');
    }

    if (this.saplingGenes !== '') {
      this.checkFormValidity();
    }

    this.$nextTick(() => this.attachNumberingScrollSync());
  }

  beforeUnmount() {
    const ta = this.getTextareaElement();
    if (ta && this.textareaScrollListener) {
      ta.removeEventListener('scroll', this.textareaScrollListener);
    }
    this.resizeObserver?.disconnect();
  }

  private getTextareaElement(): HTMLTextAreaElement | null {
    const input = this.$refs.saplingGenesInput as { $el: HTMLElement } | undefined;
    return input?.$el?.querySelector?.('textarea') ?? null;
  }

  private attachNumberingScrollSync() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    const textarea = this.getTextareaElement();
    const wrapper = this.$refs.numberingScrollWrapperRef as HTMLElement | undefined;
    if (!textarea || !wrapper) return;

    this.updateNumberingWrapperHeight();
    this.syncNumberingScroll();

    this.textareaScrollListener = () => this.syncNumberingScroll();
    textarea.addEventListener('scroll', this.textareaScrollListener);

    this.resizeObserver = new ResizeObserver(() => this.updateNumberingWrapperHeight());
    this.resizeObserver.observe(textarea);
  }

  private syncNumberingScroll() {
    const textarea = this.getTextareaElement();
    const wrapper = this.$refs.numberingScrollWrapperRef as HTMLElement | undefined;
    if (textarea && wrapper) wrapper.scrollTop = textarea.scrollTop;
  }

  private updateNumberingWrapperHeight() {
    const textarea = this.getTextareaElement();
    const wrapper = this.$refs.numberingScrollWrapperRef as HTMLElement | undefined;
    const form = (this.$refs.form as { $el: HTMLElement })?.$el;
    if (!textarea || !wrapper || !form) return;

    const taRect = textarea.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    wrapper.style.height = `${textarea.clientHeight}px`;
    wrapper.style.top = `${taRect.top - formRect.top}px`;
  }

  handleGenesAreaWheel(event: WheelEvent) {
    const textarea = this.getTextareaElement();
    if (!textarea || textarea.scrollHeight <= textarea.clientHeight) return;

    const maxScroll = textarea.scrollHeight - textarea.clientHeight;
    const atTop = textarea.scrollTop <= 0;
    const atBottom = textarea.scrollTop >= maxScroll;
    const scrollingDown = event.deltaY > 0;
    const scrollingUp = event.deltaY < 0;

    if ((atTop && scrollingUp) || (atBottom && scrollingDown)) return;

    event.preventDefault();
    textarea.scrollTop = Math.max(0, Math.min(maxScroll, textarea.scrollTop + event.deltaY));
  }

  handleSaplingGenesInput(value: string | Event) {
    const str = typeof value === 'string' ? value : (value?.target && (value.target as HTMLInputElement).value) ?? '';
    this.prepareCheckForDatedInputActivity();
    const textarea = (this.$refs.saplingGenesInput as { $el: HTMLElement }).$el?.querySelector('textarea');
    if (textarea) {
      const caretPosition = textarea.selectionStart;
      this.saplingGenes = str;
      this.checkFormValidity();
      this.onNextTickRerender(() => {
        this.saplingGenes = str.toUpperCase().replace(/[^GHWYX\n]/g, '');
        if (this.saplingGenes.length !== 0 && this.saplingGenes.charAt(0).match(/\r?\n/)) {
          this.saplingGenes = this.saplingGenes.slice(1);
        }
        this.checkFormValidity();
        this.onNextTickRerender(() => {
          textarea.selectionEnd = caretPosition + (this.saplingGenes.length - str.length);
        });
      });
    }
  }

  prepareCheckForDatedInputActivity() {
    this.wasLastInputLongTimeAgo = false;
    clearTimeout(this.lastInputLongAgoTimeoutRef);
    this.lastInputLongAgoTimeoutRef = setTimeout(() => {
      this.wasLastInputLongTimeAgo = true;
    }, 2000);
  }

  handleSaplingGenesInputFocus() {
    this.isInputFocused = true;
    this.prepareCheckForDatedInputActivity();
  }

  handleSaplingGenesInputBlur() {
    this.isInputFocused = false;
    this.saplingGenes = this.saplingGenesString.replaceAll(/[\n]{2,}/g, '\n');
    this.saplingGenes = this.getDeduplicatedSaplingGeneList().join('\n');
    this.checkFormValidity();
  }

  handleStoreSetClick() {
    this.storeCurrentSet();
  }

  checkFormValidity() {
    this.onNextTickRerender(async () => {
      const form = this.$refs.form as { validate: () => Promise<{ valid: boolean }>; resetValidation: () => void };
      const result = await form.validate();
      this.isFormValid = result.valid;
      if (result.valid) {
        form.resetValidation();
      }
      this.$emit('validity-change', result.valid);
    });
  }

  handleSaplingScannedEvent(value: string) {
    const s = this.saplingGenesString;
    if (s.indexOf(value) === -1) {
      const prefix = s.length !== 0 && !s.charAt(s.length - 1).match(/\r?\n/) ? s + '\n' : s;
      this.saplingGenes = prefix + value;
      this.animateAndScrollToLastSapling();
      this.playSaplingsScannedSound();
      this.checkFormValidity();
    }
  }

  handlePreviousGenesSelectedEvent(set: StoredSet) {
    this.tab = '0';
    this.saplingGenes = set.genes;
    this.genesInputKey += 1;
    eventBus.$emit(GLOBAL_EVENT_SELECTED_PLANT_TYPE_CHANGED, set.selectedPlantTypeName);
    this.$nextTick(() => {
      this.checkFormValidity();
      this.$nextTick(() => {
        this.checkFormValidity();
        this.attachNumberingScrollSync();
        this.$nextTick(() => this.focusTextArea());
      });
    });
  }

  focusTextArea() {
    this.onNextTickRerender(() => {
      const textArea = this.getTextareaElement();
      if (textArea) {
        textArea.focus();
        textArea.setSelectionRange(textArea.value.length, textArea.value.length);
      }
    });
  }

  storeCurrentSet() {
    const previousGenesComponent = this.$refs.previousGenes as PreviousGenes;
    if (previousGenesComponent) {
      const wasAdded = previousGenesComponent.addNewSet(this.saplingGenesString);
      if (wasAdded) {
        this.animatePreviousGenesTab();
      }
    }
  }

  animatePreviousGenesTab() {
    this.animatePreviousGenesTabIn = true;
    setTimeout(() => {
      this.animatePreviousGenesTabIn = false;
    }, 700);
  }

  getDeduplicatedSaplingGeneList() {
    const fromState = this.saplingGenesString.trim();
    const textarea = this.getTextareaElement();
    const fromDom = textarea?.value?.trim() ?? '';
    const raw = fromState || fromDom;
    const splitSaplingGenes: string[] = raw === '' ? [] : raw.split(/\r?\n/);
    const deduplicatedSaplingGenes: string[] = splitSaplingGenes.filter(
      (genes, index, self) => index === self.findIndex((otherGenes) => otherGenes === genes)
    );
    return deduplicatedSaplingGenes;
  }

  handleSaplingGenesInputKeyDown(event: KeyboardEvent) {
    const allowedKeys = [
      'H',
      'G',
      'Y',
      'X',
      'W',
      'Enter',
      'Backspace',
      'ArrowRight',
      'ArrowLeft',
      'ArrowUp',
      'ArrowDown',
      'End',
      'Delete',
      'Home',
      'Shift',
      'Alt',
      'Control',
      'Tab'
    ];
    if (
      event.key &&
      event.key !== 'Unidentified' &&
      !(event.altKey || event.ctrlKey) &&
      allowedKeys.indexOf(event.key) === -1 &&
      allowedKeys.indexOf(event.key.toUpperCase()) === -1
    ) {
      this.playWrongKeySound();
    }
  }

  animateAndScrollToLastSapling() {
    (this.$refs.saplingListPreview as SaplingListPreview)?.animateAndScrollToLastSapling();
  }

  playSaplingsScannedSound() {
    if (this.soundsEnabled) {
      playAudio('saplingScannedAudio', 0.5);
    }
  }

  playWrongKeySound() {
    if (this.soundsEnabled) {
      playAudio('wrongKeyAudio', 0.04);
    }
  }
}
</script>

<style scoped lang="scss">
.gene-inputs_form {
  position: relative;
}
.gene-inputs_genes-area {
  position: relative;
}
.gene-inputs_numbering-scroll {
  position: absolute;
  left: 0;
  width: 25px;
  overflow-y: hidden;
  overflow-x: hidden;
  pointer-events: none;
  z-index: 2;
}
.gene-inputs_input {
  z-index: 1;
}
.gene-inputs_tabs-container {
  position: relative;
  .gene-inputs_store-button {
    position: absolute;
    right: 0;
    top: 0;
  }
  .gene-inputs_tab--animate {
    animation: highlight-tab 0.7s ease-in;
  }
}
.gene-inputs .v-window {
  background-color: transparent;
}

@keyframes highlight-tab {
  0%,
  25%,
  100% {
    transform: scale(1);
  }

  15%,
  35%,
  80% {
    transform: scale(1.15);
    color: var(--v-primary-base);
  }
}
</style>

<style lang="scss">
.gene-inputs .v-tabs-bar {
  height: 36px;
  background-color: transparent !important;
}
.gene-inputs .v-input__control {
  border-radius: 0;
}
/* Match old site: row height 28px (1.75rem) and top padding 11px so rows align with numbering/preview */
.gene-inputs .gene-inputs_input .v-field__input,
.gene-inputs .gene-inputs_input textarea {
  line-height: 1.75rem !important;
  min-height: 1.75rem !important;
}
.gene-inputs .gene-inputs_input .v-field {
  --v-field-padding-top: 11px;
}
.gene-inputs .gene-inputs_input .v-field__input {
  padding-top: 11px !important;
  padding-left: 25px !important;
  /* Remove Vuetify’s top (and right) fade mask on textarea */
  -webkit-mask-image: none !important;
  mask-image: none !important;
}
</style>
