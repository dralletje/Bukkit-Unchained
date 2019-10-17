const path = require("path");

module.exports = {
  entry: {
    dev_plugin: "./src/index.js",
    PluginWorker: './src/PluginWorker',
  },
  mode: "development",
  devtool: 'source-map',
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "commonjs2"
  },
  externals: {
    bukkit: "commonjs bukkit",
    fs: "commonjs fs",
    child_process: "commonjs child_process",
    worker_threads: "commonjs worker_threads",
    "bukkit/JavaPlugin": "commonjs bukkit/JavaPlugin",
    "aws-sdk": "empty"
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
