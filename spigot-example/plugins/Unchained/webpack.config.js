const path = require('path');

module.exports = {
  entry: './src/entry.js',
  mode: 'development',
  devtool: 'inline-cheap-source-map',
  output: {
    filename: 'entry.js',
    path: path.resolve(__dirname),
  },
  externals: {
    bukkit: 'bukkit',
    fs: 'fs',
    child_process: 'child_process',
  },
  node: {
    process: false,
  },
};
