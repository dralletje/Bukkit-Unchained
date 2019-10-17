let ChatColor = Java.type("org.bukkit.ChatColor");
let { JavaPlugin } = require("bukkit/JavaPlugin");

console.log("Okay");

let plugin = new JavaPlugin();

plugin.onEnable(() => {
  try {
    console.log("Dev http");
    let dev_http = require("./dev_http.js");
    if (plugin.java.getServer().getWorlds().length === 0) {
      plugin.events.WorldLoad(() => {
        dev_http(plugin);
      });
    } else {
      dev_http(plugin);
    }
  } catch (err) {
    console.log("Could't load dev http plugin");
    console.log(err);
  }

  try {
    require("./jsrepl.js")(plugin);
  } catch (err) {
    console.log("Could't load jsrepl plugin");
    console.log(err);
  }
});

try {
  let chunk_generator = require("./PlotGenerator.js")(plugin);
  plugin.setDefaultChunkGenerator(chunk_generator);
} catch (err) {
  console.log("Could't load plot generator plugin");
  console.log(err);
}

module.exports = plugin.getBridge();
