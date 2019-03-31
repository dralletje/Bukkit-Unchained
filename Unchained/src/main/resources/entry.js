// Eventually, this file should be used as base javascript file,
// But for now this is unused and the version in `plugins/Unchained/entry.js` is used :')

{
  let read_text_file = path => {
    let File = Java.type("java.io.File");
    let FileReader = Java.type("java.io.FileReader");
    let BufferedReader = Java.type("java.io.BufferedReader");

    let file = new File(path);
    let buffered = new BufferedReader(new FileReader(file));
    try {
      let text = "";
      while ((line = buffered.readLine()) !== null) {
        text += line + "\n";
      }
      return text;
    } finally {
      buffered.close();
    }
  };

  global.plugin = Polyglot.import('plugin');
  global.server = global.plugin.getServer();
  global.process = {
    platform: "darwin",
    env: {},
    cwd: () => {
      return Polyglot.import("cwd");
    }
  };

  let flatten = array => {
    let flattened = [];
    for (let sub_array of array) {
      for (let value of sub_array) {
        flattened.push(value);
      }
    }
    return flattened;
  };

  let plugin = Polyglot.import("plugin");

  let basic_require = file => {
    if (!file.startsWith("./")) {
      throw new Error(`Only simple './' relative files in basic require`);
    }
    file = file.slice(2); // Cut the './'

    let commonJsWrap = code => {
      return `(function(exports, module, require ,__filename ,__dirname) {\n${code}\n})`;
    };

    let path = `./plugins/Unchained/${file}`;
    let code = read_text_file(path);
    let wrapped_code = commonJsWrap(code);

    // let export_function = plugin.runScript(path, wrapped_code);
    let export_function = load({ script: wrapped_code, name: path });

    // let export_function = Polyglot.eval('js', wrapped);

    let exports = {};
    let module = { exports: exports };
    export_function(exports, module, basic_require, file, "./plugins/Unchained/");
    return module.exports;
  };

  let { format_value } = basic_require('./bootstrap/format_value.js');

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
        console.log(`Error in console.log: ${err.message}`);
        return old_log(...args);
      }
    };
  }

  let path = basic_require("./path.js");
  let { Module } = basic_require("./require.js");

  let FILE_LOCATION = path.join(process.cwd(), "./plugins/Unchained/entry.js");
  let module = new Module(FILE_LOCATION);

  // let _ = module.require("lodash");
  module.require;
}
