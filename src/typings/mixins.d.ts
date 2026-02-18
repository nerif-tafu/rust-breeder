import type { ComponentCustomProperties } from 'vue';

declare module 'vue' {
  interface ComponentCustomProperties {
    onNextTickRerender: (callback: () => void) => void;
    $confirm: (message: string, options?: { title?: string; buttonTrueText?: string; buttonFalseText?: string }) => Promise<boolean>;
  }
}
