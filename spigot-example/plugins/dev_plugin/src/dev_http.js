let { ChatColor } = require('bukkit');

let server = Polyglot.import('server');

let BukkitCommand = Java.type('org.bukkit.command.defaults.BukkitCommand');

// let webpack = require('./webpack.js');
// webpack.default('1 + 1').then((we) => {
//   console.log(`webpack:`, we)
// })

let register_command = ({ plugin, name, description, usageMessage, aliasses = [] }) => {
  let MyCommand = Java.extend(BukkitCommand, {
    execute: (sender, alias, args) => {
      console.log('Executing command');
      sender.sendMessage(ChatColor.GRAY + args[0] + " is " + ChatColor.GREEN + "online");
      return true;
    },
    tabComplete: (sender, alias, args) => {
      console.log('TabComplete');
      return ['hey']
    },
    getPlugin: () => {
      return plugin.java;
    }
  });

  let command = new MyCommand(name, description, usageMessage, aliasses);

  let plugin_name = plugin.java.getDescription().getName();
  console.log(`plugin_name:`, plugin_name)
  server.getCommandMap().register(plugin_name, command);

  plugin.on('onDisable', () => {
    try {
      command.setLabel('TRASHTHIS');
      let luck = command.unregister(server.getCommandMap());
      console.log('Command unregistered', luck)
    } catch (err) {
      console.log('Command unregister failed:', err);
    }
  });

  return {
    dispose: () => {
      command.unregister(server.getCommandMap());
    },
  }
}

let parse_input_json = (exchange) => {
  let Collectors = Java.type('java.util.stream.Collectors');
  let BufferedReader = Java.type('java.io.BufferedReader');
  let InputStreamReader = Java.type('java.io.InputStreamReader');
  let result = new BufferedReader(new InputStreamReader(exchange.getRequestBody())).lines().collect(Collectors.joining("\n"));
  return JSON.parse(result);
}

let send_response = (exchange, response) => {
  let outputstream = exchange.getResponseBody();
  var bytes = Array.from(Buffer.from(JSON.stringify(response)));
  exchange.sendResponseHeaders(200, bytes.length);
  outputstream.write(bytes);
  outputstream.close();
}

module.exports = (plugin) => {
  // let command = register_command({
  //   plugin: plugin,
  //   name: 'test-command6',
  //   description: 'A test command',
  //   usageMessage: '',
  // });

  console.log('Http server');
  let http_server = plugin.create_http_server(8001, (exchange) => {
    try {
      let body = parse_input_json(exchange);

      console.log(`body:`, body)

      exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
      exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type,Authorization");

      let result = Polyglot.eval('js', `(() => {${body.script}})()`) || null;


      send_response(exchange, { result })
    } catch (err) {
      console.log(`err.message:`, err)
      send_response(exchange, { error: err.message });
    }
  });

  // let sync_commands = get_private_method(server, 'syncCommands');
  // console.log(`get_private_property(server, 'syncCommands':`, );
  // sync_commands();
}
