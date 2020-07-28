let fs = require("fs");
let _ = require("lodash");

let { chat } = require("./chat.js");

let Location = Java.type("org.bukkit.Location");
let ChatColor = Java.type("org.bukkit.ChatColor");
let TeleportCause = Java.type(
  "org.bukkit.event.player.PlayerTeleportEvent.TeleportCause"
);

module.exports = (plugin, { defineCommand }) => {
  let warps = {};

  try {
    warps = JSON.parse(fs.readFileSync("./warps.json").toString());
    // Fix for before when I had no title and case-sensitive keys
    warps = Object.fromEntries(
      Object.entries(warps).map(([key, value]) => [
        key.toLowerCase(),
        {
          title: key,
          ...value
        }
      ])
    );
  } catch (error) {
    console.log(`Loading wraps error:`, error);
  }

  defineCommand("setwarp", {
    onCommand: ({
      sender,
      args: [warp_title],
      reply_success,
      UserError,
      broadcast_action
    }) => {
      if (warp_title == null) {
        throw new UserError("Specificy a warp name to set");
      }

      let warp_name = warp_title.toLowerCase();
      if (warps[warp_name]) {
        if (
          warps[warp_name].player.toLowerCase() !==
          sender.getName().toLowerCase()
        ) {
          throw new UserError(
            `Warp already owned by ${warps[warp_name].player}`
          );
        }
      }

      warps[warp_name] = {
        title: warp_title,
        player: sender.getName().toLowerCase(),
        x: sender.getLocation().getX(),
        y: sender.getLocation().getY(),
        z: sender.getLocation().getZ(),
        yaw: sender.getLocation().getYaw(),
        pitch: sender.getLocation().getPitch()
      };

      fs.writeFileSync("./warps.json", JSON.stringify(warps));

      broadcast_action(chat`created warp ${chat.white(warp_title)}`);
    },
    onTabComplete: (sender, command, alias, args) => {
      // let result = onTabComplete(plugin, sender, args);
      return [];
    }
  });

  defineCommand("removewarp", {
    onCommand: ({ sender, args: [warp_name], UserError, reply_success }) => {
      if (warp_name == null) {
        throw new UserError("Specificy a warp name to remove");
      }

      let warp = warps[warp_name.toLowerCase()];
      if (!warp) {
        throw new UserError(`No warp found :(`);
      }
      if (warp.player.toLowerCase() !== sender.getName().toLowerCase()) {
        throw new UserError(`Warp is owned by ${warps[warp_name].player}`);
      }

      delete warps[warp_name.toLowerCase()];

      fs.writeFileSync("./warps.json", JSON.stringify(warps));

      reply_success(`${sender.getName()} removed warp "${warp.title}"!`);
    },
    onTabComplete: (sender, command, alias, args) => {
      let text = args[0];
      return Object.keys(warps).filter(x =>
        x.toLowerCase().startsWith(text.toLowerCase())
      );
    }
  });

  defineCommand("warp", {
    onCommand: ({
      sender,
      args: [warp_name],
      UserError,
      reply_success,
      broadcast_action
    }) => {
      if (warp_name == null) {
        throw new UserError("Specificy a warp name to warp to");
      }

      let warp = warps[warp_name.toLowerCase()];
      if (!warp) {
        throw new UserError(`No warp found :(`);
      }

      warp.warped_count = (warp.warped_count || 0) + 1;
      fs.writeFileSync("./warps.json", JSON.stringify(warps));

      let location = new Location(
        sender.getWorld(),
        warp.x,
        warp.y,
        warp.z,
        warp.yaw,
        warp.pitch
      );
      sender.teleport(location, TeleportCause.COMMAND);

      reply_success(`Warped to "${warp.title}"`);
      broadcast_action(`warped to "${warp.title}"!`);
    },
    onTabComplete: (sender, command, alias, args) => {
      let text = args[0];

      // Turns out sorting is ignored by spigot/minecraft client
      return _.sortBy(Object.values(warps), warp => -warp.warped_count || 0)
        .map(x => x.title)
        .filter(x => x.toLowerCase().startsWith(text.toLowerCase()))
        .map(x => `${text}${x.slice(text.length)}`);
    }
  });
};
