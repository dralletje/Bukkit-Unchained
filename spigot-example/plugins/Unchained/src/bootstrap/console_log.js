let { format_value } = require('./format_value.js');

module.exports = () => {
  let old_log = console.original_log || console.log;
  console.original_log = old_log;

  let is_now_executing_console_log = false;

  return (...args) => {
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
}
