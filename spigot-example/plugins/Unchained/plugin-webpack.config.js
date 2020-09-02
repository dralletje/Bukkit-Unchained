module.exports = {
  externals: {
    bukkit: "commonjs bukkit",
    fs: "commonjs fs",
    vm: "commonjs vm",
    vm2: "commonjs vm2",
    child_process: "commonjs child_process",
    worker_threads: "commonjs worker_threads",
    "bukkit/JavaPlugin": "commonjs bukkit/JavaPlugin",
    "bukkit/Packet": "commonjs bukkit/Packet",
    "aws-sdk": "empty",
  },
  node: {
    process: false,
    module: false,
    setImmediate: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
