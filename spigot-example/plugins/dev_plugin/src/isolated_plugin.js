import { create_isolated_events } from './isolated/events.js';
import { create_isolated_timers } from './isolated/timers.js';
import { create_isolated_buildconfig } from './isolated/buildconfig.js';

import { make_adapters } from './isolated/primitives.js';

let { ChatColor } = require("bukkit");

let server = Polyglot.import("server");

let BukkitCommand = Java.type("org.bukkit.command.defaults.BukkitCommand");
let register_command = ({
  plugin,
  name,
  description,
  usageMessage,
  aliasses = [],
  onTabComplete,
  onCommand
}) => {
  let MyCommand = Java.extend(BukkitCommand, {
    execute: (sender, alias, args) => {
      let result = onCommand(sender, alias, args);
      return result == null || result;
    },
    tabComplete: (sender, alias, args) => {
      return onTabComplete ? onTabComplete(sender, alias, args) : [];
    }
  });

  let command = new MyCommand(name, description, usageMessage, aliasses);

  let plugin_name = plugin.java.getDescription().getName();
  server.getCommandMap().register(plugin_name, command);

  return {
    dispose: () => {
      command.setLabel("TRASHTHIS");
      command.unregister(server.getCommandMap());
    }
  };
};

export let create_isolated_plugin = ({
  plugin,
  active_session,
  filters,
  plot_id,
  events
}) => {
  let adapt = make_adapters(filters);

  let isolated_events = create_isolated_events({
    plugin,
    active_session,
    adapt
  });

  let isolated_buildconfig = create_isolated_buildconfig({ plugin, plot_id, adapt })

  let server = plugin.java.getServer();

  let disposable_on = (name, listener) => {
    events.on(name, listener);
    active_session.add_active_process({
      dispose: () => {
        events.off(name, listener);
      },
    })
  }

  disposable_on("set-build-config", event => {
    if (event.plot_id !== plot_id) return;
    let { key, player } = event;
    try {
      let value = isolated_buildconfig.set_from_player(key, player);
      // prettier-ignore
      player.sendMessage(`${ChatColor.GREEN}Set '${key}' to value`);
      // prettier-ignore
      player.sendMessage(`${ChatColor.DARK_GREEN}${JSON.stringify(value)}`);
    } catch (error) {
      // prettier-ignore
      player.sendMessage(`${ChatColor.RED}Couldn't set '${key}', because:`);
      // prettier-ignore
      console.log(`error:`, error)
      player.sendMessage(`${ChatColor.DARK_RED}${error.message}`);
    }
  });
  disposable_on("get-build-keys", event => {
    if (event.plot_id !== plot_id) return;
    event.set_result(isolated_buildconfig.get_build_keys());
  });
  disposable_on('player-join', event => {
    if (event.plot_id !== plot_id) return;
    let incomplete_fields = isolated_buildconfig.get_build_keys().filter(x => !x.complete);
    if (incomplete_fields.length !== 0) {
      event.player.sendMessage(`${ChatColor.RED}Some required fields are not set:`)
      for (let field of incomplete_fields) {
        event.player.sendMessage(`${ChatColor.DARK_RED}- ${ChatColor.RED}${field.name} (${field.type})`);
      }
      event.set_can_join(false);
    } else {
      event.set_can_join(true);
    }
  })

  disposable_on('player-leave', event => {
    if (event.plot_id !== plot_id) return;

  })

  let java_world = server.getWorlds()[0];
  let main_world = adapt.from_java(java_world);

  return {
    buildconfig: isolated_buildconfig,
    world: main_world,
    getPlayers: () => {
      return main_world.getPlayers();
    },
    createNamespacedKey: (name) => {
      let NamespacedKey = Java.type('org.bukkit.NamespacedKey');
      return new NamespacedKey(plugin.java, `${plot_id}.${name}`)
    },
    addCommand: ({
      name,
      description,
      usageMessage,
      aliasses = [],
      onCommand,
      onTabComplete
    }) => {
      let disposable = register_command({
        plugin,
        name,
        description,
        usageMessage,
        aliasses,
        onCommand,
        onTabComplete
      });
      active_session.add_active_process(disposable);
    },
    classes: adapt.classes,
    adapt: adapt.from_java,
    events: isolated_events,
    timers: create_isolated_timers({ plugin, active_session })
  };
};