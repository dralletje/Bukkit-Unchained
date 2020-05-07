// require('source-map-support').install();

{
  // TODO Make this not depend on plugin
  // https://stackoverflow.com/a/1026905/2681964
  let plugin = Polyglot.import('plugin');
  let class_loader = plugin.getClass().getClassLoader();
  let findClass_method = class_loader.getClass().getDeclaredMethod("findClass", Java.type('java.lang.String'));
  findClass_method.setAccessible(true);
  global.Java_type = function Java_type(name) {
    try {
      return findClass_method.invoke(class_loader, name);
    } catch (e) {
      if (e instanceof Java.type('java.lang.ClassNotFoundException')) {
        throw e.getTargetException();
      }
      else if (e instanceof Java.type('java.lang.reflect.InvocationTargetException')) {
        throw e.getTargetException();
      }
      else {
        throw new Error(`Error with the invocation stuff for Java_type: '${e.message}'`);
      }
    }
  };

  let Array_from = Array.from;
  global.Array.from = (array, ...props) => {
    if (Java.isJavaObject(array)) {
      array = array.toArray ? array.toArray() : array;
      return Java.from(array);
    } else {
      return Array_from(array, ...props);
    }
  }

  global.Buffer = require('buffer').Buffer;
  global.navigator = {};
  global.window = { navigator: global.navigator };
  global.process = require('./builtins/process.js');
  global.console = require("./builtins/console.js");
  Object.assign(global, require("./builtins/timers.js"));
  Object.assign(global, require("./builtins/base64.js"));

  let path = require("path");
  let { Module } = require("./builtins/require.js");
  module.exports = (file_path) => {
    let sub_module = new Module(path.resolve(file_path));
    let file = path.basename(file_path);

    global.require = sub_module.require;
    let result = sub_module.require('./' + file);
    return result.default || result;
  };
}
