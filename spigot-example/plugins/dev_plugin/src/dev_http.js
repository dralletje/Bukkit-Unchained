let { ChatColor } = require('bukkit');
let Bukkit = require('bukkit');
let server = Polyglot.import('server');
let { EventEmitter } = require('events');

// let webpack = require('./webpack.js');
// webpack.default('1 + 1').then((we) => {
//   console.log(`webpack:`, we)
// })
let make_value_plain = require('./plain_value.js');

let parse_input_json = (exchange) => {
  let Collectors = Java.type('java.util.stream.Collectors');
  let BufferedReader = Java.type('java.io.BufferedReader');
  let InputStreamReader = Java.type('java.io.InputStreamReader');
  let result = new BufferedReader(new InputStreamReader(exchange.getRequestBody())).lines().collect(Collectors.joining("\n"));
  return JSON.parse(result);
}

let send_response = (exchange, response) => {
  let outputstream = exchange.getResponseBody();
  var json = JSON.stringify(response);

  let getBytesMethod = Java.type('java.lang.String').class.getDeclaredMethod('getBytes');
  let bytes = getBytesMethod.invoke(json);

  exchange.sendResponseHeaders(200, bytes.length);
  outputstream.write(bytes);
  outputstream.close();
}

class Session {
  constructor() {
    this.active_processes = []
    this.active = true;
  }

  add_active_process(active_process) {
    if (this.active === false) {
      throw new Error("This session has ended!");
    }
    this.active_processes.push(active_process);
  }

  remove_active_process(active_process) {
    this.active_processes = this.active_processes.filter(x => x !== active_process);
  }

  teardown() {
    this.active = false;
    for (let active_process of this.active_processes) {
      try {
        active_process.dispose();
      } catch (error) {
        // This is important, because this means something is not being disposed
        console.log('IMPORTANT ERROR: Active process not being disposed:');
        console.log(`error:`, error);
      }
    }
  }
}

let { create_isolated_plugin } = require('./isolated_plugin.js');

