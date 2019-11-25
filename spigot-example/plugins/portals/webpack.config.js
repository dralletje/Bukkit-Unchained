let path = require('path');
let baseconfig = require('../Unchained/plugin-webpack.config.js');

module.exports = {
  entry: './src/index.js',
  mode: 'development',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: "commonjs2"
  },
  ...baseconfig,
};
