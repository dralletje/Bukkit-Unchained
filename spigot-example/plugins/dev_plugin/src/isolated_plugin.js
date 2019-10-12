import { create_isolated_events } from "./isolated/events.js";
import { create_isolated_timers } from "./isolated/timers.js";
import { create_isolated_buildconfig } from "./isolated/buildconfig.js";

import { make_adapters } from "./isolated/primitives.js";

class Session {
  constructor() {
    this.active_processes = [];
    this.active = true;
  }

  add_active_process(active_process) {
    if (this.active === false) {
      throw new Error("This session has ended!");
    }
    this.active_processes.push(active_process);
  }

  remove_active_process(active_process) {
    this.active_processes = this.active_processes.filter(
      x => x !== active_process
    );
  }

  teardown() {
    this.active = false;
    for (let active_process of this.active_processes) {
      try {
        active_process.dispose();
      } catch (error) {
        // This is important, because this means something is not being disposed
        console.log("IMPORTANT ERROR: Active process not being disposed:");
        console.log(`error:`, error);
      }
    }
  }
}

let { ChatColor } = require("bukkit");
let float = n => Java.type("java.lang.Float").parseFloat(String(n));

let server = Polyglot.import("server");
let Bukkit = require("bukkit");
let Location = Java.type("org.bukkit.Location");

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

let start_timer = (label) => {
  let initial_time = Date.now();
  let last_time = Date.now();

  return {
    log: (message) => {
      let seconds_spent = (Date.now() - last_time) / 1000;
      let color = seconds_spent < 0.8 ? ChatColor.GREEN : ChatColor.RED
      last_time = Date.now();
      console.log(label, message, `took ${color}${(seconds_spent.toFixed(3))}s`);
    },
    end: () => {
      let seconds_spent = (Date.now() - initial_time) / 1000;
      let color = seconds_spent < 1 ? ChatColor.GREEN : ChatColor.RED
      console.log(label, `Completed!, spent ${color}${seconds_spent.toFixed(3)}s ${ChatColor.RESET}in total`);
    }
  }
}