module.exports = (plugin) => {
  let dev_events = new EventEmitter();

  // let command = register_command({
  //   plugin: plugin,
  //   name: 'test-command6',
  //   description: 'A test command',
  //   usageMessage: '',
  // });

  let active_session = new Session();

  plugin.on('onDisable', () => {
    active_session.teardown();
  })

  let CreatureSpawnEvent = Java.type('org.bukkit.event.entity.CreatureSpawnEvent');
  plugin.events.CreatureSpawn((event) => {
    if (!event.getCause || event.getCause() !== CreatureSpawnEvent.SpawnReason.CUSTOM) {
      event.setCancelled(true);
    }
  });

  let location_boundaries = {
    x: { min: -31, max: 34 },
    z: { min: -170, max: -105 },
  }

  let location_filter = (location) => {
    return (
      location.getX() > location_boundaries.x.min &&
      location.getX() < location_boundaries.x.max &&
      location.getZ() > location_boundaries.z.min &&
      location.getZ() < location_boundaries.z.max
    );
  }

  let leave_plugin_plot = (player) => {
    set_players_in_session('only-one-for-now', get_players_in_session('only-one-for-now').filter(x => x !== player));
    player.sendActionBar(`${ChatColor.BLACK}Left plugin area`);
    player.setGameMode(GameMode.CREATIVE);
  }

  let GameMode = Java.type('org.bukkit.GameMode');
  let PlayerJoinEvent = Java.type('org.bukkit.event.player.PlayerJoinEvent');
  plugin.events.PlayerMove((event) => {
    let to_is_in = location_filter(event.getTo());
    let from_is_in = location_filter(event.getFrom());
    if (!to_is_in && from_is_in) {
      // Moving into plugin area
      let player = event.getPlayer();
      setImmediate(() => {
        leave_plugin_plot(player);
      })
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

  plugin.command('set', {
    onCommand: (player, _1, _2, args) => {
      if (args[0] != null) {
        dev_events.emit('set-build-config', { plot_id: 'only-one-for-now', key: args[0], player: player });
      }
      return true;
    },
    onTabComplete: (player, _1, _2, args) => {
      let result = [];
      dev_events.emit('get-build-keys', { plot_id: 'only-one-for-now', set_result: new_results => {
        result = new_results;
      } })
      let text = args[0];

      return result.map(x => x.name).filter(x => x.startsWith(text));
    },
  })

  plugin.command('enter', {
    onCommand: (sender, command, alias, args) => {
      if (!location_filter(sender.getLocation())) {
        sender.sendMessage('You are not on a plugin plot');
        return true;
      }

      let can_join = false;
      dev_events.emit('player-join', {
        player: sender,
        plot_id: 'only-one-for-now',
        set_can_join: (new_can_join) => {
          console.log(`new_can_join:`, new_can_join)
          can_join = new_can_join;
        }
      })

      if (can_join) {
        set_players_in_session('only-one-for-now', [...get_players_in_session('only-one-for-now'), sender]);
        server.getPluginManager().callEvent(new PlayerJoinEvent(sender, "Player joined!"));
      }
    },
  });

  plugin.command('leave', {
    onCommand: (sender, command, alias, args) => {
      if (!location_filter(sender.getLocation())) {
        sender.sendMessage('You are not on a plugin plot');
        return true;
      }

      leave_plugin_plot(sender);
    },
  });

  let players_in_session = new Map();
  let get_players_in_session = (session_id) => {
    return players_in_session.get(session_id) || [];
  }
  let set_players_in_session = (session_id, players) => {
    players_in_session.set(session_id, players);
  }

  // TEST
  // let dev_plugin_data_path = plugin.java.getDataFolder().toPath().toString();
  // let js_plugin_data_path = `${dev_plugin_data_path}/data/${'only-one-for-now'}.json`;

  // try {
  //   let build_storage_cache = JSON.parse(fs.readFileSync(js_plugin_data_path).toString());
  //   console.log(`build_storage_cache:`, build_storage_cache)
  // } catch (error) {
  //   console.log(`Build storage get error:`, error);
  //   return {};
  // }
  // fs.writeFileSync(js_plugin_data_path, JSON.stringify({ hey2: true }));


  console.log('Http server');
  let http_server = plugin.create_http_server(8001, (exchange) => {
    let session_id = 'only-one-for-now';
    try {
      active_session.teardown();
      active_session = new Session();

      let body = parse_input_json(exchange);

      exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
      exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type,Authorization");

      let dev_plugin = create_isolated_plugin({
        plugin: plugin,
        active_session: active_session,
        events: dev_events,
        plot_id: session_id,
        filters: {
          location: location_filter,
          player: (player) => {
            return get_players_in_session(session_id).includes(player);
          }
        },
      });
      let new_module = { exports: {} };

      let injects = [
        { name: 'plugin', value: dev_plugin },
        { name: 'Bukkit', value: Bukkit },
        { name: 'module', value: new_module },
        { name: 'exports', value: new_module.exports },
        { name: 'setTimeout', value: dev_plugin.timers.setTimeout },
        { name: 'clearTimeout', value: dev_plugin.timers.clearTimeout },
        { name: 'setInterval', value: dev_plugin.timers.setInterval },
        { name: 'clearInterval', value: dev_plugin.timers.clearInterval },
      ]

      // TODO Make this use the local `require` so it can import bukkit
      Polyglot.eval('js', `((${injects.map(x => x.name).join(', ')}) => { ${body.script} })`)(...injects.map(x => x.value));

      send_response(exchange, { result: make_value_plain(new_module.exports) })
    } catch (err) {
      console.log(`err.message:`, err)
      send_response(exchange, { error: { message: err.message, stack: err.stack } });
    }
  });

  // let sync_commands = get_private_method(server, 'syncCommands');
  // console.log(`get_private_property(server, 'syncCommands':`, );
  // sync_commands();
}
