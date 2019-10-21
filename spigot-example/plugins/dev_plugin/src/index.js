let ChatColor = Java.type("org.bukkit.ChatColor");
let { JavaPlugin } = require("bukkit/JavaPlugin");


let plugin = new JavaPlugin();

let DO_DEV_HTTP = true;
let DO_WEBSOCKET = false;

if (DO_DEV_HTTP) {
  plugin.onEnable(() => {
    try {
      let dev_http = require("./dev_http.js");
      if (plugin.java.getServer().getWorlds().length === 0) {
        plugin.events.WorldLoad(() => {
          dev_http(plugin);
        });
      } else {
        dev_http(plugin);
      }
    } catch (err) {
      console.error("Could't load dev http plugin");
      console.error(err);
    }
  });
}

if (DO_WEBSOCKET) {
  plugin.onEnable(() => {
    try {
      // require('./websocket/websocket.js')
      // let {Worker} = require('worker_threads');
      // let worker = new Worker(
      //   `${plugin.java.getDataFolder()}/dist/WebsocketWorker.js`,
      //   {
      //     needsBukkit: false,
      //     // workerData: {
      //     //   source: db_plot.script,
      //     //   plot_x: db_plot.plot_x,
      //     //   plot_z: db_plot.plot_z,
      //     //   mongo_url: `${db_plot.plot_x},${db_plot.plot_z}`,
      //     //   entry_path: main_path
      //     // },
      //     // stdout: true,
      //     // stderr: true
      //   }
      // );
      //
      // worker.on('online', () => {
      //   console.log('Websocket Worker Online!');
      // });
      // worker.on('error', (error) => {
      //   console.log('Websocket Worker error', error.stack);
      // });
    } catch (err) {
      console.error("Could't load websocket plugin");
      console.error(err);
    }
  });
}

// Always enable jsrepl
plugin.onEnable(() => {
  try {
    require("./jsrepl.js")(plugin);
  } catch (err) {
    console.error("Could't load jsrepl plugin");
    console.error(err);
  }
});

try {
  let chunk_generator = require("./PlotGenerator.js")(plugin);
  plugin.setDefaultChunkGenerator(chunk_generator);
} catch (err) {
  console.error("Could't load plot generator plugin");
  console.error(err);
}

module.exports = plugin.getBridge();
