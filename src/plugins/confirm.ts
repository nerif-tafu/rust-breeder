import type { App } from 'vue';
import { reactive } from 'vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

export interface ConfirmOptions {
  title?: string;
  buttonTrueText?: string;
  buttonFalseText?: string;
}

export interface PendingConfirm {
  message: string;
  title: string;
  buttonTrueText: string;
  buttonFalseText: string;
  resolve: (value: boolean) => void;
}

export const confirmState = reactive<{
  pending: PendingConfirm | null;
}>({
  pending: null,
});

export function installConfirm(app: App) {
  app.component('ConfirmDialog', ConfirmDialog);
  app.config.globalProperties.$confirm = function (
    message: string,
    options: ConfirmOptions = {}
  ): Promise<boolean> {
    return new Promise((resolve) => {
      confirmState.pending = {
        message,
        title: options.title ?? 'Confirm',
        buttonTrueText: options.buttonTrueText ?? 'OK',
        buttonFalseText: options.buttonFalseText ?? 'Cancel',
        resolve,
      };
    });
  };
}
