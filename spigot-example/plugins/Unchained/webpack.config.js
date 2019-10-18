const path = require('path');

module.exports = {
  entry: {
    entry: './src/entry.js',
    UnchainedMain: './src/UnchainedMain.js',
  },
  mode: 'development',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname) + '/dist',
    libraryTarget: "commonjs2",
  },
  externals: {
    bukkit: "commonjs bukkit",
    fs: "commonjs fs",
    child_process: "commonjs child_process",
    worker_threads: "commonjs worker_threads",
  },
  // target: 'node',
  node: {
    process: false,
    module: false,
    setImmediate: false,
  },
};
