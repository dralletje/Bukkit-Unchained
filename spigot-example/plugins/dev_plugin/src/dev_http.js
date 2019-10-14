let { MongoClient } = require('./mongo.js');
let { ChatColor } = require('bukkit');
let server = Polyglot.import('server');

let uuid = require('uuid/v4');

// let webpack = require('./webpack.js');
// webpack.default('1 + 1').then((we) => {
//   console.log(`webpack:`, we)
// })
let Packet = require('./Packet.js');

let parse_input_json = (exchange) => {
  let Collectors = Java.type('java.util.stream.Collectors');
  let BufferedReader = Java.type('java.io.BufferedReader');
  let InputStreamReader = Java.type('java.io.InputStreamReader');
  let result = new BufferedReader(new InputStreamReader(exchange.getRequestBody())).lines().collect(Collectors.joining("\n"));
  return JSON.parse(result);
}

let modulo = (x, n) => ((x % n) < 0) ? (n + (x % n)) : x % n

let send_response = (exchange, response) => {
  let outputstream = exchange.getResponseBody();
  var json = JSON.stringify(response);

  let getBytesMethod = Java.type('java.lang.String').class.getDeclaredMethod('getBytes');
  let bytes = getBytesMethod.invoke(json);

  exchange.sendResponseHeaders(200, bytes.length);
  outputstream.write(bytes);
  outputstream.close();
}

let { chat } = require('./chat.js');

let RecursiveContext = Java_type('eu.dral.unchained.RecursiveContext');
let InterContextEvent = RecursiveContext.static.InterContextEvent;

