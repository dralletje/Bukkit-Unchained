const path = require('path');

module.exports = {
  entry: './src/entry.js',
  mode: 'development',
  output: {
    filename: 'entry.js',
    path: path.resolve(__dirname),
  },
  externals: {
    bukkit: "commonjs bukkit",
    fs: "commonjs fs",
    child_process: "commonjs child_process",
  },
  node: {
    process: false,
    module: false,
    setImmediate: false,
  },
};
