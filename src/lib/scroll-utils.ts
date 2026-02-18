/**
 * Simple scroll-into-view helper (replaces Vuetify 2 goTo for our use case).
 */
export function goTo(
  target: string | number | HTMLElement | Element,
  options?: { duration?: number; offset?: number; appOffset?: boolean }
): Promise<void> {
  const el =
    typeof target === 'number'
      ? document.documentElement
      : typeof target === 'string'
        ? document.querySelector(target)
        : target;
  if (!el || !(el instanceof Element)) return Promise.resolve();
  const offset = options?.offset ?? 0;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: options?.duration ? 'smooth' : 'auto' });
  return options?.duration ? new Promise((r) => setTimeout(r, options!.duration)) : Promise.resolve();
}
