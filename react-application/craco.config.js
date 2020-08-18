const path = require("path");

const addModuleExportsPlugin = require('babel-plugin-add-module-exports');

module.exports = {
  webpack: {
    alias: {
      react: path.resolve('./node_modules/react')
    },
    plugins: [],
    configure: (webpackConfig, { env, paths }) => {

      webpackConfig.plugins = webpackConfig.plugins.concat([addModuleExportsPlugin]);

      return webpackConfig;
    }
  }
};