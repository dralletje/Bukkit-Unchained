import { EventEmitter } from "events";
import { parentPort, workerData } from "worker_threads";
import { VM } from "vm2";

import { JavaPlugin } from "bukkit/JavaPlugin";
import Packet from "bukkit/Packet";

import { create_isolated_events } from "./isolated/events.js";
import { create_isolated_buildconfig } from "./isolated/buildconfig.js";
import { create_isolated_commands } from "./isolated/commands.js";
import { make_adapters } from "./isolated/primitives.js";

import { create_build_plugin } from "./builder-plugin/builder-plugin.js";

import { start_timer } from '../util/start_time_log.js';

let java_plugin = process.binding('plugin');
let server = java_plugin.getServer();

let ChatColor = Java.type('org.bukkit.ChatColor');
let float = n => Java.type("java.lang.Float").parseFloat(String(n));
let Location = Java.type("org.bukkit.Location");

let on_message_with_type = (type, onMessage) => {
  parentPort.on('message', message => {
    if (message.type === type) {
      onMessage(message);
    }
  })
}

let create_isolated_plugin = () => {
  let { source, ...config } = workerData;

  let plugin = new JavaPlugin(java_plugin);

  let session_id = `${config.plot_x}:${config.plot_z}`;
  // let session_id = "only-one-for-now";

  let timer = start_timer(`${ChatColor.DARK_PURPLE}WORKER:${ChatColor.RESET}`);
  console.log(`${ChatColor.DARK_PURPLE}Starting worker...`);

  timer.log("Load libraries");

  let CHUNK = 16;
  let location_boundaries = {
    x: {
      min: config.plot_x * CHUNK * 5 + CHUNK - 1,
      max: (config.plot_x + 1) * CHUNK * 5
    },
    z: {
      min: config.plot_z * CHUNK * 5 + CHUNK - 1,
      max: (config.plot_z + 1) * CHUNK * 5
    }
  };

  let location_filter = location => {
    let loc_x = location.getX();
    let loc_z = location.getZ();
    return (
      loc_x > location_boundaries.x.min &&
      loc_x < location_boundaries.x.max &&
      loc_z > location_boundaries.z.min &&
      loc_z < location_boundaries.z.max
    );
  };

  // let location_filter = new Function(`location`, `
  //   let loc_x = location.getX();
  //   let loc_z = location.getZ();
  //   return (
  //     loc_x > ${location_boundaries.x.min} &&
  //     loc_x < ${location_boundaries.x.max} &&
  //     loc_z > ${location_boundaries.z.min} &&
  //     loc_z < ${location_boundaries.z.max}
  //   );
  // `)

  let playing_player = new Set();
  let filters = {
    location: location_filter,
    player: player => {
      // console.log(`playing_player:`, playing_player);
      // console.log(`player.getName():`, player.getName())
      return playing_player.has(player.getName());
    }
  };

  let adapt = make_adapters(filters);

  timer.log("Adapters");

  let plugin_commands = create_isolated_commands({
    plugin,
    adapt
  });
  plugin_commands.handleDefault((event, player) => {
    let message = event.getMessage();
    if (message.startsWith("/leave")) {
      return event.setCancelled(false);
    }
  });

  timer.log("Filters");

  let leave_plugin_plot = player => {
    // playing_player.delete(player.getName())

    try {
      player.updateCommands();
    } catch (err) {
      console.error(`updateCommands err:`, err)
    }

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
  on_message_with_type("run_plugin", () => {
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
    });
  });

  let PlayerJoinEvent = Java.type("org.bukkit.event.player.PlayerJoinEvent");
  on_message_with_type("run_plugin", () => {
    plugin.events.PlayerQuit(event => {
      if (playing_player.has(event.getPlayer().getName())) {
        leave_plugin_plot(event.getPlayer());
      }
    });
  });

  timer.log("Events");

  let mocked_bukkit_events = new EventEmitter();

  let _isolated_events = create_isolated_events({ plugin, adapt });
  let isolated_events = {
    ..._isolated_events,
    onPlayerJoin: handler => {
      mocked_bukkit_events.on("PlayerJoin", event => {
        handler(event);
      });
    }
  };

  timer.log("Isolated events");

  // TODO Move this into build_plugin ?
  let isolated_buildconfig = create_isolated_buildconfig({
    plugin,
    plot_id: session_id,
    adapt
  });

  timer.log("Isolated buildconfig");

  let building_players = new Set();
  let build_plugin = create_build_plugin({
    plot_config: config,
    plugin,
    buildconfig: isolated_buildconfig,
    filters: {
      location: location_filter,
      player: player => {
        return building_players.has(player.getName());
      }
    }
  });
  on_message_with_type("plot-player-build", ({ player }) => {
    building_players.add(player.getName());
    playing_player.delete(player.getName());

    build_plugin.apply_to(player);
  });

  timer.log("Isolated build plugin");

  on_message_with_type('plot-player-enter', ({ player }) => {
    if (!location_filter(player.getLocation())) return;
    if (playing_player.has(player.getName())) return;

    let incomplete_fields = isolated_buildconfig
      .get_build_keys()
      .filter(x => !x.complete);

    if (incomplete_fields.length !== 0) {
      player.sendMessage(`${ChatColor.RED}Some required fields are not set:`);
      for (let field of incomplete_fields) {
        // prettier-ignore
        player.sendMessage(`${ChatColor.DARK_RED}- ${ChatColor.RED}${field.name} (${field.type})`);
      }
    } else {
      building_players.delete(player.getName());
      playing_player.add(player.getName());

      // prettier-ignore
      let java_event = adapt.from_java(new PlayerJoinEvent(player, "Player joined!"));
      mocked_bukkit_events.emit("PlayerJoin", java_event);
    }
  });
  on_message_with_type("plot-player-leave", ({ player, type }) => {
    playing_player.delete(player.getName());
    building_players.delete(player.getName());
    leave_plugin_plot(player);
    return;
  });

  let java_world = server.getWorlds()[0];
  let main_world = adapt.from_java(java_world);
  let isolated_server = {
    createInventory: () => {},
    createMap: () => {},
    createMerchant: () => {},
    getEntity: () => {},
    getMaxPlayers: () => {},
    getOfflinePlayer: () => {},
    getOfflinePlayers: () => {},
    getOperators: () => {},
    getOnlinePlayers: () => Array.from(playing_player.values()).map(x => (isolated_server.getPlayer(x))).filter(Boolean),
    getPlayer: (...args) => adapt.from_java(server.getPlayer(...args)),
    getPlayerExact: (...args) => adapt.from_java(server.getPlayerExact(...args)),
    getScheduler: () => adapt.from_java(server.getScheduler()),
    getTag: () => {},
    getTags: () => {},
    getVersion: () => {},
    getBukkitVersion: () => {},
    getWorld: () => {},
    getWorlds: () => {},
    matchPlayer: () => {},
    selectEntities: () => {}
  };

  let get_combined_id = (_blockdata) => {
    try {
      let blockdata = adapt.to_java(_blockdata);
      let BLOCK = Java.type("net.minecraft.server.v1_15_R1.Block").class.static;
      let iblockdata = Java_type("com.comphenix.protocol.wrappers.WrappedBlockData")
        .static.createData(blockdata)
        .getHandle();
      let combined_id = BLOCK.getCombinedId(iblockdata);

      // let block_id = blockdata.getMaterial().getId();
      // console.log(`block_id:`, block_id)
      return combined_id;
    } catch (error) {
      console.log(`error:`, error);
      throw error;
    }
  }

  // let dev_plugin_events = new EventEmitter();
  // let is_already_enabled = false;
  let dev_plugin = {
    // Packet: Packet,
    send_packet: (player, packet) => {
      return Packet.send_packet(adapt.to_java(player), packet);
    },

    get_combined_id: get_combined_id,
    buildconfig: isolated_buildconfig,
    world: main_world,
    getServer: () => isolated_server,
    events: isolated_events,
    commands: plugin_commands,
    region: {
      min: main_world.getBlockAt(location_boundaries.x.min + 1, 0, location_boundaries.z.min + 1).getLocation(),
      max: main_world.getBlockAt(location_boundaries.x.max - 1, 255, location_boundaries.z.max - 1).getLocation(),
    },
    // onEnable: () => {
    //
    // },
    __test_error_handling: () => {
      throw new Error("This error should reach outside the sandbox");
    },
    __test_java_clone_performance_single: (cloneable) => {
      let java_cloneable = adapt.to_java(cloneable);
      java_cloneable.clone();
    },
    __test_java_clone_performance_loop: (cloneable) => {
      let java_cloneable = adapt.to_java(cloneable);
      for (let i = 0; i < 100000; i++) {
        // java_cloneable.clone();
        adapt.from_java(java_cloneable.clone());
      }
    },
  };

  timer.log("Isolated plugin");

  let injected_module = { exports: {} };
  let sandbox = {
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    setImmediate,
    clearImmediate,
    plugin: dev_plugin,
    module: injected_module,
    exports: injected_module.exports,
    loadWithNewGlobal: null,
    load: null,
    Java: { type: adapt.get_class },
    Java_type: null,
    // Graal: null,
    // Packages: null,
    // javafx: null,
    // java: null,
    // javax: null,
    // print: null,
    // printErr: null,
    // org: null,
    // com: null,
    // edu: null,
  }

  on_message_with_type('run_plugin', ({ source, id }) => {
    timer.log("Eval start");

    try {
      let vm = new VM({ sandbox });
      // vm.run(source);
      let eval_fn = vm.run(`(source) => eval(source)`);
      eval_fn(source);
      parentPort.postMessage({
        response_to: id,
        type: 'run_plugin_done',
      });
    } catch (error) {
      parentPort.postMessage({
        response_to: id,
        type: 'error',
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    timer.log("Eval done");
  });
};

create_isolated_plugin();
