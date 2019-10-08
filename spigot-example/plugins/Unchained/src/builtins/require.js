let path = require('path');
let fs = require('./fs.js');

let require_cache = {};

let basic_require = (module_path) => {
  let builtin_match = module_path.match(/builtin\/(.*)/);
  if (builtin_match != null) {
    return builtin_module_map[builtin_match[1]];
  }

  if (require_cache[module_path]) {
    return require_cache[module_path].exports;
  }
  let module_object = new Module(module_path);
  require_cache[module_path] = module_object;

  let commonJsWrap = (code) => {
    return `(function(exports, module, require, unchained_require, __filename ,__dirname) {\n${code}\n})`;
  }

  let code = fs.readFileSync(module_object.filename).toString();

  if (path.extname(module_object.filename) === '.json') {
    return JSON.parse(code);
  }

  let dirname = path.dirname(module_object.filename);
  let filename = path.basename(module_object.filename);

  let wrapped_code = commonJsWrap(code);
  // let plugin = Polyglot.import('plugin');
  // let export_function = plugin.runScript(module_object.filename, wrapped_code);
  let export_function = load({
    name: module_object.filename,
    script: wrapped_code,
  });

  export_function(module_object.exports, module_object, module_object.require, module_object.require, filename, dirname);

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
  } else {
    let [module_name, module_file] = module_id.split('/', 2);

    // if (module_file != null && module_file !== '') {
    //   console.log(`module_file:`, module_file)
    //   throw new Error(`No sub-module files for now`);
    // }

    // Module not yet found, try the module map
    if (builtin_module_map[module_name]) {
      let new_base_file = __dirname + __filename;
      if (new_base_file !== base_file || builtin_module_map[module_name] !== module_name) {
        // console.log(`builtin_module_map[module_name]:`, builtin_module_map[module_name])
        return `builtin/${module_name}`;
      }
    }

    let current_directory = directory;
    while (current_directory !== '/') {
      let current_module_dir = path.join(current_directory, 'node_modules', module_name);
      if (fs.existsSync(current_module_dir)) {
        let module_location = locate_module(path.join(current_module_dir, module_file || ''));
        return module_location;
      }
      current_directory = path.join(current_directory, '../');
    }

    throw new Error(`Module '${module_name}' not found`);
  }
  throw new Error(`Unknown module format '${module_id}'`);
}

class Module {
  constructor(filename) {
    this.filename = filename;
    this.cache = require_cache;
    this.exports = {};

    this.require = (module_path) => {
      let full_path = require_resolve(this.filename, module_path);
      // console.log(`FROM ${this.filename}`,)
      // console.log(`REQUIRE [${module_path}]:`, full_path);
      return basic_require(full_path)
    }
    this.require.resolve = (module_path) => {
      return require_resolve(this.filename, module_path);
    }
    this.unchained_require = this.require;
  }

}

let builtin_module_map = {
  fs: require('./fs.js'),
  path: require('path'),
  util: require('./util.js'),
  bukkit: require('../bukkit.js'),
  child_process: require('./child_process.js'),
  module: Module,
};

module.exports = {
  Module: Module,
}