export let create_isolated_plugin = ({ plugin, source, config }) => {
  let session_id = `${config.plot_x}:${config.plot_y}`;
  // let session_id = "only-one-for-now";

  let timer = start_timer(`${ChatColor.DARK_PURPLE}WORKER:${ChatColor.RESET}`);
  console.log("Starting worker...");

  timer.log('Load libraries')

  let active_session = new Session();

  plugin.on("onDisable", () => {
    active_session.teardown();
  });

  let location_boundaries = {
    x: { min: -31, max: 34 },
    z: { min: -170, max: -105 }
  };

  let location_filter = location => {
    return (
      location.getX() > location_boundaries.x.min &&
      location.getX() < location_boundaries.x.max &&
      location.getZ() > location_boundaries.z.min &&
      location.getZ() < location_boundaries.z.max
    );
  };

  let filters = {
    location: location_filter,
    player: player => {
      return players_in_session.includes(player);
    }
  };

  timer.log('Filters');

  let leave_plugin_plot = player => {
    players_in_session = players_in_session.filter(x => x !== player);

    player.sendActionBar(`${ChatColor.BLACK}Left plugin area`);
    player.setGameMode(GameMode.CREATIVE);
    player.setCompassTarget(new Location(server.getWorlds()[0], 0, 0, 0));
    player.setDisplayName(player.getName());
    player.setExhaustion(0);
    player.setExp(0);
    // player.setFlying(false)
    player.setFlySpeed(float(0.2));
    player.setFoodLevel(20);
    player.setHealth(20);
    // player.setHealthScale(1)
    // player.setHealthScaled(false)
    player.setLevel(0);
    player.setPlayerListHeaderFooter("Dev server!", "Cool footer");
    player.setPlayerListName(player.getName());
    // player.setSaturation(0);
    // player.setScoreboard(null)
    player.setTotalExperience(0);
    player.setWalkSpeed(float(0.2));

    player.resetPlayerTime();
    player.resetPlayerWeather();
    player.resetTitle();
    // player.setResourcePack(String url)

    // let bossbars = server.getBossBars();
    // let list = [];
    // bossbars.forEachRemaining((element) => list.push(element));
    // for (let bossbar of list) {
    //   bossbar.removePlayer(player);
    // }
  };

  let GameMode = Java.type("org.bukkit.GameMode");
  active_session.add_active_process(
    plugin.events.PlayerMove(event => {
      if (event.isCancelled()) return;

      let to_is_in = location_filter(event.getTo());
      let from_is_in = location_filter(event.getFrom());
      if (!to_is_in && from_is_in) {
        // Moving into plugin area
        let player = event.getPlayer();
        setImmediate(() => {
          leave_plugin_plot(player);
        });
      }

      if (to_is_in && !from_is_in) {
        // Moving out of plugin area
        let player = event.getPlayer();

        // prettier-ignore
        player.sendMessage(`${ChatColor.GREEN}You are in a plugin area.`)
        // prettier-ignore
        player.sendMessage(`${ChatColor.GREEN}Type ${ChatColor.BLUE}/enter ${ChatColor.GREEN} to join.`);
      }
    })
  );

  let PlayerJoinEvent = Java.type("org.bukkit.event.player.PlayerJoinEvent");
  active_session.add_active_process(
    plugin.events.PlayerJoin(event => {
      console.log("Hey!");
      let player = event.getPlayer();

      if (!location_filter(player.getLocation())) return;
      if (players_in_session.includes(player)) return;

      // event.setCancelled();

      let incomplete_fields = isolated_buildconfig
        .get_build_keys()
        .filter(x => !x.complete);
      if (incomplete_fields.length !== 0) {
        player.sendMessage(`${ChatColor.RED}Some required fields are not set:`);
        for (let field of incomplete_fields) {
          player.sendMessage(
            `${ChatColor.DARK_RED}- ${ChatColor.RED}${field.name} (${field.type})`
          );
        }
      } else {
        setImmediate(() => {
          players_in_session = [...players_in_session, player];
          server
            .getPluginManager()
            .callEvent(new PlayerJoinEvent(player, "Player joined!"));
          // event.set_can_join(true);
          player.sendMessage(`Welcome!`);
        });
      }
    })
  );

  active_session.add_active_process(
    plugin.events.PlayerQuit(event => {
      console.log(`event.getPlayer():`, event.getPlayer());
      if (players_in_session.includes(event.getPlayer())) {
        leave_plugin_plot(event.getPlayer());
      }
    })
  );

  timer.log('Events');

  let adapt = make_adapters(filters);

  timer.log('Adapters');

  let isolated_events = create_isolated_events({
    plugin,
    active_session,
    adapt
  });

  timer.log('Isolated events');

  let isolated_buildconfig = create_isolated_buildconfig({
    plugin,
    plot_id: session_id,
    adapt
  });

  timer.log('Isolated buildconfig');

  // disposable_on("set-build-config", event => {
  //   if (event.plot_id !== plot_id) return;
  //   let { key, player } = event;
  //   try {
  //     let value = isolated_buildconfig.set_from_player(key, player);
  //     // prettier-ignore
  //     player.sendMessage(`${ChatColor.GREEN}Set '${key}' to value`);
  //     // prettier-ignore
  //     player.sendMessage(`${ChatColor.DARK_GREEN}${JSON.stringify(value)}`);
  //   } catch (error) {
  //     // prettier-ignore
  //     player.sendMessage(`${ChatColor.RED}Couldn't set '${key}', because:`);
  //     // prettier-ignore
  //     console.log(`error:`, error)
  //     player.sendMessage(`${ChatColor.DARK_RED}${error.message}`);
  //   }
  // });
  // disposable_on("get-build-keys", event => {
  //   if (event.plot_id !== plot_id) return;
  //   event.set_result(isolated_buildconfig.get_build_keys());
  // });

  let java_world = server.getWorlds()[0];
  let main_world = adapt.from_java(java_world);

  let dev_plugin = {
    buildconfig: isolated_buildconfig,
    world: main_world,
    getPlayers: () => {
      return main_world.getPlayers();
    },
    createNamespacedKey: name => {
      let NamespacedKey = Java.type("org.bukkit.NamespacedKey");
      return new NamespacedKey(plugin.java, `${session_id}.${name}`);
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

  timer.log('Isolated plugin');

  let new_module = { exports: {} };

  let players_in_session = [];

  let injects = [
    { name: "plugin", value: dev_plugin },
    { name: "Bukkit", value: Bukkit },
    { name: "module", value: new_module },
    { name: "exports", value: new_module.exports },
    { name: "setTimeout", value: dev_plugin.timers.setTimeout },
    { name: "clearTimeout", value: dev_plugin.timers.clearTimeout },
    { name: "setInterval", value: dev_plugin.timers.setInterval },
    { name: "clearInterval", value: dev_plugin.timers.clearInterval }
  ];

  Polyglot.eval(
    "js",
    `((${injects.map(x => x.name).join(", ")}) => { ${source} })`
  )(...injects.map(x => x.value));

  timer.log('Eval');

  return () => {
    console.log("Diposing");
    active_session.teardown();
  };
};
