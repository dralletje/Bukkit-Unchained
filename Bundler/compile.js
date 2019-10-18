let webpack = require("webpack");
let MemoryFS = require("memory-fs");
let Path = require("path");
let fs = require("fs");

/*
 * Provide webpack with an instance of MemoryFS for
 * in-memory compilation. We're currently overriding
 * #stat and #readFile. Webpack will ask MemoryFS for the
 * entry file, which it will find successfully. However,
 * all dependencies are on the real filesystem, so any require
 * or import statements will fail. When that happens, our wrapper
 * functions will then check fs for the requested file.
 */

let MODULES_DIR = process.cwd() + "/packages";

let create_module_path = path => {
  if (path.startsWith(process.cwd())) {
    return path;
  } else {
    return `${MODULES_DIR}${path}`;
  }
};

let create_memory_fs = files => {
  const memFs = new MemoryFS();
  const statOrig = memFs.stat.bind(memFs);
  const readFileOrig = memFs.readFile.bind(memFs);
  memFs.stat = (path, cb) => {
    statOrig(path, (err, result) => {
      if (err) {
        return fs.stat(create_module_path(path), cb);
      } else {
        return cb(err, result);
      }
    });
  };
  memFs.readFile = (path, cb) => {
    readFileOrig(path, (err, result) => {
      if (err) {
        return fs.readFile(create_module_path(path), cb);
      } else {
        return cb(err, result);
      }
    });
  };
  return memFs;
};

let apply_files_to_memory_fs = (memory_fs, files, path = "/") => {
  for (let [key, value] of Object.entries(files || {})) {
    let sub_path = `${path}/${key}`;
    if (typeof value === "string") {
      memory_fs.writeFileSync(sub_path, value);
    } else {
      memory_fs.mkdirSync(sub_path);
      apply_files_to_memory_fs(memory_fs, value, sub_path);
    }
  }
};

let compile = async ({ files, entry_file }) => {
  let memFs = create_memory_fs();

  const entry = `/plot-dev-plugin/${entry_file}`;

  apply_files_to_memory_fs(memFs, { 'plot-dev-plugin': files } );

  console.log(`entry:`, entry)
  let entry_string = memFs.readFileSync(entry).toString();
  console.log(`entry_string:`, entry_string)

  // TODO Automatically install packages when requested ?

  // Point webpack to memoryfs for the entry file
  const compiler = webpack({
    context: '/',
    entry: entry,
    output: {
      filename: "output.js",
      libraryTarget: 'commonjs2',
    },
    mode: 'development',
    externals: [
      function(context, request, callback) {
        if (/^@unchained\/(.*)$/.test(request)){
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
      {
        bukkit: 'bukkit',
        fs: 'fs',
        child_process: 'child_process',
        module: 'module',
        'aws-sdk': './stub.js',
      }
    ],
    node: {
      process: false,
      module: false,
      setImmediate: false,
    },
    // module: {
    //   rules: [
    //     {
    //       test: /\.m?js$/,
    //       exclude: /(node_modules|bower_components)/,
    //       use: {
    //         loader: require.resolve("babel-loader"),
    //         options: {
    //           plugins: [
    //             require.resolve("@babel/plugin-syntax-dynamic-import"),
    //             require.resolve("@babel/plugin-syntax-import-meta"),
    //             [require.resolve("@babel/plugin-proposal-class-properties"), { loose: true }],
    //             require.resolve("@babel/plugin-proposal-json-strings")
    //           ]
    //         }
    //       }
    //     }
    //   ]
    // },
  });

  compiler.inputFileSystem = memFs;
  compiler.outputFileSystem = memFs;
  compiler.resolvers.normal.fileSystem = memFs;
  compiler.resolvers.context.fileSystem = memFs;

  let stats = await new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        reject(error);
      } else {
        resolve(stats);
      }
    });
  });

  const errors = stats.compilation.errors;
  if (errors && errors.length > 0) {
    console.log(`errors:`, errors)
    // Better error handling?
    throw errors[0];
    // return {
    //   success: false,
    //   errors: errors.map(x => x.message),
    // }
  } else {
    // Retrieve the output of the compilation
    const res = stats.compilation.assets["output.js"].source();
    return res;
  }
};

module.exports = {compile};
