let fs = require('fs')

let Location = Java.type('org.bukkit.Location');

module.exports = (plugin) => {
  let warps = {}

  plugin.command('setwarp', {
    onCommand: (sender, command, alias, [warp_name]) => {
      if (warps[warp_name]) {
        if (warps[warp_name].player.toLowerCase() !== sender.getName().toLowerCase()) {
          sender.sendMessage(`Warp already owned by ${warps[warp_name].player}`)
          return;
        }
      }

      warps[warp_name] = {
        player: sender.getName().toLowerCase(),
        x: sender.getLocation().getX(),
        y: sender.getLocation().getY(),
        z: sender.getLocation().getZ(),
        yaw: sender.getLocation().getYaw(),
        pitch: sender.getLocation().getPitch(),
      }
    },
    onTabComplete: (sender, command, alias, args) => {
      // let result = onTabComplete(plugin, sender, args);
      return [];
    },
  });

  plugin.command('warp', {
    onCommand: (sender, command, alias, [warp_name]) => {
      let warp = warps[warp_name];
      if (!warp) {
        sender.sendMessage(`No warp found :(`);
      }

      let location = new Location(sender.getWorld(), warp.x, warp.y, warp.z, warp.yaw, warp.pitch)
      sender.teleport(location)
    },
    onTabComplete: (sender, command, alias, args) => {
      // let result = onTabComplete(plugin, sender, args);
      return Object.keys(warps);
    },
  });
}
