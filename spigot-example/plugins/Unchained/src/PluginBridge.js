let EventEmitter = require('events');
let path_module = require('path');
let { ChatColor } = require('bukkit');

let plugin_utils = require('./plugin_utils.js');
let { Module } = require('./builtins/require.js');

let methods = {
  // onTabComplete: (...args) => require('./dev_plugin/onTabComplete.js')(...args),
  onEnable: () => {
    console.log('onEnable from javascript!');
    require('./plugin.js').load_all(null)
  },
  onCommand: (sender, command, alias, args) => {
    // if (alias === 'js') {
    //   let file = [...args].join(' ');
    //   let result = require(file);
    //   return true;
    // }

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
  load_plugin_from_javaplugin: (java_plugin) => {
    let description = java_plugin.getDescription();
    let js_plugin = new JavascriptPlugin(java_plugin, false);

    let FILE_LOCATION = path_module.join(process.cwd(), description.getMain());
    let module = new Module(FILE_LOCATION);
    // let directory_path = path_module.dirname(FILE_LOCATION);
    let plugin_factory = module.require('./' + path_module.basename(FILE_LOCATION));
    js_plugin.onEnable(() => {
      plugin_factory(js_plugin);
    });

    return js_plugin.execute_from_bridge;
  },
  // Needs to only take strings, just so I can call this from another JS context
  load_plugin: (source, json_args) => {
    let { entry_path, ...args } = JSON.parse(json_args);
    let module = new Module(entry_path);
    let plugin_factory = module.require('./' + path_module.basename(entry_path));

    let plugin = new JavascriptPlugin(Polyglot.import('plugin'))
    return plugin_factory.worker(plugin, source, args);
  }
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
        console.log('Tab complete', command.getName())
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
      if (event === 'defaultWorldGenerator') {
        return this.world_generator;
      }
      console.log(`event:`, event)
    }

    let make_addEventListener_for_plugin = require('./events.js').make_addEventListener_for_plugin;
    let events = make_addEventListener_for_plugin(java_plugin);
    this.events = events;
  }

  setDefaultChunkGenerator(world_generator) {
    this.world_generator = world_generator;
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

  create_http_server(port, handler_fn) {
    let HttpServer = Java.type('com.sun.net.httpserver.HttpServer');
    let InetSocketAddress = Java.type('java.net.InetSocketAddress');
    let HttpHandler = Java.type('com.sun.net.httpserver.HttpHandler')

    let JavascriptHttpHandler = Java.extend(HttpHandler, {
      handle: (exchange) => {
        handler_fn(exchange);
      },
    });

    let server = HttpServer.create(new InetSocketAddress(port), 0);
    server.createContext("/", new JavascriptHttpHandler());
    server.setExecutor(null); // creates a default executor
    server.start();

    this.on('onDisable', () => {
      server.stop(0);
    });

    return server;
  }
}

module.exports = (method, args) => {
  if (typeof args === 'string') {
    args = [args];
  }
  if (methods[method]) {
    return methods[method](...Array.from(args));
  } else {
    console.log(`Unknown PluginBridge method '${method}'`);
  }
}
