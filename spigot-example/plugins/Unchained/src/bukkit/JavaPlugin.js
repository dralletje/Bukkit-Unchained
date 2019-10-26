// let java_plugin = process.binding('plugin');
//
// let description = java_plugin.getDescription();
// let js_plugin = new JavascriptPlugin(java_plugin, false);
//
// let FILE_LOCATION = path_module.join(process.cwd(), description.getMain());
// let module = new Module(FILE_LOCATION);
// // let directory_path = path_module.dirname(FILE_LOCATION);
// let plugin_factory = module.require('./' + path_module.basename(FILE_LOCATION));
// js_plugin.onEnable(() => {
//   plugin_factory(js_plugin);
// });
//
// return js_plugin.execute_from_bridge;

import { EventEmitter } from "events";

let ChatColor = Java.type("org.bukkit.ChatColor");

export class JavaPlugin extends EventEmitter {
  constructor(java_plugin = process.binding("plugin"), is_dev) {
    super();
    this.java = java_plugin;
    // this.is_dev = is_dev;
    // this.commandMap :: Map<string, { onCommand: Handler?, onTabComplete: Handler? }
    this.commandMap = new Map();

    let make_addEventListener_for_plugin = require("./events.js")
      .make_addEventListener_for_plugin;
    let events = make_addEventListener_for_plugin(java_plugin);
    this.events = events;
  }

  setDefaultChunkGenerator(world_generator) {
    this.world_generator = world_generator;
  }

  onEnable(fn) {
    this.on("onEnable", fn);
  }
  onDisable(fn) {
    this.on("onDisable", fn);
  }

  command(name, handler) {
    handler = typeof handler === "function" ? { onCommand: handler } : handler;

    let alias = name.toLowerCase();
    let command = this.java.getServer().getPluginCommand(alias);

    if (command == null) {
      throw new Error(`Java command '${name}' not found!`);
    }

    this.commandMap.set(alias, handler);
  }

  getBridge() {
    return {
      onCommand: (sender, command, alias, command_args) => {
        if (this.commandMap.has(command.getName())) {
          let handler = this.commandMap.get(command.getName());
          if (handler.onCommand) {
            (async () => {
              try {
                await handler.onCommand(
                  sender,
                  command,
                  alias,
                  Java.from(command_args)
                );
              } catch (err) {
                // prettier-ignore
                console.log(`${ChatColor.DARK_RED}[${this.java.getName()}] Error in onCommand(${alias}):`, err)
                let error_message = err.getMessage ? err.getMessage() : err.message;
                // prettier-ignore
                sender.sendMessage(`${ChatColor.DARK_RED}[${this.java.getName()}] ${ChatColor.RED}${error_message}`);
              }
            })();
          }
          return true;
        }
        return false;
      },
      onTabComplete: (sender, command, alias, command_args) => {
        if (this.commandMap.has(command.getName())) {
          let handler = this.commandMap.get(command.getName());
          if (handler.onTabComplete) {
            return handler.onTabComplete(
              sender,
              command,
              alias,
              Java.from(command_args)
            );
          }
        }
        return [];
      },
      onEnable: () => {
        this.emit("onEnable");
        return;
      },
      onDisable: () => {
        this.emit("onDisable");
        return;
      },
      getDefaultWorldGenerator: () => {
        return this.world_generator;
      }
    };
  }
}
