let { JavaPlugin } = require('bukkit/JavaPlugin');

let ChatColor = Java.type('org.bukkit.ChatColor');

let plugin = new JavaPlugin();

plugin.onEnable(() => {
  require("./WorldeditVisualizer.js")(plugin);

  let VISIBLE_COLORS = [ChatColor.GREEN, ChatColor.AQUA, ChatColor.RED, ChatColor.LIGHT_PURPLE, ChatColor.YELLOW, ChatColor.DARK_GREEN, ChatColor.DARK_AQUA, ChatColor.DARK_RED, ChatColor.DARK_PURPLE, ChatColor.GOLD, ChatColor.BLUE];
  let player_color = function(player) {
    return VISIBLE_COLORS[player.getDisplayName().charCodeAt(0) % VISIBLE_COLORS.length];
  }

  plugin.events.PlayerJoin((event) => {
    let player = event.getPlayer();
    player.setPlayerListName(player_color(player) + ChatColor.translateAlternateColorCodes("&", player.getDisplayName()));
    event.setJoinMessage(`${ChatColor.GRAY}* ${player_color(player)}${player.getDisplayName()}${ChatColor.GRAY} joined the server`);
  });

  plugin.events.PlayerQuit((event) => {
    event.setQuitMessage(`${ChatColor.GRAY}* ${player_color(event.getPlayer())}${event.getPlayer().getDisplayName()}${ChatColor.GRAY} left :(`);
  });

  plugin.events.PlayerChat((event) => {
    event.setMessage(event.getMessage());
    let message = ChatColor.translateAlternateColorCodes('&', event.getMessage())
    event.setFormat(`${player_color(event.getPlayer())}${event.getPlayer().getDisplayName()}: ${ChatColor.GRAY}${message}`);
  });
});

module.exports = plugin.getBridge();
