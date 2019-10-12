let { MongoClient } = require('./mongo.js');
let { ChatColor } = require('bukkit');
let server = Polyglot.import('server');

let uuid = require('uuid/v4');

// let webpack = require('./webpack.js');
// webpack.default('1 + 1').then((we) => {
//   console.log(`webpack:`, we)
// })


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

    let RecursiveContext = Java_type('eu.dral.unchained.RecursiveContext');
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

  let server = plugin.getServer ? plugin.getServer() : plugin.java.getServer();
  // plugin.command('set', {
  //   onCommand: (player, _1, _2, args) => {
  //     if (args[0] != null) {
  //       dev_events.emit('set-build-config', { plot_id: 'only-one-for-now', key: args[0], player: player });
  //     }
  //     return true;
  //   },
  //   onTabComplete: (player, _1, _2, args) => {
  //     let result = [];
  //     dev_events.emit('get-build-keys', { plot_id: 'only-one-for-now', set_result: new_results => {
  //       result = new_results;
  //     } })
  //     let text = args[0];
  //
  //     return result.map(x => x.name).filter(x => x.startsWith(text));
  //   },
  // })

  let location_to_plot = (location) => {
    let x = modulo(location.getChunk().getX(), 5);
    let z = modulo(location.getChunk().getZ(), 5);
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
      let { x, z, id: plot_id } = location_to_plot(player.getLocation());
      let plot = plots.findOne({ plot_id });
      if (plot == null || plot.owner !== player_id) {
        player.sendMessage(`${ChatColor.RED}This is not your plot!`);
        return true;
      }

      let editor_url = `${EDITOR_URL}/${plot.password}`;
      let url = chat.show_text('This will open an editor in your browser', chat.open_url(editor_url, 'https://dral.eu/editor'));

      server.getPluginManager().callEvent(new PlayerJoinEvent(player, "builder"));
      player.sendMessage(`${ChatColor.GREEN}Entered builder mode`);
      player.sendMessage(chat`${chat.green('Edit at')} ${chat.dark_purple(url)}`)
    },
  });

  let PlayerJoinEvent = Java.type('org.bukkit.event.player.PlayerJoinEvent');
  let PlayerQuitEvent = Java.type('org.bukkit.event.player.PlayerQuitEvent');
  plugin.command('enter', {
    onCommand: (sender, command, alias, args) => {
      server.getPluginManager().callEvent(new PlayerJoinEvent(sender, "player"));
    },
  });

  plugin.command('leave', {
    onCommand: (sender, command, alias, args) => {
      server.getPluginManager.callEvent(new PlayerQuitEvent(sender, "Bye"))
    },
  });

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

  // let Engine = Java.type('org.graalvm.polyglot.Engine');
  // let Context = Java.type('org.graalvm.polyglot.Context');
  // let shared_engine = Engine.newBuilder()
  //   .option("inspect", "8228")
  //   .option("inspect.Path", "session")
  //   .build()

  console.log('Http server');
  let http_server = plugin.create_http_server(8001, (exchange) => {
    try {
      let body = parse_input_json(exchange);
      body.plot_id = '4:4';

      exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
      exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type,Authorization");

      plots.updateOne({ plot_id: body.plot_id }, {
        $set: {
          script: body.script,
        },
      });
      refresh_plot(body.plot_id);

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
