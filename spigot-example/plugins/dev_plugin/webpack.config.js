const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'development',
  output: {
    filename: 'dev_plugin.js',
    path: path.resolve(__dirname),
    library: 'dev_plugin',
    libraryTarget: 'umd',
  },
  externals: {
    bukkit: 'bukkit',
    fs: 'fs',
    child_process: 'child_process',
    module: 'module',
    'aws-sdk': './stub.js',
  },
  node: {
    process: false,
  }
};
