import 'reflect-metadata';
// Polyfill for Jimp and other deps that use process.nextTick in the browser
const g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {});
const proc = (g as { process?: { nextTick?: (fn: () => void) => void } }).process;
if (proc && typeof proc.nextTick !== 'function') {
  proc.nextTick = (fn: () => void) => queueMicrotask(fn);
}
import './styles/global.scss';
import { createApp } from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import { installConfirm } from './plugins/confirm';
const app = createApp(App);
app.use(vuetify);
app.provide('vuetify', vuetify);
app.provide('setThemeDark', (dark: boolean) => {
  const themeName = dark ? 'dark' : 'light';
  const v = vuetify as { theme?: { change?: (n: string) => void; global?: { name: { value?: string } } } };
  if (typeof v.theme?.change === 'function') {
    v.theme.change(themeName);
  } else {
    const g = v.theme?.global?.name;
    if (g && typeof g.value !== 'undefined') {
      g.value = themeName;
    }
  }
});
installConfirm(app);

// Global mixin for onNextTickRerender (was Vue 2 mixin)
app.mixin({
  methods: {
    onNextTickRerender(callback: () => void) {
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(callback);
        });
      });
    }
  }
});

app.mount('#app');
