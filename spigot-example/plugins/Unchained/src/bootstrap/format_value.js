let { sortBy, first, last } = require('lodash');

let flatten = array => {
  let flattened = [];
  for (let sub_array of array) {
    for (let value of sub_array) {
      flattened.push(value);
    }
  }
  return flattened;
};

let format_value_single_line = (object, path = []) => {

}

let StringWriter = Java.type('java.io.StringWriter');
let PrintWriter = Java.type('java.io.PrintWriter');

let format_error = (error, path = []) => {
  if (error.stack == null && error.getStack != null) {
    console.log(`error:`, Object.keys(error));
    print(error);
    error = { stack: error.getStack(), message: error.getMessage() };
  }

  let INVOKE_MISMATCH = /INVOKE on JavaObject\[([^\]]+)] failed due to: (.*)/;
  let invoke_mismatch = error.message.match(INVOKE_MISMATCH);

  if (invoke_mismatch != null) {
    let [_1, JavaObject_info, sub_error] = invoke_mismatch;
    console.log(`sub_error:`, sub_error);

    let overload_mismatch = sub_error.match(/\((.*)\)/);
    if (overload_mismatch != null) {
      let [_2, overload_stuff] = overload_mismatch ;

      overload_stuff = overload_stuff.replace(/, */g, ',\n').replace(/([a-zA-Z]+): \[/g, '"$1": [').replace(/(\[|\()/g, '$1\n').replace(/(\]|\))/g, '\n$1');

      let current_indent = '';
      let new_lines = [];
      for (let line of overload_stuff.split('\n')) {
        if ([']', ')', '}'].some(x => line.startsWith(x))) {
          current_indent = current_indent.slice(2);
        }

        new_lines.push(`${current_indent}${line}`);

        if (['[', '(', '{'].some(x => line.endsWith(x))) {
          current_indent = current_indent + '  ';
        }
      }

      error.stack = new_lines.join('\n') + '\n' + error.stack;;
    } else {

    }
  }

  return error.stack.split('\n').map(x => `${color.red}${x}`);
}

