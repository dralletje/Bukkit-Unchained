let { inspect } = require('./util.js');

let create_pretty_console = (key) => {
  let native_log = console[`original_${key}`] || console[key];
  console[`original_${key}`] = native_log;

  let is_now_executing_console_log = false;

  return (...args) => {
    if (is_now_executing_console_log === true) {
      return native_log(...args);
    }
    is_now_executing_console_log = true;

    let current_line_items = [];

    for (let value of args) {
      if (typeof value === "string") {
        current_line_items.push(value);
        continue;
      }

      let formatted_lines = inspect(value).split('\n');

      if (formatted_lines.length === 0) {
        throw new Error(`Value didn't return anything: '${value}'`);
      }

      current_line_items.push(formatted_lines[0]);
      if (formatted_lines.length > 1) {
        native_log(current_line_items.join(" "));

        let bulk = formatted_lines.slice(1, -1);
        for (let log_now of bulk) {
          native_log(log_now);
        }
        let last = formatted_lines[formatted_lines.length - 1];
        current_line_items = [last];
      }
    }

    native_log(current_line_items.join(" "));
    is_now_executing_console_log = false;
  };
}

let timers = {};
let now = performance ? performance.now : Date.now;
module.exports = {
  trace: (message) => {
    console.log(message);
    console.log((new Error()).stack);
  },
  time: (message) => {
    timers[message] = now();
  },
  timeLog: console.timeLog,
  timeEnd: (message) => {
    if (timers[message]) {
      console.log(message, now() - timers[message])
      timers[message] = null;
    }
  },
  log: create_pretty_console('log'),
  error: create_pretty_console('error'),
  warn: create_pretty_console('warn'),
}
