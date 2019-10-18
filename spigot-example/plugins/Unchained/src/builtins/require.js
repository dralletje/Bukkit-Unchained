let path = require('path');
let fs = require('./fs.js');

let require_cache = {};

let basic_require = (module_path) => {
  if (require_cache[module_path]) {
    return require_cache[module_path].exports;
  }
  let module_object = new Module(module_path);
  require_cache[module_path] = module_object;

  let code = fs.readFileSync(module_object.filename).toString();

  if (path.extname(module_object.filename) === '.json') {
    return JSON.parse(code);
  }

  let dirname = path.dirname(module_object.filename);
  let filename = path.basename(module_object.filename);

  // let commonJsWrap = (code) => {
  //   return `(function(exports, module, require, __filename ,__dirname) {\n${code}\n})`;
  // }
  // let wrapped_code = commonJsWrap(code);
  // // TODO Use eval? Or context.eval?
  // let export_function = global.load({
  //   name: module_object.filename,
  //   script: wrapped_code,
  // });
  //
  // export_function(module_object.exports, module_object, module_object.require, filename, dirname);

  let commonJsWrap = `(function(exports, module, require, __filename ,__dirname) {\nreturn (source) => eval(source)\n})`;

  // TODO Use eval? Or context.eval?
  let sandbox_fn = global.load({
    name: 'test.js',
    script: commonJsWrap,
  });

  let sandboxed_fn = sandbox_fn(module_object.exports, module_object, module_object.require, filename, dirname);
  sandboxed_fn(code)

  return module_object.exports;
}

let resolve_directory = (module_directory) => {
  let packagejson_path = path.join(module_directory, 'package.json');
  if (fs.existsSync(packagejson_path)) {
    let content = JSON.parse(fs.readFileSync(packagejson_path).toString());
    if (content.main) {
      return locate_module(path.join(module_directory, content.main));
    }
  }

  let indexpath = path.join(module_directory, 'index.js');
  if (fs.existsSync(indexpath)) {
    return indexpath;
  }

  throw new Error('Errr');
}

let locate_module = (module_path) => {
  if (fs.existsSync(module_path)) {
    let stat = fs.statSync(module_path);

    if (stat.isDirectory()) {
      return resolve_directory(module_path);
    } else {
      return module_path;
    }
  } else if (fs.existsSync(`${module_path}.js`)) {
    return `${module_path}.js`;
  } else if (fs.existsSync(`${module_path}.json`)) {
    return `${module_path}.json`;
  } else if (fs.existsSync(path.join(module_path, './index.js'))) {
    return path.join(module_path, './index.js');
  }
  throw new Error(`Module '${module_path}' not found`);
}

let require_resolve = (base_file, module_id) => {
  let directory = path.dirname(base_file);
  if (module_id.startsWith('./') || module_id.startsWith('../')) {
    let module_path = path.join(directory, module_id);
    return locate_module(module_path);
  } else if (module_id.startsWith('/')) {
    throw new Error('Sorry babe, no absolute path');
  }

  throw new Error(`Unknown module format '${module_id}'`);
}

class Module {
  constructor(filename) {
    this.filename = filename;
    this.cache = require_cache;
    this.exports = {};

    this.require = (module_path) => {
      // console.log(`FROM ${this.filename}`,)
      // console.log(`REQUIRE [${module_path}]:`, full_path);
      if (builtin_module_map[module_path]) {
        return builtin_module_map[module_path]();
      }

      if (module_path.startsWith('/')) {
        throw new Error("No absolute paths yet");
      }
      if (!module_path.startsWith('.')) {
        throw new Error(`Needs an relative path, couldn't find '${module_path}'`);
      }

      let full_path = require_resolve(this.filename, module_path);
      return basic_require(full_path)
    }
    this.require.resolve = (module_path) => {
      return require_resolve(this.filename, module_path);
    }
    this.unchained_require = this.require;
  }
}

let builtin_module_map = {
  fs: () => require('./fs.js'),
  vm: () => require('./vm.js'),
  vm2: () => require('../vm2/vm2.js'),
  path: () => require('path'),
  util: () => require('./util.js'),
  bukkit: () => require('../bukkit.js'),
  child_process: () => require('./child_process.js'),
  worker_threads: () => require('./worker_threads.js'),
  'bukkit/JavaPlugin': () => require('../bukkit/JavaPlugin.js'),
};

module.exports = {
  Module: Module,
}
