let { Worker } = require("worker_threads");
let uuid = require("uuid/v4");

let { MongoClient } = require("./mongo.js");
let chat = require("./chat.js");

let ChatColor = Java.type("org.bukkit.ChatColor");
let GameMode = Java.type("org.bukkit.GameMode");
let Location = Java.type('org.bukkit.Location');

let WebSocket = require("./websocket/websocket.js");

// let Packet = require('./Packet.js');

let float = n => Java.type("java.lang.Float").parseFloat(String(n));
let modulo = (x, n) => (x % n < 0 ? n + (x % n) : x % n);

let get_mongo_url = ({ user, password, host, database }) =>
  `mongodb://${user}:${password}@${host}/${database}`;

let do_async = async (name, fn) => {
  try {
    await fn();
  } catch (error) {
    console.error(`Error in '${name}':`);
    console.error(error.stack);
  }
};

let ensure_mongo_for_plugin = ({ mongo_client }) => {
  client.db('database').runCommand({
    createUser: '-1_4',
    pwd: 'password123',
    roles: Java.to(['readWrite']),
  });
}

module.exports = plugin => {
  let mongo_url = get_mongo_url({
    user: "-1_4",
    password: "password123",
    host: "localhost:32768",
    database: "database"
  });
  let mongo_client = new MongoClient(mongo_url);
  let database = mongo_client.db("Unchained");

  let plots = database.collection("plots");

  let active_plots = new Map();
  let refreshing_plots = new Map();

  let refresh_plot = async db_plot => {
    if (typeof db_plot === "string") {
      db_plot = plots.findOne({ plot_id: db_plot });
    }

    console.log(`plot.plot_id:`, db_plot.plot_id);

    let active_plot = active_plots.get(db_plot.plot_id);
    let active_refresh = (refreshing_plots.get(db_plot.plot_id) || 1) + 1;
    refreshing_plots.set(db_plot.plot_id, active_refresh);
    if (active_plot != null) {
      // Wait for the plot to come online first, if it is still booting...
      if (active_plot.active === false) {
        console.log(`${ChatColor.ORANGE}Worker was not yet done initializing`);
        await new Promise((resolve, reject) => {
          worker.once("online", resolve);
          worker.once("error", resolve);
        });
      }

      if (active_refresh !== refreshing_plots.get(db_plot.plot_id)) {
        throw new Error("Worker already starting");
      }

      // ...before I slaughter er
      try {
        active_plot.worker.terminate();
        console.log(`${ChatColor.GREEN}Worker terminated succesfully`);
      } catch (err) {
        console.log(`${ChatColor.RED}Closing err:`, err);
      }
    } else {
      console.log(`${ChatColor.GREEN}First time booting this worker`);
    }

    let main_path = plugin.java.getDescription().getMain();
    let worker = new Worker(
      `${plugin.java.getDataFolder()}/dist/PluginWorker.js`,
      {
        workerData: {
          source: db_plot.script,
          plot_x: db_plot.plot_x,
          plot_z: db_plot.plot_z,
          mongo_url: `${db_plot.plot_x},${db_plot.plot_z}`,
          entry_path: main_path
        }
        // stdout: true,
        // stderr: true
      }
    );

    worker.on("exit", () => {
      console.log("Worker exit:", db_plot.plot_id);
      let active_plot = active_plots.get(db_plot.plot_id);
      if (active_plot.worker === worker && active_plot.online) {
        active_plots.set(db_plot.plot_id, {
          ...active_plot,
          online: false
        });
      } else {
        console.error("Exit on unregistered worker?");
      }
    });

    let error_message = null;
    worker.on("message", message => {
      if (message.type === "error") {
        console.log("Worker message.type = error:", message.stack);
        error_message = message;
      }
    });

    let plot_prefix = `${ChatColor.BLUE}[${db_plot.plot_x},${db_plot.plot_z}]${ChatColor.WHITE}`;

    active_plots.set(db_plot.plot_id, {
      worker: worker,
      plot_x: db_plot.plot_x,
      plot_z: db_plot.plot_z,
      online: false
    });

    await new Promise((resolve, reject) => {
      worker.once("online", resolve);
      worker.once("error", reject);
    });

    console.log(plot_prefix, "online event triggered!");

    worker.setTimeout(10 * 1000);

    await new Promise((resolve, reject) => {
      worker.once("message", message => {
        if (message === 'exit') return;
        if (message.type === "run_plugin_done") {
          resolve();
        } else {
          console.log(`Expected run_plugin_done message:`, message);
          // prettier-ignore
          reject(new Error("Expected run_plugin_done message but got something else"));
        }
      });
      worker.postMessage({
        type: "run_plugin",
        source: db_plot.script,
        id: active_refresh
      });
    });
    worker.setTimeout(1 * 1000);

    console.log(plot_prefix, "Posting message");

    active_plots.set(db_plot.plot_id, {
      worker: worker,
      plot_x: db_plot.plot_x,
      plot_z: db_plot.plot_z,
      online: true
    });

    return worker;
  };

  for (let db_plot of plots.find({}).toArray()) {
    // do_async('Memory leak checker', async () => {
    //   while (true) {
    //     console.time('refreshing plot');
    //     await refresh_plot(db_plot);
    //     console.timeEnd('refreshing plot');
    //   }
    // })
    refresh_plot(db_plot).catch(err => {
      console.error(`Refresh plot '${db_plot.plot_id}' err:`, err);
    });
  }

  let location_to_plot = location => {
    let chunk_x = location.getChunk().getX();
    let chunk_z = location.getChunk().getZ();

    if (modulo(chunk_x, 5) === 0 || modulo(chunk_z, 5) === 0) {
      return null;
    }

    let x = Math.floor(chunk_x / 5);
    let z = Math.floor(chunk_z / 5);

    return {
      x: x,
      z: z,
      id: `${x}:${z}`
    };
  };

  plugin.command("claim", {
    onCommand: player => {
      let player_id = player.getUniqueId().toString();
      let player_plots = plots.find({ owner: player_id }).toArray();
      if (player_plots.length !== 0) {
        player.sendMessage(`${ChatColor.RED}You already have a plot yourself!`);
        return true;
      }

      let { x, z, id: plot_id } = location_to_plot(player.getLocation());
      let claimed_plot = plots.findOne({ plot_id: plot_id });

      if (claimed_plot != null) {
        player.sendMessage(`${ChatColor.RED}Plot is already claimed!`);
        return;
      }

      player.sendMessage(`${ChatColor.DARK_GREEN}Plot claimed!`);
      plots.insert({
        owner: player_id,
        plot_id: plot_id,
        plot_x: x,
        plot_z: z,
        password: uuid()
      });
    }
  });

  let EDITOR_URL = "http://localhost:3000/editor";
  plugin.command("build", {
    onCommand: player => {
      let player_id = player.getUniqueId().toString();
      let plot_location = location_to_plot(player.getLocation());

      if (plot_location == null) {
        player.sendMessage(`${ChatColor.RED}This is not your plot!`);
        return true;
      }

      let { x, z, id: plot_id } = plot_location;
      let plot = plots.findOne({ plot_id });
      if (plot == null || plot.owner !== player_id) {
        player.sendMessage(`${ChatColor.RED}This is not your plot!`);
        return true;
      }

      let editor_url = `${EDITOR_URL}/${plot.password}`;
      let url = chat.show_text(
        "This will open an editor in your browser",
        chat.open_url(editor_url, "https://dral.eu/editor")
      );

      if (active_plots.get(plot_id)) {
        active_plots.get(plot_id).worker.postMessage({
          type: "plot-player-build",
          player: player
        });
        player.sendMessage(`${ChatColor.GREEN}Entered builder mode`);
        player.sendMessage(
          chat`${chat.green("Edit at")} ${chat.dark_purple(url)}`
        );
      } else {
        player.sendMessage(chat.red`${ChatColor.RED}`);
      }
    }
  });

  plugin.command("enter", {
    onCommand: (player, command, alias, args) => {
      let { id: plot_id } = location_to_plot(player.getLocation());
      let active_plot = active_plots.get(plot_id);
      if (active_plot == null) {
        player.sendMessage(`${ChatColor.RED}No active plot here!`);
        return;
      }

      if (!active_plot.online) {
        // prettier-ignore
        player.sendMessage(`${ChatColor.RED}Plugin has crashed or in process of botting!`);
        return;
      }

      player.sendMessage(`${ChatColor.GREEN}Joining plot!`);
      active_plots.get(plot_id).worker.postMessage({
        type: "plot-player-enter",
        player: player
      });
    },
    onTabComplete: () => {
      return [];
    }
  });

  // TODO Put this inside plugins?
  plugin.command("leave", {
    onCommand: (player, command, alias, args) => {
      let { id: plot_id } = location_to_plot(player.getLocation());

      try {
        if (active_plots.get(plot_id)) {
          active_plots.get(plot_id).worker.postMessage({
            type: "plot-player-leave",
            player: player
          });
        }
      } catch (error) {}

      player.sendActionBar(`${ChatColor.BLACK}Left plugin area`);
      player.setGameMode(GameMode.CREATIVE);
      player.setCompassTarget(new Location(plugin.getServer().getWorlds()[0], 0, 0, 0));
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

      player.sendMessage(`${ChatColor.GREEN}You just left the plot!`);
    }
  });

  // plugin.events.PlayerCommandSend(event => {
  //   console.log(`event.getCommands():`, event.getCommands())
  // })

  let valid_commands = ["/claim", "/leave", "/enter", "/build", "/set"];
  plugin.events.PlayerCommandPreprocess(
    event => {
      let player = event.getPlayer();
      let message = event.getMessage();
      let isOp = player.isOp();

      player.sendMessage(`${ChatColor.GRAY}${message}`);

      if (isOp || valid_commands.some(x => message.startsWith(x))) {
        return;
      }

      if (message.startsWith("//")) {
        event.setCancelled(true);
        // prettier-ignore
        player.sendMessage(`${ChatColor.RED}You can only use worldedit while in builder mode!`);
      }
      event.setCancelled(true);
    },
    { priority: "LOWEST" }
  );

  // prettier-ignore
  let CreatureSpawnEvent = Java.type("org.bukkit.event.entity.CreatureSpawnEvent");
  plugin.events.CreatureSpawn(event => {
    if (
      !event.getCause ||
      event.getCause() !== CreatureSpawnEvent.SpawnReason.CUSTOM
    ) {
      event.setCancelled(true);
    }
  });

  let interaction_events = [
    "BlockBreak",
    "BlockPlace",
    "PlayerBucketEmpty",
    "PlayerBucketFill",
    "PlayerInteract",
    "HangingBreak",
    "HangingPlace",
    "InventoryOpen",
    "PlayerDropItem",
    "PlayerPickupItem"
  ];
  for (let event of interaction_events) {
    let event_name = event;
    if (plugin.events[event_name]) {
      plugin.events[event_name](
        event => {
          event.setCancelled(true);
        },
        { priority: "LOWEST" }
      );
    } else {
      console.error(`Event not found on plugin:`, event_name);
    }
  }

  // Packet.addOutgoingPacketListener(Packet.fromServer.TAB_COMPLETE, event => {
  //   console.log(`event.getData():`, event.getData())
  // })

  console.log("Http server");
  let server = new WebSocket.Server({ port: 8000 });

  let connect_websocket_to_worker = (websocket, active_plot) => {
    let plot_prefix = `${ChatColor.BLUE}[${active_plot.plot_x},${active_plot.plot_z}]${ChatColor.WHITE}`;

    console.log(plot_prefix, "Connecting with websocket...");

    if (active_plot.worker.stdout) {
      do_async("Stdout", async () => {
        try {
          for await (let buffer of active_plot.worker.stdout) {
            let lines = buffer.toString().split("\n");
            websocket.send({
              type: "log",
              body: lines.slice(0, -1).join("\n")
            });
            for (let line of lines.slice(0, -1)) {
              console.log(plot_prefix, line);
            }
          }
        } catch (error) {
          console.log(`error:`, error);
        }
      });
    }
    if (active_plot.worker.stderr) {
      do_async("Stderr", async () => {
        try {
          for await (let buffer of active_plot.worker.stderr) {
            let lines = buffer.toString().split("\n");
            websocket.send({
              type: "log",
              body: lines.slice(0, -1).join("\n")
            });
            for (let line of lines.slice(0, -1)) {
              console.log(plot_prefix, line);
            }
          }
        } catch (error) {
          console.log(`error:`, error);
        }
      });
    }
  };

  server.on("connection", websocket => {
    let session_id = null;

    websocket.on("message", async message => {
      if (session_id == null) {
        if (message.type === "open") {
          console.log("Open!");
          console.log(`message.session_id:`, message.session_id);
          let plot = plots.findOne({ password: message.session_id });
          if (plot == null) {
            // throw new Error(`Plot for key not found`);
            websocket.send({ type: "error", message: "No plot found for key" });
            return;
          }

          session_id = message.session_id;

          websocket.send({ type: "open" });

          if (active_plots.get(plot.plot_id)) {
            connect_websocket_to_worker(
              websocket,
              active_plots.get(plot.plot_id)
            );
          }
        } else {
          console.log(`Unknown type '${message.type}'`);
        }
      }

      if (message.type === "script") {
        // console.log(`message:`, message);
        let plot = plots.findOne({ password: session_id });
        if (plot == null) {
          throw new Error(`Plot for key not found`);
        }

        plots.updateOne(
          { plot_id: plot.plot_id },
          { $set: { script: message.script } }
        );

        try {
          let worker = await refresh_plot(plot.plot_id);

          // TODO Need to place this on a more realtime place
          connect_websocket_to_worker(
            websocket,
            active_plots.get(plot.plot_id)
          );
          worker.on("message", message => {
            if (message.type === "caught_error") {
              websocket.send({
                type: "execution_error",
                message: message.message,
                stack: message.stack
              });
            }
          });
        } catch (error) {
          if (
            error instanceof
              Java.type("org.graalvm.polyglot.PolyglotException") &&
            error.isCancelled()
          ) {
            websocket.send({
              type: "execution_error",
              message: "Code did timeout"
            });
          } else {
            console.error(`Refresh plot error:`, error);
            websocket.send({
              type: "execution_error",
              message: error.message,
              stack: error.stack
            });
          }
        }
      }
    });
  });
};
