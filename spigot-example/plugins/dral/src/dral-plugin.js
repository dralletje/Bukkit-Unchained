let { JavaPlugin } = require('bukkit/JavaPlugin');
let { chat } = require('./chatchatchat.js');

let ChatColor = Java.type('org.bukkit.ChatColor');

let plugin = new JavaPlugin();

plugin.onEnable(() => {
  try {
    require("./WorldeditVisualizer.js")(plugin);
  } catch (error) {
    console.log(`WORLDEDIT VISUALISER error.stack:`, error.stack)
  }
  try {
    require("./smite.js")(plugin);
  } catch (error) {
    console.log(`SMITE error.stack:`, error.stack)
  }
  try {
    require("./jsrepl.js")(plugin);
  } catch (error) {
    console.log(`JSREPL error.stack:`, error.stack)
  }
  try {
    require("./warp.js")(plugin);
  } catch (error) {
    console.log(`WARP error.stack:`, error.stack)
  }
  try {
    require("./teleport.js").TeleportPlugin(plugin);
  } catch (error) {
    console.log(`TELEPORT error.stack:`, error.stack)
  }
  try {
    require("./spectate.js").SpectatePlugin(plugin);
  } catch (error) {
    console.log(`SPECTATE error.stack:`, error.stack)
  }
  try {
    require("./take.js")(plugin);
  } catch (error) {
    console.log(`TAKE error.stack:`, error.stack)
  }
  try {
    require("./infinitedispenser.js")(plugin);
  } catch (error) {
    console.log(`INFINITE error.stack:`, error.stack)
  }
  try {
    require("./chillin.js")(plugin);
  } catch (error) {
    console.log(`CHILLIN error.stack:`, error.stack)
  }
  try {
    require("./signs.js")(plugin);
  } catch (error) {
    console.log(`SIGNS error.stack:`, error.stack)
  }


  let VISIBLE_COLORS = [ChatColor.GREEN, ChatColor.AQUA, ChatColor.RED, ChatColor.LIGHT_PURPLE, ChatColor.YELLOW, ChatColor.DARK_GREEN, ChatColor.DARK_AQUA, ChatColor.DARK_RED, ChatColor.DARK_PURPLE, ChatColor.GOLD, ChatColor.BLUE];
  let player_color = function(player) {
    return VISIBLE_COLORS[player.getDisplayName().charCodeAt(0) % VISIBLE_COLORS.length];
  }

  try {
    plugin.command('me', {
      onCommand: (sender, command, alias, args) => {
        let message = args.join(' ');
        let colored_message = ChatColor.translateAlternateColorCodes("&", message);
        plugin.java.getServer().broadcastMessage(chat.flat(chat.gray`* ${sender.getDisplayName()} ${colored_message}`))
      }
    })
  } catch (err) {}

  plugin.events.PlayerJoin((event) => {
    let player = event.getPlayer();
    player.setDisplayName(player_color(player) + ChatColor.translateAlternateColorCodes("&", player.getDisplayName()));
    player.setPlayerListName(player.getDisplayName());
    event.setJoinMessage(chat.flat(`${chat.white('>')} ${player.getDisplayName()} ${chat.gray('joined the server')}`));
  });

  plugin.events.PlayerQuit((event) => {
    event.setJoinMessage(chat.flat(`${chat.white('>')} ${player.getDisplayName()} ${chat.gray('left :(')}`));
  });

  plugin.events.PlayerChat((event) => {
    event.setMessage(event.getMessage());
    let message = ChatColor.translateAlternateColorCodes('&', event.getMessage())
    event.setFormat(`${event.getPlayer().getDisplayName()}: ${ChatColor.GRAY}${message}`);
  });
});

module.exports = plugin.getBridge();
