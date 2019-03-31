let { color, colorize } = require('bukkit');

//var _ = require('lodash');

var VISIBLE_COLORS = ['a', 'b', 'c', 'd', 'e', '2', '3', '4', '5', '6', '9'];
var player_color = function(player) {
  var playercolor = VISIBLE_COLORS[player.getDisplayName().charCodeAt(0) % VISIBLE_COLORS.length];
  return color(playercolor);
}

class Plugin {
  onEnable() {
    console.log('Enabled #2');
  }

  onDisable() {
    console.log('disable #2');
  }
}

// module.exports = {
//   plugin_method: (plugin, method, args) => {
//     if (method === 'onEnable') {
//       console.log(`this.getCommand("command")`, plugin.getCommand("dev"))
//
//       let make_addEventListener_for_plugin = require('bukkit').events.make_addEventListener_for_plugin;
//       let events = make_addEventListener_for_plugin(plugin);
//
//       // events.PlayerJoin((event) => {
//       //   event.setJoinMessage(color(7) + '* ' + player_color(event.getPlayer()) + event.getPlayer().getDisplayName() + color(7) + " joined the server");
//       // });
//       return;
//     }
//     if (method === 'onDisable') {
//       console.log(`ONDISABLE:`, args);
//       return;
//     }
//
//     console.log(`method:`, method)
//   },
//   // Plugin: Plugin,
// };

let JsPlugin = Java_type('eu.dral.unchained.JsPlugin');
console.log(`JsPlugin:`, JsPlugin)

let java_class_map = new WeakMap();
let create_java_extend = (java_class, javascript_object) => {
  let javascript_class = javascript_object.constructor;
  console.log(`javascript_class:`, Object.getOwnPropertyNames(javascript_class.prototype))
  let x = null;
  let java_extend = Java.extend(java_class, {
    onEnable() {
      let y = Java.super();
      let z = Java.super();
      console.log(`y:`, y === z)
      console.log(`x === this:`, x === this)
      x = this;
      console.log('===')
      console.log(`java_extend:`, java_extend);
      console.log(`this:`, this);
      console.log(`Java.super(this):`, Object.getOwnPropertyNames(Java.super(this)));
      console.log('===')
      console.log(`this.constructor:`, this.constructor)
      console.log(`this.prototype:`, this.prototype);
    }
  });
  return java_extend;
}
let J_class = (java_class) => {
  let javascript_class = class AdaptedJavaClass {
    constructor(...args) {
      // TODO make sure there is only one level of inheritance for now
      let java_extended = java_class_map.get(javascript_class) || create_java_extend(java_class, this);
      java_class_map.set(javascript_class, java_extended);
      return new java_extended(...args);
    }
  };
  javascript_class.name = java_class.getName();
  // for (let i in java_class.static) {
  //   console.log(`i:`, i)
  // }

  // console.log(`javascript_class:`, javascript_class)
  return javascript_class;
}
let J = (object) => {
  if (object instanceof Java.type('java.lang.Class')) {
    return J_class(object);
  }

  throw new Error(`J called on something idk '${object}'`)
}

class MyPluginJS extends J(JsPlugin) {
  onEnable() {
    console.log(`this:`, this)
    console.log('Enabled from javascript!!!');
  }

  onDisable() {
    console.log('Disabled from javascript!');
  }

  onCommand(sender, command, alias, args) {
    args = Java.from(args);
    console.log(`args:`, args);
    return false;
  }
}

let MyPlugin = Java.extend(Java_type('eu.dral.unchained.JsPlugin'), {
  onEnable(...args) {
    console.log(`...args:`, ...args)
    console.log(`this:`, this);
    console.log('Enabled from javascript!!!');
  },
  onDisable() {
    console.log('Disabled from javascript!');
  },
  onCommand(sender, command, alias, args) {
    args = Java.from(args);
    console.log(`args:`, args);
    return false;
  }
});

module.exports = MyPlugin

// module.exports = MyPluginJS;
