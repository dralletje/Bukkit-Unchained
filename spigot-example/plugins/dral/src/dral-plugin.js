let _ = require("lodash");
let { JavaPlugin } = require("bukkit/JavaPlugin");
let {
  chat,
  command_success,
  command_info,
  command_error,
} = require("./chat.js");

let ChatColor = Java.type("org.bukkit.ChatColor");

let plugin = new JavaPlugin();

class UserError extends Error {}

global.plugin = plugin;

plugin.onEnable(() => {
  let server = plugin.java.getServer();

  let defineCommand = (name, { onCommand, ...args }) => {
    plugin.command(name, {
      onCommand: (sender, command, alias, args) => {
        let reply_info = (message) => {
          chat.send_message(sender, command_success(`/${alias}`, message));
        };
        let reply_success = (message) => {
          chat.send_message(sender, command_success(`/${alias}`, message));
        };
        let broadcast_action = (message) => {
          for (let player of server.getOnlinePlayers()) {
            // if (player !== sender) {
            chat.send_message(
              player,
              chat.gray`* ${sender.getDisplayName()} ${message}`
            );
            // }
          }
        };

        try {
          return onCommand({
            sender,
            command,
            alias,
            args,
            reply_info,
            reply_success,
            UserError,
            broadcast_action,
          });
        } catch (error) {
          if (error instanceof UserError) {
            chat.send_message(sender, command_error(alias, error.message));
          } else {
            throw error;
          }
        }
      },
      ...args,
    });
  };

  let extra = { defineCommand };

  try {
    require("./WorldeditVisualizer.js")(plugin, extra);
  } catch (error) {
    console.log(`WORLDEDIT VISUALISER error.stack:`, error.stack);
  }
  try {
    require("./smite.js")(plugin, extra);
  } catch (error) {
    console.log(`SMITE error.stack:`, error.stack);
  }
  try {
    require("./jsrepl.js")(plugin, extra);
  } catch (error) {
    console.log(`JSREPL error.stack:`, error.stack);
  }
  try {
    require("./warp.js")(plugin, extra);
  } catch (error) {
    console.log(`WARP error.stack:`, error.stack);
  }
  require("./head.js")
    .head_plugin(plugin, extra)
    .then((error) => {
      console.log(`HEAD error.stack:`, error.stack);
    });
  try {
    require("./teleport.js").TeleportPlugin(plugin, extra);
  } catch (error) {
    console.log(`TELEPORT error.stack:`, error.stack);
  }

  try {
    require("./build.js").BuildPlugin(plugin, extra);
  } catch (error) {
    console.log(`BUILD error.stack:`, error.stack);
  }

  try {
    require("./spectate.js").SpectatePlugin(plugin, extra);
  } catch (error) {
    console.log(`SPECTATE error.stack:`, error.stack);
  }
  try {
    require("./take.js")(plugin, extra);
  } catch (error) {
    console.log(`TAKE error.stack:`, error.stack);
  }
  try {
    require("./infinitedispenser.js")(plugin, extra);
  } catch (error) {
    console.log(`INFINITE error.stack:`, error.stack);
  }
  try {
    require("./chillin.js")(plugin, extra);
  } catch (error) {
    console.log(`CHILLIN error.stack:`, error.stack);
  }
  try {
    require("./signs.js")(plugin, extra);
  } catch (error) {
    console.log(`SIGNS error.stack:`, error.stack);
  }

  let VISIBLE_COLORS = [
    ChatColor.GREEN,
    ChatColor.AQUA,
    ChatColor.RED,
    ChatColor.LIGHT_PURPLE,
    ChatColor.YELLOW,
    ChatColor.DARK_GREEN,
    ChatColor.DARK_AQUA,
    ChatColor.DARK_RED,
    ChatColor.DARK_PURPLE,
    ChatColor.GOLD,
    ChatColor.BLUE,
  ];
  let player_color = function (player) {
    // let number = _.sum(
    //   player
    //     .getName()
    //     .split("")
    //     .map(x => x.charCodeAt(0))
    // );
    let number = Math.abs(player.getUniqueId().getLeastSignificantBits());
    console.log(`number:`, number);
    return VISIBLE_COLORS[number % VISIBLE_COLORS.length];
  };

  try {
    plugin.command("me", {
      onCommand: (sender, command, alias, args) => {
        let message = args.join(" ");
        let colored_message = ChatColor.translateAlternateColorCodes(
          "&",
          message
        );

        chat.broadcast(
          server,
          chat.italic.gray`* ${sender.getDisplayName()} ${colored_message}`
        );
      },
    });
  } catch (err) {}

  plugin.events.PlayerJoin((event) => {
    let player = event.getPlayer();
    player.setDisplayName(
      player_color(player) +
        ChatColor.translateAlternateColorCodes("&", player.getDisplayName())
    );
    player.setPlayerListName(player.getDisplayName());
    event.setJoinMessage(
      `${ChatColor.WHITE}> ${player.getDisplayName()} ${ChatColor.RESET}${
        ChatColor.WHITE
      }joined the server`
    );
  });

  plugin.events.PlayerQuit((event) => {
    let player = event.getPlayer();
    event.setQuitMessage(
      `${ChatColor.WHITE}> ${player.getDisplayName()} ${ChatColor.RESET}${
        ChatColor.WHITE
      } left :(`
    );
  });

  plugin.events.PlayerChat((event) => {
    event.setMessage(event.getMessage());
    let message = ChatColor.translateAlternateColorCodes(
      "&",
      event.getMessage()
    );
    event.setFormat(
      `${event.getPlayer().getDisplayName()}: ${ChatColor.RESET}${
        ChatColor.WHITE
      }${message}`
    );
  });
});

module.exports = plugin.getBridge();
