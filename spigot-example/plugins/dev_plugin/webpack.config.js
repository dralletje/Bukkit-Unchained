const path = require("path");

module.exports = {
  entry: "./src/index.js",
  mode: "development",
  output: {
    filename: "dev_plugin.js",
    path: path.resolve(__dirname, "dist"),
    library: "dev_plugin",
    libraryTarget: "umd"
  },
  externals: {
    bukkit: "bukkit",
    fs: "fs",
    child_process: "child_process",
    module: "module",
    "aws-sdk": "./stub.js"
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            plugins: [
              "@babel/plugin-syntax-dynamic-import",
              "@babel/plugin-syntax-import-meta",
              ["@babel/plugin-proposal-class-properties", { loose: true }],
              "@babel/plugin-proposal-json-strings"
            ]
          }
        }
      }
    ]
  },
  node: {
    process: false,
    module: false,
    setImmediate: false,
  }
};