let format_value = (value, path = []) => {
  if (value instanceof Error) {
    return format_error(value, path);
  }

  if (value instanceof Java.type('java.lang.Exception')) {
    let sw = new StringWriter();
    let pw = new PrintWriter(sw);
    value.printStackTrace(pw);
    let lines = sw.toString().split('\n');

    return lines.filter(line => !line.includes('org.graalvm.compiler') && !line.includes('com.oracle.truffle'));
  }

  if (path.includes(value)) {
    return ["[Circular Reference]"];
  }

  if (value === null) {
    return [`null`];
  }
  if (value === undefined) {
    return [`undefined`];
  }

  if (Array.isArray(value)) {
    try {
      if (value.length === 0) {
        return '[]';
      } else {
        return [
          `[`,
          ...flatten(
            value.slice(0, 30).map(inner_value => {
              return `  ${format_value(inner_value, [
                ...path,
                value
              ]).join("\n  ")},`.split("\n");
            })
          ),
          value.length > 30
          ? `  ${value.length - 30} more items...`
          : '',
          `]`
        ];
      }
    } catch (err) {
      return [`[Array ${value.toString()}]`]
    }
  }

  if (typeof value === "object") {
    try {
      let entries = Object.entries(value);
      if (entries.length === 0) {
        return [`{}`];
      } else {
        if (path.length > 5) {
          return [`${color.gray}{ ${color.white}... ${color.gray}}`];
        }
        let all_expanded = [
          `${color.gray}{`,
          ...flatten(
            entries.slice(0, 30).map(([key, inner_value]) => {
              return `  ${color.gold}${key}: ${color.red}${format_value(inner_value, [
                ...path,
                value
              ]).join("\n  ")},`.split("\n");
            })
          ),
          entries.length > 30
          ? `  ${entries.length - 30} more items...`
          : '',
          `${color.gray}}`
        ];

        if (all_expanded.length <= entries.length + 2 && all_expanded.every(x => x.length < 20)) {
          return [`${all_expanded.join(' ').replace(/ +/g, ' ').replace(/, *(..)?}/g, ' $1}')}`];
        } else {
          return all_expanded;
        }
      }
    } catch (err) {
      // An error is thrown when trying to apply `Object.entries()` to a java object.
      let keys = Object.getOwnPropertyNames(value);
      let classs = value.getClass ? value.getClass() : 'No class';

      let crop_value = (message) => {
        let as_string = `${message}`;
        let without_linebreaks = as_string.replace(/\n/g, '\\n');

        if (without_linebreaks.length < 80) {
          return without_linebreaks;
        } else {
          return `${without_linebreaks.slice(0, 20)} ... ${without_linebreaks.slice(-20)}`;
        }
      }

      let methods = value.getClass ? Java.from(value.getClass().getDeclaredMethods()) : [];
      return [
        `${color.gray}{ [Java:${color.gold}${classs.getName ? classs.getName() : 'NO_NAME'}${color.gray}]`,
        ...keys.map(key => {
          if (typeof value[key] === 'function') {

            let arity = null;
            let matching_methods = methods.filter(method => method.getName() === key);
            if (matching_methods.length !== 0) {
              let by_param_count = sortBy(matching_methods, x => x.getParameterCount());
              if (first(by_param_count).getParameterCount() === last(by_param_count).getParameterCount()) {
                let count = first(by_param_count).getParameterCount();
                arity = count === 0 ? '' : String(count);
              } else {
                // prettier-ignore
                arity = `${first(by_param_count).getParameterCount()}-${last(by_param_count).getParameterCount()}`
              }
            }

            let possible_value = '';
            if ((key.match(/^get[A-Z]/) || key.match(/^is[A-Z]/)) && arity === '') {
              try {
                possible_value = ` ${color.dark_gray}// ${crop_value(value[key]())}`;
              } catch (err) {
                let message = err.getMessage ? err.getMessage() : err.message;
                // let arity_match = message.match(/Arity error - expected: (\d+) actual: 0/);
                // if (arity_match) {
                //
                // }
                possible_value = ` ${color.dark_gray}// ${color.dark_red}Err: ${crop_value(message)}`;
              }
            }
            return `  ${color.yellow}${key}${color.gray}(${arity || ''}),${possible_value}`;
          } else {
            return `  ${color.yellow}${key}: ${color.blue}${value[key]}`
          }
        }),
        `${color.gray}}`
      ];
    }
  } else if (typeof value === "function") {
    let as_string = `${value}`;
    if (as_string.split("\n").length <= 3) {
      return as_string.split("\n").map(x => `${color.dark_gray}${x}`);
    } else {
      let first_bracket = as_string.indexOf("{");
      let arguments_prefix = as_string
        .slice(0, first_bracket)
        .replace(/\n/g, "");
      return [`${arguments_prefix} { ... }`];
    }
  } else if (typeof value === "string") {
    return [`"${value}"`];
  } else {
    return [value];
  }
};

let COLOR_CHAR = '\u00a7';
let color = function(number) {
  return COLOR_CHAR + number;
}

let color_map = {
  black: '0',
  dark_blue: '1',
  green: '2',
  dark_aqua: '3',
  dark_red: '4',
  dark_purple: '5',
  gold: '6',
  gray: '7',
  dark_gray: '8',
  blue: '9',
  green: 'a',
  aqua: 'b',
  red: 'c',
  light_purple: 'd',
  yellow: 'e',
  white: 'f',

  reset: 'r',
  obfuscate: 'k',
  bold: 'l',
  strike: 'm',
  underline: 'n',
  italic: 'o',
}

var colorize = function(message) {
  return message.replace(/&/g, COLOR_CHAR);
};

for (let [name, color_code] of Object.entries(color_map)) {
  color[color_code] = color(color_code);
  color[name] = color(color_code);
}

module.exports = { format_value, color, COLOR_CHAR, colorize };
