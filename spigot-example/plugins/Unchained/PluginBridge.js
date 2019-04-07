let EventEmitter = require('events');
let plugin_utils = require('./plugin_utils.js');

let { ChatColor } = require('bukkit');

// let JsPlugin = Java_type('eu.dral.unchained.JsPlugin');

let methods = {
  onTabComplete: (...args) => require('./dev_plugin/onTabComplete.js')(...args),
  onEnable: () => {
    console.log('onEnable!');
  },
  onCommand: (sender, command, alias, args) => {
    if (alias === 'js') {
      let file = [...args].join(' ');
      let result = require(file);
      return true;
    }

    if (alias === 'jsplugin') {
      try {
        console.log('Starting plugin reload...');
        let plugin_name = [...args].join(' ') || null;
        require('./plugin.js').load_all(plugin_name)
        .catch(err => {
          console.log(`err:`, err)
        });
        return true;
      } catch (err) {
        console.log(`err:`, err)
      }
    }
  },

  get_plugin_description: (file) => {
    let package_json_path = typeof file === 'string' ? file : file.getPath();
    let description = plugin_utils.get_plugin_description(package_json_path);
    return JSON.stringify(description);
  },
  // get_plugin: (file, loader, description, dataFolder) => {
  //   throw new Error('kbay');
  //
  //   // console.log(`file:`, file)
  //   let package_json_path = typeof file === 'string' ? file : file.getPath() ;
  //   // let description = plugin_utils.get_plugin_description(package_json_path);
  //   // return result.plugin_method;
  //   // let real_description = plugin_utils.get_plugin_description(package_json_path);
  //
  //   let JsPlugin = Java_type('eu.dral.unchained.JsPlugin')
  //   let java_plugin = new JsPlugin(loader, description, dataFolder, null);
  //
  //   // let is_dev = real_description.dev === true;
  //   // let js_plugin = new JavascriptPlugin(java_plugin, is_dev);
  //   // let plugin_factory = require('../../' + description.getMain());
  //   // js_plugin.onEnable(() => {
  //   //   plugin_factory(js_plugin);
  //   // });
  //   //
  //   // java_plugin.setExecutor(js_plugin.execute_from_bridge);
  //   return java_plugin;
  // },
  load_plugin_from_javaplugin: (java_plugin) => {
    let description = java_plugin.getDescription();
    let js_plugin = new JavascriptPlugin(java_plugin, false);

    let plugin_factory = require('../../' + description.getMain());
    js_plugin.onEnable(() => {
      plugin_factory(js_plugin);
    });

    return js_plugin.execute_from_bridge;
  },
}

class JavascriptPlugin extends EventEmitter {
  constructor(java_plugin, is_dev) {
    super();
    this.java = java_plugin;
    // this.is_dev = is_dev;
    // this.commandMap :: Map<string, { onCommand: Handler?, onTabComplete: Handler? }
    this.commandMap = new Map();
    this.execute_from_bridge = (event, ...args) => {
      if (event === 'onCommand') {
        let [sender, command, alias, command_args] = args;
        if (this.commandMap.has(command.getName())) {
          let handler = this.commandMap.get(command.getName())
          if (handler.onCommand) {
            (async () => {
              try {
                await handler.onCommand(sender, command, alias, Java.from(command_args));
              } catch (err) {
                // prettier-ignore
                console.log(`${ChatColor.DARK_RED}[${this.java.getName()}] Error in onCommand(${alias}):`, err)
                // prettier-ignore
                sender.sendMessage(`${ChatColor.DARK_RED}[${this.java.getName()}] ${ChatColor.RED}${err.message}`);
              }
            })();
          }
        }
        return false;
      }

      if (event === 'onTabComplete') {
        let [sender, command, alias, command_args] = args;
        if (this.commandMap.has(command.getName())) {
          let handler = this.commandMap.get(command.getName())
          if (handler.onTabComplete) {
            return handler.onTabComplete(sender, command, alias, Java.from(command_args));
          }
        }
        return [];
      }

      if (event === 'onEnable') {
        this.emit('onEnable');
        return;
      }
      if (event === 'onDisable') {
        this.emit('onDisable');
        return;
      }
      console.log(`event:`, event)
    }

    let make_addEventListener_for_plugin = require('./events.js').make_addEventListener_for_plugin;
    let events = make_addEventListener_for_plugin(java_plugin);
    this.events = events;
  }

  onEnable(fn) {
    this.on('onEnable', fn);
  }
  onDisable(fn) {
    this.on('onDisable', fn);
  }

  command(name, handler) {
    handler = typeof handler === 'function' ? { onCommand: handler } : handler;

    let alias = name.toLowerCase();
    let command = this.java.getServer().getPluginCommand(alias);

    if (command == null) {
      throw new Error(`Java command '${name}' not found!`);
    }

    this.commandMap.set(alias, handler)
  }
}

module.exports = (method, args) => {
  if (methods[method]) {
    return methods[method](...Java.from(args));
  } else {
    console.log(`Unknown PluginBridge method '${method}'`);
  }
}
