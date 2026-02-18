process.env.VUE_APP_VERSION = process.env.npm_package_version;

module.exports = {
  transpileDependencies: ['vuetify'],
  chainWebpack(config) {
    // Remove fork-ts-checker-webpack-plugin: it uses an API incompatible with
    // TypeScript 4.4+ (resolveTypeReferenceDirective signature change), which
    // causes "Non-string value passed to ts.resolveTypeReferenceDirective".
    // Transpilation still runs; only the separate type-check process is disabled.
    config.plugins.delete('fork-ts-checker');
  }
};
