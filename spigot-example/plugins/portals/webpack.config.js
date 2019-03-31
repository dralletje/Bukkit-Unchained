const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'development',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'portals',
    libraryTarget: 'umd',
  },
  externals: {
    bukkit: 'bukkit',
    fs: 'fs',
    child_process: 'child_process',
  }
};
