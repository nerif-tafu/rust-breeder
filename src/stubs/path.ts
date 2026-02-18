/**
 * Minimal browser stub for Node.js "path" module.
 */
export default {
  join: (...args: string[]) => args.filter(Boolean).join('/'),
  resolve: (...args: string[]) => args.filter(Boolean).join('/') || '/',
  dirname: () => '',
  basename: (p: string) => p.split('/').pop() ?? p,
  extname: (p: string) => {
    const i = p.lastIndexOf('.');
    return i > 0 ? p.slice(i) : '';
  }
};
