let util = require('util');

let { sortBy, first, last, fromPairs, flatten } = require('lodash');
let dedent = require('dedent');

let  ChatColor = Java.type("org.bukkit.ChatColor");

let JavaException = Java.type('java.lang.Exception');
let StringWriter = Java.type('java.io.StringWriter');
let PrintWriter = Java.type('java.io.PrintWriter');

let java_explainer = (key, value, methods, path) => {
  if (typeof value === 'function') {
    // Find arity for the method
    let arity = null;
    let matching_methods = methods.filter(method => method.getName() === key);
    if (matching_methods.length !== 0) {
      let by_param_count = sortBy(matching_methods, x => x.getParameterCount());
      if (first(by_param_count).getParameterCount() === last(by_param_count).getParameterCount()) {
        let count = first(by_param_count).getParameterCount();
        arity = String(count);
      } else {
        // prettier-ignore
        arity = `${first(by_param_count).getParameterCount()}-${last(by_param_count).getParameterCount()}`
      }
    }

    let call_result = null;
    if ((key.match(/^get[A-Z]/) || key.match(/^is[A-Z]/)) && arity === '0') {
      try {
        call_result = value();
      } catch (err) {
        let plain_error = make_value_plain(err, path);
        call_result = {
          $type: 'thrown',
          error: plain_error,
        }
      }
    }
    return {
      $type: 'JavaMethod',
      // name: key,
      arity: arity,
      call_result: call_result,
    }
  } else {
    return make_value_plain(value, path);
  }
}

let make_value_plain = (value, path = []) => {
  if (path.includes(value)) {
    return { $type: 'circular' };
  }

  if (value === null) {
    return { $type: 'null' };
  }

  if (value === undefined) {
    return { $type: 'undefined' };
  }

  if (value instanceof Error) {
    let error = value;
    if (error.stack == null && error.getStack != null) {
      console.log(`error:`, Object.keys(error));
      global.print(error);
      error = { stack: error.getStack(), message: error.getMessage() };
    }

    // let INVOKE_MISMATCH = /INVOKE on JavaObject\[([^\]]+)] failed due to: (.*)/;
    // let invoke_mismatch = error.message.match(INVOKE_MISMATCH);
    //
    // if (invoke_mismatch != null) {
    //   let [_1, JavaObject_info, sub_error] = invoke_mismatch;
    //   console.log(`sub_error:`, sub_error);
    //
    //   let overload_mismatch = sub_error.match(/\((.*)\)/);
    //   if (overload_mismatch != null) {
    //     let [_2, overload_stuff] = overload_mismatch ;
    //
    //     overload_stuff = overload_stuff.replace(/, */g, ',\n').replace(/([a-zA-Z]+): \[/g, '"$1": [').replace(/(\[|\()/g, '$1\n').replace(/(\]|\))/g, '\n$1');
    //
    //     let current_indent = '';
    //     let new_lines = [];
    //     for (let line of overload_stuff.split('\n')) {
    //       if ([']', ')', '}'].some(x => line.startsWith(x))) {
    //         current_indent = current_indent.slice(2);
    //       }
    //
    //       new_lines.push(`${current_indent}${line}`);
    //
    //       if (['[', '(', '{'].some(x => line.endsWith(x))) {
    //         current_indent = current_indent + '  ';
    //       }
    //     }
    //
    //     error.stack = new_lines.join('\n') + '\n' + error.stack;;
    //   }
    // }
    return {
      $type: 'Error',
      stack: error.stack,
      message: error.message,
    }
  }

  if (value instanceof JavaException) {
    let sw = new StringWriter();
    let pw = new PrintWriter(sw);
    value.printStackTrace(pw);
    let lines = sw.toString().split('\n');
    // let stack = lines.filter(line => !line.includes('org.graalvm.compiler') && !line.includes('com.oracle.truffle'));
    let stack = lines.join('\n');

    return {
      $type: 'JavaException',
      message: lines[0],
      stack: stack,
    }
  }

  if (Array.isArray(value)) {
    return Array.from(value).map(x => make_value_plain(x, [...path, value]));
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Java.isJavaObject(value)) {
    let keys = Object.getOwnPropertyNames(value);
    let ValueClass = value.getClass ? value.getClass() : null;

    let methods = ValueClass ? Java.from(ValueClass.getDeclaredMethods()) : [];
    return {
      $type: 'JavaObject',
      class_name: ValueClass ? ValueClass.getName() : 'No Name',
      methods: fromPairs(keys.map(key => {
        if (path.some(x => Java.isJavaObject(x))) {
          return [key, String(value[key])];
        } else {
          let java_result = java_explainer(key, value[key], methods, [...path, value]);
          return [key, make_value_plain(java_result, [...path, value])];
        }
      })),
    }
  }

  if (typeof value === "object") {
    let entries = Object.entries(value);
    let result = {};
    for (let [key, inner_value] of entries) {
      result[key] = make_value_plain(inner_value, [...path, value]);
    }
    return result;
  }

  if (typeof value === "function") {
    return {
      $type: 'function',
      source: `${value}`,
    }
  }

  console.log(`value:`, value)
  throw new Error('Unknown value type');
}

