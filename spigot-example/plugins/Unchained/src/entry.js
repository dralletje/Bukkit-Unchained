{
  global.plugin = Polyglot.import('plugin');
  global.server = global.plugin.getServer();

  Object.assign(global, require("./builtins/timers.js"));
  global.Buffer = require('buffer').Buffer;
  global.navigator = {};
  global.window = { navigator: global.navigator };
  global.process = require('./builtins/process.js');
  global.console = require("./builtins/console.js");

  let Array_from = Array.from;
  global.Array.from = (array, ...props) => {
    if (Java.isJavaObject(array)) {
      array = array.toArray ? array.toArray() : array;
      return Java.from(array);
    } else {
      return Array_from(array, ...props);
    }
  }
  let class_loader = global.plugin.getClass().getClassLoader();
  let findClass_method = class_loader.getClass().getDeclaredMethod("findClass", Java.type('java.lang.String'));
  findClass_method.setAccessible(true);
  global.Java_type = (name) => {
    try {
      return findClass_method.invoke(class_loader, name);
    } catch (e) {
      if (e instanceof Java.type('java.lang.reflect.InvocationTargetException')) {
        throw e.getTargetException();
      } else {
        throw new Error(`Error with the invocation stuff for Java_type: '${e.message}'`);
      }
    }
  };


  // TODO Make sure this is used
  global.Runtime = global.Runtime || {};
  global.Runtime.getHeapUsage = () => {
    console.log('get heap usage');
  }

  global.bukkit = require('./bukkit.js');

  let path = require("path");
  let { Module } = require("./builtins/require.js");
  let FILE_LOCATION = path.join(process.cwd(), "./plugins/Unchained/src/entry.js");
  let sub_module = new Module(FILE_LOCATION);


  global.require = sub_module.require;
  module.exports = require('./PluginBridge.js');
}
