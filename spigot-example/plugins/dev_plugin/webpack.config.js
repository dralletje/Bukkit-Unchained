let path = require("path");
let baseconfig = require('../Unchained/plugin-webpack.config.js');

module.exports = {
  entry: {
    Valhalla: "./src/Valhalla.js",
    Sandbox: './src/Sandbox/Sandbox.js',
  },
  mode: "development",
  // devtool: 'eval-source-map',
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "commonjs2"
  },
  // module: {
  //   rules: [
  //     {
  //       test: /\.m?js$/,
  //       exclude: /(node_modules|bower_components)/,
  //       use: {
  //         loader: "babel-loader",
  //         options: {
  //           plugins: [
  //             "@babel/plugin-syntax-dynamic-import",
  //             "@babel/plugin-syntax-import-meta",
  //             ["@babel/plugin-proposal-class-properties", { loose: true }],
  //             "@babel/plugin-proposal-json-strings"
  //           ]
  //         }
  //       }
  //     }
  //   ]
  // },
  ...baseconfig,
};
