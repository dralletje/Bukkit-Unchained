const path = require('path');

module.exports = {
  entry: './entry.js',
  mode: 'development',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'Unchained',
    libraryTarget: 'umd',
  },
};
