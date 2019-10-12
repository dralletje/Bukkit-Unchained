let { ChatColor } = require('bukkit');
let Bukkit = require('bukkit');
let server = Polyglot.import('server');
let { EventEmitter } = require('events');
let Location = Java.type('org.bukkit.Location');

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

let send_response = (exchange, response) => {
  let outputstream = exchange.getResponseBody();
  var json = JSON.stringify(response);

  let getBytesMethod = Java.type('java.lang.String').class.getDeclaredMethod('getBytes');
  let bytes = getBytesMethod.invoke(json);

  exchange.sendResponseHeaders(200, bytes.length);
  outputstream.write(bytes);
  outputstream.close();
}

let make_value_plain = require('./plain_value.js');

let float = (n) => Java.type('java.lang.Float').parseFloat(String(n))

module.exports = (plugin) => {
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

  let PlayerJoinEvent = Java.type('org.bukkit.event.player.PlayerJoinEvent');
  let PlayerQuitEvent = Java.type('org.bukkit.event.player.PlayerQuitEvent');
  plugin.command('enter', {
    onCommand: (sender, command, alias, args) => {
      console.log('Enter command sent')
      server.getPluginManager().callEvent(new PlayerJoinEvent(sender, "Player joined!"));
    },
  });

  plugin.command('leave', {
    onCommand: (sender, command, alias, args) => {
      server.getPluginManager.callEvent(new PlayerQuitEvent(sender, "Bye"))
    },
  });

  // let Engine = Java.type('org.graalvm.polyglot.Engine');
  // let Context = Java.type('org.graalvm.polyglot.Context');
  // let shared_engine = Engine.newBuilder()
  //   .option("inspect", "8228")
  //   .option("inspect.Path", "session")
  //   .build()

  let current_context = { close: () => {} };

  console.log('Http server');
  let http_server = plugin.create_http_server(8001, (exchange) => {
    try {
      current_context.close();

      let body = parse_input_json(exchange);

      exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
      exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type,Authorization");

      let RecursiveContext = Java_type('eu.dral.unchained.RecursiveContext');
      let context = new RecursiveContext(plugin.java);
      let main_path = plugin.java.getDescription().getMain();

      context.loadPlugin(body.script, JSON.stringify({
        plot_x: -15,
        plot_y: 1,
        mongo_url: 'https://google.com/search',
        entry_path: main_path,
      }));

      current_context = context;
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
