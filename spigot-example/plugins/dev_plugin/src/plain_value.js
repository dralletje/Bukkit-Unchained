let JavaException = Java.type('java.lang.Exception');
let StringWriter = Java.type('java.io.StringWriter');
let PrintWriter = Java.type('java.io.PrintWriter');

let { sortBy, first, last, fromPairs } = require('lodash');

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

module.exports = make_value_plain;