module.exports = (plugin) => {
  let mongo_client = new MongoClient("mongodb://-1_4:password123@localhost:32768/database");
  let database = mongo_client.db('Unchained');

  let plots = database.collection('plots');

  let active_plots = new Map();
  let refresh_plot = (db_plot) => {
    if (typeof db_plot === 'string') {
      db_plot = plots.findOne({ plot_id: db_plot });
    }

    let active_plot = active_plots.get(db_plot.plot_id);
    if (active_plot != null) {
      try {
        active_plot.context.close()
      } catch {}
    }

    let context = new RecursiveContext(plugin.java);
    let main_path = plugin.java.getDescription().getMain();

    context.loadPlugin(db_plot.script, JSON.stringify({
      plot_x: db_plot.plot_x,
      plot_z: db_plot.plot_z,
      mongo_url: 'https://google.com/search',
      entry_path: main_path,
    }));

    active_plots.set(db_plot.plot_id, {
      context: context,
    });
  }

  for (let db_plot of plots.find({}).toArray()) {
    // console.log(`db_plot:`, db_plot);
    refresh_plot(db_plot);
  }

  // client.db('database').runCommand({
  //   createUser: '-1_4',
  //   pwd: 'password123',
  //   roles: Java.to(['readWrite']),
  // });

  let location_to_plot = (location) => {
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
      id: `${x}:${z}`,
    }
  }

  plugin.command('claim', {
    onCommand: (player) => {
      let player_id = player.getUniqueId().toString()
      let player_plots = plots.find({ owner: player_id }).toArray();
      if (player_plots.length !== 0) {
        player.sendMessage(`${ChatColor.RED}You already have a plot yourself!`);
        return true;
      }

      let { x, z, id: plot_id } = location_to_plot(player.getLocation());
      let claimed_plot = plots.findOne({ plot_id: plot_id });

      if (claimed_plot != null) {
        player.sendMessage(`${ChatColor.RED}Plot is already claimed!`);
        return
      }

      player.sendMessage(`${ChatColor.DARK_GREEN}Plot claimed!`)
      plots.insert({
        owner: player_id,
        plot_id: plot_id,
        plot_x: x,
        plot_z: z,
        password: uuid(),
      });
    },
  });

  let EDITOR_URL = 'http://localhost:3000/editor';
  plugin.command('build', {
    onCommand: (player) => {
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
      let url = chat.show_text('This will open an editor in your browser', chat.open_url(editor_url, 'https://dral.eu/editor'));

      if (active_plots.get(plot_id)) {
        let event = new InterContextEvent("plot-player-build", { player });
        active_plots.get(plot_id).context.emit(event)
      }
      player.sendMessage(`${ChatColor.GREEN}Entered builder mode`);
      player.sendMessage(chat`${chat.green('Edit at')} ${chat.dark_purple(url)}`)
    },
  });

  let PlayerQuitEvent = Java.type('org.bukkit.event.player.PlayerQuitEvent');
  plugin.command('enter', {
    onCommand: (player, command, alias, args) => {
      let { id: plot_id } = location_to_plot(player.getLocation())
      if (active_plots.get(plot_id)) {
        let event = new InterContextEvent("plot-player-enter", { player });
        active_plots.get(plot_id).context.emit(event)
      }
    },
    onTabComplete: () => {
      return ['hey'];
    }
  });

  // TODO Put this inside plugins?
  plugin.command('leave', {
    onCommand: (player, command, alias, args) => {
      let { id: plot_id } = location_to_plot(player.getLocation())
      if (active_plots.get(plot_id)) {
        let event = new InterContextEvent("plot-player-leave", { player });
        active_plots.get(plot_id).context.emit(event)
      }
    },
  });

  // plugin.events.PlayerCommandSend(event => {
  //   console.log(`event.getCommands():`, event.getCommands())
  // })

  let valid_commands = ['/claim', '/leave', '/enter', '/build', '/set'];
  plugin.events.PlayerCommandPreprocess(event => {
    let player = event.getPlayer();
    let message = event.getMessage();
    player.sendMessage(`${ChatColor.GRAY}${message}`)
    if (valid_commands.some(x => message.startsWith(x))) {
      return;
    }
    if (event.message.startsWith('//')) {
      event.setCancelled(true);
      player.sendMessage(`${ChatColor.RED}You can only use worldedit while in builder mode!`);
    }
    event.setCancelled(true);
  }, { priority: 'LOWEST' });

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
    'BlockBreak',
    'BlockPlace',
    'PlayerBucketEmpty',
    'PlayerBucketFill',
    'PlayerInteract',
    'HangingBreak',
    'HangingPlace',
    'InventoryOpen',
    'PlayerDropItem',
    'PlayerPickupItem',
  ];
  for (let event of interaction_events) {
    let event_name = event;
    if (plugin.events[event_name]) {
      plugin.events[event_name]((event) => {
        event.setCancelled(true);
      }, { priority: 'LOWEST' })
    } else {
      console.log(`event_name:`, event_name);
    }
  }

  plugin.command('set', {
    onCommand: (player, _1, _2, args) => {
      return true;
    },
    onTabComplete: (player, _1, _2, args) => {
      let result = ['hey', 'wow', 'cool'];
      let text = args[0];

      return result.filter(x => x.startsWith(text));
    },
  });

  Packet.addOutgoingPacketListener(Packet.fromServer.TAB_COMPLETE, event => {
    console.log(`event.getData():`, event.getData())
  })

  console.log('Http server');
  let http_server = plugin.create_http_server(8001, (exchange) => {
    try {
      let body = parse_input_json(exchange);

      let plot = plots.findOne({ password: body.key });

      exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
      exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type,Authorization");

      plots.updateOne({ plot_id: plot.plot_id }, {
        $set: {
          script: body.script,
        },
      });
      refresh_plot(plot.plot_id);

      // TODO Make this use the local `require` so it can import bukkit
      // Polyglot.eval('js', `((${injects.map(x => x.name).join(', ')}) => { ${body.script} })`)(...injects.map(x => x.value));

      // send_response(exchange, { result: make_value_plain(new_module.exports) })
      send_response(exchange, { result: {} })
    } catch (err) {
      console.log(`err.message:`, err)
      send_response(exchange, { error: { message: err.message, stack: err.stack } });
    }
  });

  // let sync_commands = get_private_method(server, 'syncCommands');
  // console.log(`get_private_property(server, 'syncCommands':`, );
  // sync_commands();
}
