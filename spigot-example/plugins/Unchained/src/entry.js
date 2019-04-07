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

  let { format_value } = require('./bootstrap/format_value.js');
  require("./bootstrap/timers.js")(global);

  {
    let old_log = console.original_log || console.log;
    console.original_log = old_log;

    let is_now_executing_console_log = false;

    let new_log = (...args) => {
      if (is_now_executing_console_log === true) {
        return old_log(...args);
      }
      is_now_executing_console_log = true;

      let current_line_items = [];

      for (let value of args) {
        if (typeof value === "string") {
          current_line_items.push(value);
          continue;
        }

        let formatted_lines = format_value(value);

        if (formatted_lines.length === 0) {
          throw new Error(`Value didn't return anything: '${value}'`);
        }

        current_line_items.push(formatted_lines[0]);
        if (formatted_lines.length > 1) {
          old_log(current_line_items.join(" "));

          let bulk = formatted_lines.slice(1, -1);
          for (let log_now of bulk) {
            old_log(log_now);
          }
          let last = formatted_lines[formatted_lines.length - 1];
          current_line_items = [last];
        }
      }

      old_log(current_line_items.join(" "));
      is_now_executing_console_log = false;
    };

    console.log = (...args) => {
      try {
        return new_log(...args);
      } catch (err) {
        console.log(`Error in console.log: ${err.stack}`);
        return old_log(...args);
      }
    };
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