// let error_decontructors = [
//   {
//     name: 'Multiple applicable overloads',
//     regex: /Multiple applicable overloads found for method name (.*) \(candidates: \[(Method\[(public|private)( default)? ([^ ]+) ([^(]+)\(([^)]+)\)](, )?)+], arguments: \[(.*)\]\)/,
//     format: ([method_name, ]) => {
//       return dedent`
//
//       `;
//     },
//   }
// ]

let format_error = (error, path = []) => {
  if (error.stack == null && error.getStack != null) {
    console.log(`error:`, Object.keys(error));
    console.log(error);
    error = { stack: error.getStack(), message: error.getMessage() };
  }

  // for (let decontructor of error_decontructors) {
  //   let match = error.message.match(decontructor.regex);
  //   if (match != null) {
  //
  //     error.stack = decontructor.format(match.slice(1)).join('\n') + '\n' + error.stack;
  //
  //     break;
  //   }
  // }

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

      error.stack = new_lines.join('\n') + '\n' + error.stack;
    } else {

    }
  }

  return error.stack.split('\n').map(x => `${ChatColor.RED}${x}`);
}

let format_value_recursive = (value, path = []) => {
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
        return ['[]'];
      } else {
        return [
          `[`,
          ...flatten(
            value.slice(0, 10).map(inner_value => {
              return `  ${format_value_recursive(inner_value, [
                ...path,
                value
              ]).join("\n  ")},`.split("\n");
            })
          ),
          value.length > 10
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
    if (Java.isJavaObject(value)) {
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
        `${ChatColor.GRAY}{ [Java:${ChatColor.GOLD}${classs.getName ? classs.getName() : 'NO_NAME'}${ChatColor.GRAY}]`,
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
                possible_value = ` ${ChatColor.DARK_GRAY}// ${crop_value(value[key]())}`;
              } catch (err) {
                let message = err.getMessage ? err.getMessage() : err.message;
                // let arity_match = message.match(/Arity error - expected: (\d+) actual: 0/);
                // if (arity_match) {
                //
                // }
                possible_value = ` ${ChatColor.DARK_GRAY}// ${ChatColor.DARK_RED}Err: ${crop_value(message)}`;
              }
            }
            return `  ${ChatColor.YELLOW}${key}${ChatColor.GRAY}(${arity || ''}),${possible_value}`;
          } else {
            return `  ${ChatColor.YELLOW}${key}: ${ChatColor.BLUE}${value[key]}`
          }
        }),
        `${ChatColor.GRAY}}`
      ];
    } else {
      let entries = Object.entries(value);
      if (entries.length === 0) {
        return [`{}`];
      } else {
        if (path.length > 5) {
          return [`${ChatColor.GRAY}{ ${ChatColor.WHITE}... ${ChatColor.GRAY}}`];
        }
        let all_expanded = [
          `${ChatColor.GRAY}{`,
          ...flatten(
            entries.slice(0, 30).map(([key, inner_value]) => {
              let formatted = format_value_recursive(inner_value, [
                ...path,
                value
              ]).join("\n  ");
              return `  ${ChatColor.GOLD}${key}: ${ChatColor.RED}${formatted},`.split("\n");
            })
          ),
          entries.length > 30
          ? `  ${entries.length - 30} more items...`
          : '',
          `${ChatColor.GRAY}}`
        ];

        if (all_expanded.length <= entries.length + 2 && all_expanded.every(x => x.length < 20)) {
          return [`${all_expanded.join(' ').replace(/ +/g, ' ').replace(/, *(..)?}/g, ' $1}')}`];
        } else {
          return all_expanded;
        }
      }
    }
  } else if (typeof value === "function") {
    let as_string = `${value}`;
    if (as_string.split("\n").length <= 3) {
      return as_string.split("\n").map(x => `${ChatColor.DARK_GRAY}${x}`);
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

let format_value = (value) => {
  // console.time('Plain value')
  // let plain_value = make_value_plain(value);
  // console.timeEnd('Plain value')

  // console.time('Format value')
  let result = format_value_recursive(value, []);
  // console.timeEnd('Format value')
  return result;
}

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  return format_value(obj).join('\n');
}

module.exports = {
  ...util,
  inspect,
}
