import { EventEmitter } from "events";
import { mapValues } from "lodash";
import { parentPort } from 'worker_threads';

import { JavaPlugin } from 'bukkit/JavaPlugin';

import { create_isolated_events } from "./isolated/events.js";
import { create_isolated_buildconfig } from "./isolated/buildconfig.js";
import { create_isolated_commands } from "./isolated/commands.js";

import { create_build_plugin } from "./build_plugin.js";

import { make_adapters } from "./isolated/primitives.js";
import Packet from './Packet.js';

let { ChatColor } = require("bukkit");
let float = n => Java.type("java.lang.Float").parseFloat(String(n));

let server = Polyglot.import("server");
let Bukkit = require("bukkit");
let Location = Java.type("org.bukkit.Location");

let start_timer = label => {
  let initial_time = Date.now();
  let last_time = Date.now();

  return {
    log: message => {
      let seconds_spent = (Date.now() - last_time) / 1000;
      let color = seconds_spent < 0.8 ? ChatColor.GREEN : ChatColor.RED;
      last_time = Date.now();
      console.log(label, message, `took ${color}${seconds_spent.toFixed(3)}s`);
    },
    end: () => {
      let seconds_spent = (Date.now() - initial_time) / 1000;
      let color = seconds_spent < 1 ? ChatColor.GREEN : ChatColor.RED;
      // prettier-ignore
      console.log(label, `Completed!, spent ${color}${seconds_spent.toFixed(3)}s ${ChatColor.RESET}in total`);
    }
  };
};

export let create_isolated_plugin = ({ plugin: java_plugin, source, ...config }) => {
  let plugin = new JavaPlugin(java_plugin);
  let external_events = new EventEmitter();

  let session_id = `${config.plot_x}:${config.plot_z}`;
  // let session_id = "only-one-for-now";

  let timer = start_timer(`${ChatColor.DARK_PURPLE}WORKER:${ChatColor.RESET}`);
  console.log("Starting worker...");

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
    return (
      location.getX() > location_boundaries.x.min &&
      location.getX() < location_boundaries.x.max &&
      location.getZ() > location_boundaries.z.min &&
      location.getZ() < location_boundaries.z.max
    );
  };

  let playing_player = new Set();
  let filters = {
    location: location_filter,
    player: player => {
      return playing_player.has(player.getName());
    }
  };

  let adapt = make_adapters(filters);

  timer.log("Adapters");

  let plugin_commands = create_isolated_commands({
    plugin,
    adapt,
  });
  plugin_commands.handleDefault((event, player) => {
    let message = event.getMessage();
    if (message.startsWith('/leave')) {
      return event.setCancelled(false);
    }
  });

  timer.log("Filters");

  let leave_plugin_plot = player => {
    // playing_player.delete(player.getName())

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

  let PlayerJoinEvent = Java.type("org.bukkit.event.player.PlayerJoinEvent");

  plugin.events.PlayerQuit(event => {
    if (playing_player.has(event.getPlayer().getName())) {
      leave_plugin_plot(event.getPlayer());
    }
  });

  timer.log("Events");

  let _isolated_events = create_isolated_events({ plugin, adapt });
  let isolated_events = {
    ..._isolated_events,
    onPlayerJoin: handler => {
      console.log('Putting on onPlayerJoin handler')
      external_events.on("PlayerJoin", event => {
        console.log('Passing on playerjoin');
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
      },
    }
  });
  external_events.on("plot-player-build", ({ player }) => {
    building_players.add(player.getName());
    playing_player.delete(player.getName());

    build_plugin.apply_to(player);
  });

  timer.log('Build plugin');

  let do_join = player => {
    if (!location_filter(player.getLocation())) return;
    if (playing_player.has(player.getName())) return;

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
      building_players.delete(player.getName());
      playing_player.add(player.getName());

      let java_event = adapt.from_java(
        new PlayerJoinEvent(player, "Player joined!")
      );
      external_events.emit("PlayerJoin", java_event);
    }
  };

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
    getPlayer: () => {},
    getPlayerExact: () => {},
  	getScheduler: () => {},
    getTag: () => {},
    getTags: () => {},
    getVersion: () => {},
    getBukkitVersion: () => {},
    getWorld: () => {},
    getWorlds: () => {},
    matchPlayer: () => {},
  	selectEntities: () => {},
  }

  let dev_plugin = {
    // Packet: Packet,
    send_packet: (player, packet) => {
      return Packet.send_packet(adapt.to_java(player), packet);
    },
    buildconfig: isolated_buildconfig,
    world: main_world,
    getServer: () => isolated_server,
    getPlayers: () => Array.from(playing_player.values()).map(x => server.getPlayer(x)),
    // createNamespacedKey: name => {
    //   let NamespacedKey = Java.type("org.bukkit.NamespacedKey");
    //   return new NamespacedKey(plugin.java, `${session_id}.${name}`);
    // },
    get_class: adapt.get_class,
    events: isolated_events,
  };

  timer.log("Isolated plugin");

  let new_module = { exports: {} };

  let injects = [
    { name: "plugin", value: dev_plugin },
    { name: "Bukkit", value: Bukkit },
    { name: "module", value: new_module },
    { name: "exports", value: new_module.exports },
  ];

  Polyglot.eval(
    "js",
    `((${injects.map(x => x.name).join(", ")}) => { ${source} })`
  )(...injects.map(x => x.value));

  timer.log("Eval");

  parentPort.on('message', message => {
    try {
      if (message === "close") {
        // active_session.teardown();
        return;
      }

      if (message.type === "plot-player-enter") {
        do_join(message.player);
        return;
      }

      if (message.type === "plot-player-leave") {
        let player = message.player;
        playing_player.delete(player.getName())
        building_players.delete(player.getName());
        leave_plugin_plot(player);

        external_events.emit(message.type, message);
        return;
      }

      if (message.type === "plot-player-build") {
        external_events.emit(message.type, message);
        return;
      }
      console.log(`Catch all message:`, message);
    } catch (error) {
      console.log(`Isolated plugin message error:`, error)
    }
  });
};
