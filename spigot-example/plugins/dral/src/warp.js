let fs = require('fs')

let Location = Java.type('org.bukkit.Location');
let ChatColor = Java.type('org.bukkit.ChatColor');

let command_error = (command, error) => {
  return `${ChatColor.BOLD}${ChatColor.RED}${command}: ${ChatColor.RESET}${ChatColor.RED}${error}`;
}
let command_success = (command, message) => {
  return `${ChatColor.BOLD}${ChatColor.GREEN}${command}: ${ChatColor.RESET}${ChatColor.GREEN}${message}`;
}

module.exports = (plugin) => {
  let warps = {};

  try {
    warps = JSON.stringify(fs.readFileSync('./warps.json').toString());
  } catch (error) {
    console.log(`Loading wraps error:`, error);
  }

  plugin.command('setwarp', {
    onCommand: (sender, command, alias, [warp_name]) => {
      if (warps[warp_name]) {
        if (warps[warp_name].player.toLowerCase() !== sender.getName().toLowerCase()) {
          sender.sendMessage(command_error('/setwarp', `Warp already owned by ${warps[warp_name].player}`))
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

      fs.writeFileSync('./warps.json', JSON.stringify(warps));

      sender.sendMessage(command_success('/setwarp', `Warp "${warp_name}" set!`))
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
        sender.sendMessage(command_error('/warp', `No warp found :(`));
        return
      }

      let location = new Location(sender.getWorld(), warp.x, warp.y, warp.z, warp.yaw, warp.pitch)
      sender.teleport(location)
      sender.sendMessage(command_success('/warp', `Warped to "${warp_name}"!`))
    },
    onTabComplete: (sender, command, alias, args) => {
      // let result = onTabComplete(plugin, sender, args);
      return Object.keys(warps);
    },
  });
}
