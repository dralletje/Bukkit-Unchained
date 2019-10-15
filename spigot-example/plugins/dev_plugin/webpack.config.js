const path = require("path");

module.exports = {
  entry: "./src/index.js",
  mode: "development",
  devtool: 'eval-source-map',
  output: {
    filename: "dev_plugin.js",
    path: path.resolve(__dirname, "dist"),
    library: "dev_plugin",
    libraryTarget: "umd"
  },
  externals: {
    bukkit: "commonjs bukkit",
    fs: "commonjs fs",
    child_process: "commonjs child_process",
    "aws-sdk": ".empty"
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
