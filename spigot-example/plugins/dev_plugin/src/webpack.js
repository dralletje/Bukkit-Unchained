require('any-promise/register/bluebird')

let webpack = require('webpack');
let JsonLoader = require('json-loader');
let MemoryFS = require('memory-fs');
let thenify = require('thenify');
let path = require('path');
let fs = require('fs');
let root = require('app-root-path');
/*
* Provide webpack with an instance of MemoryFS for
* in-memory compilation. We're currently overriding
* #stat and #readFile. Webpack will ask MemoryFS for the
* entry file, which it will find successfully. However,
* all dependencies are on the real filesystem, so any require
* or import statements will fail. When that happens, our wrapper
* functions will then check fs for the requested file.
*/
const memFs = new MemoryFS();
const statOrig = memFs.stat.bind(memFs);
const readFileOrig = memFs.readFile.bind(memFs);
memFs.stat = function (_path, cb) {
    statOrig(_path, function(err, result) {
        if (err) {
            return fs.stat(_path, cb);
        } else {
            return cb(err, result);
        }
    });
};
memFs.readFile = function (path, cb) {
    readFileOrig(path, function (err, result) {
        if (err) {
            return fs.readFile(path, cb);
        } else {
            return cb(err, result);
        }
    });
};


export default async function compile(code) {
    // Setup webpack
    //create a directory structure in MemoryFS that matches
    //the real filesystem
    let rootDir = root.toString();
    console.log(`rootDir:`, rootDir)
    rootDir = process.cwd();
    console.log(`rootDir:`, rootDir);

    //write code snippet to memoryfs
    const outputName = `file.js`;
    const entry = path.join(rootDir, outputName);
    const rootExists = memFs.existsSync(rootDir);
    if (!rootExists) {
        memFs.mkdirpSync(rootDir);
    }
    memFs.writeFileSync(entry, code);
    //point webpack to memoryfs for the entry file
    const compiler = webpack({
        entry: entry,
        output: {
            filename: outputName
        },
        // loaders: [
        //   { test: /\.json$/, loader: 'json' }
        // ]
        // module: {
        // }
    });
    // compiler.run = thenify(compiler.run);

    //direct webpack to use memoryfs for file input
    compiler.inputFileSystem = memFs;
    compiler.resolvers.normal.fileSystem = memFs;

    //direct webpack to output to memoryfs rather than to disk
    compiler.outputFileSystem = memFs;

    console.log('Going in')
    compiler.run((error, anything) => {
      console.log(`error:`, error);
      console.log(`anything:`, anything)
    })
    // const stats = await compiler.run();
    // console.log(`stats:`, stats)
    // //remove entry from memory. we're done with it
    // memFs.unlinkSync(entry);
    // const errors = stats.compilation.errors;
    // if (errors && errors.length > 0) {
    //     //if there are errors, throw the first one
    //     throw errors[0];
    // }
    // //retrieve the output of the compilation
    // const res = stats.compilation.assets[outputName].source();
    // return res;
    // console.log(`res:`, res)
}
