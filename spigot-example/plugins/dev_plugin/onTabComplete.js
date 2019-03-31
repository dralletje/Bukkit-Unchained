let { uniq } = require("lodash");

var COLOR_CHAR = "\u00a7";
var color = function(number) {
  return COLOR_CHAR + number;
};

var _getProperties = function(object) {
  try {
    if (Array.isArray(object)) {
      return [...object.keys()].sort();
    }

    let keys = Object.getOwnPropertyNames(object);
    // console.log(`keys:`, keys);
    return keys
      .map(key => {
        if (typeof object[key] === "function") {
          return `${key}()`;
        } else {
          return key;
        }
      })
      .sort();
  } catch (err) {
    console.log(`Is Java Oject? err:`, err);
    console.log(`object:`, object);
    return [];
  }
};

let sideeffect_free = [
  {
    match: /^Polyglot\.import\(("|')([^"']+)("|')\)\.?/,
    map: (_, name) => {
      return Polyglot.import(name);
    }
  },
  {
    match: /^require\(("|')([^"']+)("|')\)\.?/,
    map: (_, name) => {
      return require(name);
    }
  },
];

var onTabComplete = (plugin, player, args) => {
  let global_properties = {
    require: require,
    module: module,
    self: player,
    events: plugin.events
  };
  for (let prop of Object.getOwnPropertyNames(global)) {
    global_properties[prop] = global[prop];
  }

  let code = args[args.length - 1];
  let current_global = global_properties;
  let prefix = "";

  for (let sideffect_free_item of sideeffect_free) {
    let match = code.match(sideffect_free_item.match);
    if (match != null) {
      current_global = sideffect_free_item.map(...match.slice(1));
      code = `${code.slice(0, match.index)}${code.slice(
        match.index + match[0].length
      )}`;
      prefix = match[0];
    }
  }

  // let code = [...args].join(' ');
  if (code === "") {
    return Object.getOwnPropertyNames(current_global).map(x => `${prefix}${x}`);
  }

  let code_match = code.match(
    /([a-zA-Z0-9_$]+)(\[\d+\]|\.get[a-zA-Z0-9_$]+\(\)|\.[a-zA-Z0-9_$]*)*$/
  );

  if (code_match == null) {
    console.log(`Code not matching a simple getter: '${code}'`);
    return [];
  }

  let last_expression = code_match[0];
  last_expression = last_expression.replace(/\[(\d+)\]/g, ".$1");
  let parts = last_expression.split(".");

  // parts = parts.map(x => {
  //   console.log(`x:`, x)
  //   let bracket_notation_match = x.match(/^\[(\d+)\]$/);
  //   if (bracket_notation_match != null) {
  //     console.log(`bracket_notation_match:`, bracket_notation_match)
  //     return bracket_notation_match[1]
  //   } else {
  //     return x;
  //   }
  // });

  let exact_matches = parts.slice(0, -1);
  let loosly_match = parts[parts.length - 1];

  for (let exact_match of exact_matches) {
    if (current_global == null) {
      return [];
    }

    if (exact_match.match(/\(\)$/)) {
      current_global = current_global[exact_match.replace(/[)(]/g, "")]();
    } else {
      current_global = current_global[exact_match];
    }
  }

  if (current_global == null) {
    return ['> null']
  }

  // let current_result = current_global;
  let loosy_as_property = loosly_match.replace(/[)(]/g, "");
  if (current_global[loosy_as_property] != null) {
    let current_result = current_global[loosy_as_property];
    if (loosly_match.match(/\(\)$/)) {
      if (typeof current_result !== "function") {
        return [`ERROR: .${loosy_as_property} is not a function`];
      }

      try {
        current_result = current_result();
      } catch (err) {
        player.sendMessage(
          `${color("c")}Failed to call ${color(
            4
          )}'${loosy_as_property}()'${color("c")}, got error:`
        );
        player.sendMessage(`${color(4)}${err.message}`);
        return [`ERROR: See chat`];
      }
    }

    if (typeof current_result === "function") {
      if (current_result.name) {
        current_result = `[Function ${current_result.name}]`;
      } else {
        current_result = `[Function anonymous]`;
      }
    }

    return [`> ${current_result}`];
  }

  let properties = _getProperties(current_global);
  let matching_properties =
    loosly_match === ""
      ? properties
      : properties.filter(x =>
          x.toLowerCase().startsWith(loosly_match.toLowerCase())
        );

  let unchanged_part = `${code.slice(0, code_match.index)}${exact_matches.join(
    "."
  )}${exact_matches.length === 0 ? "" : "."}`;
  return matching_properties.map(prop => {
    return `${prefix}${unchanged_part}${prop}`;
  });
};

module.exports = onTabComplete;
