export type Handler = (...args: unknown[]) => void;

class SimpleEventBus {
  private events: Record<string, Handler[]> = {};

  $on(event: string, handler: Handler) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(handler);
  }

  $off(event: string, handler?: Handler) {
    if (!this.events[event]) return;
    if (handler) {
      this.events[event] = this.events[event].filter((h) => h !== handler);
    } else {
      this.events[event] = [];
    }
  }

  $emit(event: string, ...args: unknown[]) {
    (this.events[event] || []).forEach((handler) => handler(...args));
  }
}

export const eventBus = new SimpleEventBus();
export default eventBus;
export const GLOBAL_EVENT_SELECTED_PLANT_TYPE_CHANGED = 'selected-plant-type-changed';
