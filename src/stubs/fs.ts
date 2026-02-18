/**
 * Browser stub for Node.js "fs" module. Used by dependencies (e.g. Jimp, file-type)
 * that import fs but are only used in code paths that don't touch the filesystem.
 */
const noop = () => {};
const throwFs = () => {
  throw new Error('fs is not available in the browser');
};

export default {
  existsSync: () => false,
  readFileSync: throwFs,
  writeFileSync: throwFs,
  readFile: throwFs,
  writeFile: throwFs,
  createReadStream: throwFs,
  createWriteStream: throwFs,
  mkdirSync: noop,
  statSync: throwFs,
  readdirSync: () => [],
  promises: {
    readFile: throwFs,
    writeFile: throwFs,
    access: throwFs,
    stat: throwFs,
    readdir: () => Promise.resolve([]),
    mkdir: () => Promise.resolve()
  }
};
