{
  global.plugin = Polyglot.import('plugin');
  global.Java_type = (name) => {
    let class_loader = global.plugin.getClass().getClassLoader();

    let m = class_loader.getClass().getDeclaredMethod("findClass", Java.type('java.lang.String'));
    m.setAccessible(true);

    try {
      let result = m.invoke(class_loader, name);
      return result;
    } catch (e) {
      if (e instanceof Java.type('java.lang.reflect.InvocationTargetException')) {
        throw e.getTargetException();
      } else {
        throw new Error(`Error with the invocation stuff for Java_type: '${e.message}'`);
      }
    }
  };
  global.server = global.plugin.getServer();
  global.process = {
    browser: true,
    version: 'v10.8.0',
    platform: "darwin",
    env: {
      true: false,
    },
    cwd: () => {
      return Polyglot.import("cwd");
    },
    nextTick: (callback) => {
      callback();
    },
    binding: (name) => {
      return Polyglot.import(name);
    },
  };

  require("./bootstrap/timers.js")(global);

  let original_console_log = console.log;
  let create_pretty_log = require("./bootstrap/console_log.js");
  let new_console_log = create_pretty_log(console.log)
  console.log = (...args) => {
    try {
      return new_console_log(...args);
    } catch (err) {
      console.log(`Error in console.log: ${err.stack}`);
      return original_console_log(...args);
    }
  };

  console.log(`Runtime:`, global.Runtime)
  global.Runtime = global.Runtime || {};
  Runtime.getHeapUsage = () => {
    console.log('get heap usage');
  }

  global.bukkit = require('./bukkit.js');
  global.fs = require('./fs.js');

  // let path = require("path");
  // let { Module } = require("./require.js");

  // let FILE_LOCATION = path.join(process.cwd(), "./plugins/Unchained/src/entry.js");
  // let sub_module = new Module(FILE_LOCATION);

  global.window = {};
  // global.fs = basic_require('./fs.js');

  // let _ = module.require("lodash");
  // module.exports = sub_module.require;
  module.exports = require('./PluginBridge.js');
}
