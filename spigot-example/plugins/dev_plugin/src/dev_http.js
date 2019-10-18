let { MongoClient } = require("./mongo.js");
let { ref, Worker } = require("worker_threads");

let uuid = require("uuid/v4");

let ChatColor = Java.type("org.bukkit.ChatColor");

// let Packet = require('./Packet.js');

let parse_input_json = exchange => {
  let Collectors = Java.type("java.util.stream.Collectors");
  let BufferedReader = Java.type("java.io.BufferedReader");
  let InputStreamReader = Java.type("java.io.InputStreamReader");
  let result = new BufferedReader(
    new InputStreamReader(exchange.getRequestBody())
  )
    .lines()
    .collect(Collectors.joining("\n"));
  return JSON.parse(result);
};

let modulo = (x, n) => (x % n < 0 ? n + (x % n) : x % n);

let send_response = (exchange, response) => {
  let outputstream = exchange.getResponseBody();
  var json = JSON.stringify(response);

  let getBytesMethod = Java.type("java.lang.String").class.getDeclaredMethod(
    "getBytes"
  );
  let bytes = getBytesMethod.invoke(json);

  exchange.sendResponseHeaders(200, bytes.length);
  outputstream.write(bytes);
  outputstream.close();
};

let { chat } = require("./chat.js");

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

let create_http_server = (port, handler_fn) => {
  let HttpServer = Java.type("com.sun.net.httpserver.HttpServer");
  let InetSocketAddress = Java.type("java.net.InetSocketAddress");
  let HttpHandler = Java.type("com.sun.net.httpserver.HttpHandler");

  let JavascriptHttpHandler = Java.extend(HttpHandler, {
    handle: exchange => {
      handler_fn(exchange);
    }
  });

  let server = HttpServer.create(new InetSocketAddress(port), 0);
  server.createContext("/", new JavascriptHttpHandler());
  server.setExecutor(null); // creates a default executor
  server.start();

  ref({
    close: () => server.stop(0)
  });

  return server;
};

module.exports = plugin => {
  let mongo_client = new MongoClient(
    "mongodb://-1_4:password123@localhost:32768/database"
  );
  let database = mongo_client.db("Unchained");

  let plots = database.collection("plots");

  let active_plots = new Map();
  let refresh_plot = async db_plot => {
    if (typeof db_plot === "string") {
      db_plot = plots.findOne({ plot_id: db_plot });
    }

    let active_plot = active_plots.get(db_plot.plot_id);
    if (active_plot != null) {
      // Wait for the plot to come online first, if it is still booting...
      if (active_plot.active === false) {
        console.log(`${ChatColor.ORANGE}Worker was not yet done initializing`);
        await new Promise((resolve, reject) => {
          worker.once("online", resolve);
          worker.once("error", resolve);
        });
      }

      // ...before I slaughter er
      try {
        active_plot.worker.terminate();
        console.log(`${ChatColor.GREEN}Worker terminated succesfully`);
      } catch (err) {
        console.log(`Closing err:`, err);
      }
    } else {
      console.log("First time booting this worker");
    }

    let main_path = plugin.java.getDescription().getMain();
    let worker = new Worker(
      `${plugin.java.getDataFolder()}/dist/PluginWorker.js`,
      {
        workerData: {
          source: db_plot.script,
          plot_x: db_plot.plot_x,
          plot_z: db_plot.plot_z,
          mongo_url: "https://google.com/search",
          entry_path: main_path
        },
        stdout: true,
        stderr: true
      }
    );

    (async () => {
      try {
        let last_string_end = "";
        for await (let buffer of worker.stdout) {
          let message = last_string_end + buffer.toString();
          // console.log(`message:`, message)
          let lines = message.split("\n");
          last_string_end = lines.slice(-1)[0];
          console.log(`lines:`, lines)
          for (let line of lines.slice(0, -1)) {
            console.log(line);
          }
        }
      } catch (error) {
        console.log(`error:`, error);
      }
    })();
    (async () => {
      try {
        let last_string_end = "";
        for await (let buffer of worker.stderr) {
          let message = last_string_end + buffer.toString();
          let lines = message.split("\n");
          last_string_end = lines.slice(-1)[0];
          for (let line of lines.slice(0 - 1)) {
            console.log(line);
          }
        }
      } catch (error) {
        console.log(`error:`, error);
      }
    })();

    active_plots.set(db_plot.plot_id, {
      worker: worker,
      online: false
    });

    await new Promise((resolve, reject) => {
      worker.once("online", resolve);
      worker.once("error", reject);
    });

    active_plots.set(db_plot.plot_id, {
      worker: worker,
      online: true
    });
  };

  for (let db_plot of plots.find({}).toArray()) {
    // console.log(`db_plot:`, db_plot);
    refresh_plot(db_plot).catch(err => {
      console.error(`Refresh plot '${db_plot.plot_id}' err:`, err);
    });
  }

  // client.db('database').runCommand({
  //   createUser: '-1_4',
  //   pwd: 'password123',
  //   roles: Java.to(['readWrite']),
  // });

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
      if (active_plots.get(plot_id)) {
        player.sendMessage(`${ChatColor.GREEN}Joining plot!`);
        active_plots.get(plot_id).worker.postMessage({
          type: "plot-player-enter",
          player: player
        });
      } else {
        player.sendMessage(`${ChatColor.RED}No active plot here!`);
      }
    },
    onTabComplete: () => {
      return [];
    }
  });

  // TODO Put this inside plugins?
  plugin.command("leave", {
    onCommand: (player, command, alias, args) => {
      let { id: plot_id } = location_to_plot(player.getLocation());
      if (active_plots.get(plot_id)) {
        active_plots.get(plot_id).worker.postMessage({
          type: "plot-player-leave",
          player: player
        });
        player.sendMessage(`${ChatColor.GREEN}You just left the plot!`);
      }
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

      player.sendMessage(`${ChatColor.GRAY}${message}`);

      if (valid_commands.some(x => message.startsWith(x))) {
        return;
      }
      if (event.message.startsWith("//")) {
        event.setCancelled(true);
        player.sendMessage(
          `${ChatColor.RED}You can only use worldedit while in builder mode!`
        );
      }
      event.setCancelled(true);
    },
    { priority: "LOWEST" }
  );

  let CreatureSpawnEvent = Java.type(
    "org.bukkit.event.entity.CreatureSpawnEvent"
  );
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
      console.log(`event_name:`, event_name);
    }
  }

  // Packet.addOutgoingPacketListener(Packet.fromServer.TAB_COMPLETE, event => {
  //   console.log(`event.getData():`, event.getData())
  // })

  console.log("Http server");
  let http_server = create_http_server(8001, async exchange => {
    try {
      let body = parse_input_json(exchange);

      let plot = plots.findOne({ password: body.key });

      if (plot == null) {
        throw new Error(`Plot for key not found`);
      }

      exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
      exchange
        .getResponseHeaders()
        .add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      exchange
        .getResponseHeaders()
        .add("Access-Control-Allow-Headers", "Content-Type,Authorization");

      plots.updateOne(
        { plot_id: plot.plot_id },
        {
          $set: {
            script: body.script
          }
        }
      );

      await refresh_plot(plot.plot_id);

      // send_response(exchange, { result: make_value_plain(new_module.exports) })
      send_response(exchange, { result: {} });
    } catch (err) {
      console.log(`err.message:`, err);
      console.log(`err.stack:`, err.stack);
      send_response(exchange, {
        error: { message: err.message, stack: err.stack }
      });
    }
  });
};
