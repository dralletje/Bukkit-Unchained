let ChatColor = Java.type('org.bukkit.ChatColor');

let command_success = (command, message) => {
  return `${ChatColor.DARK_GREEN}${command}: ${ChatColor.RESET}${ChatColor.GRAY}${message}`;
};
let command_info = (command, message) => {
  return `${ChatColor.AQUA}${command}: ${ChatColor.RESET}${ChatColor.GRAY}${message}`;
};
let command_error = (command, message) => {
  return `${ChatColor.RED}${command}: ${ChatColor.RESET}${ChatColor.GRAY}${message}`;
};

let TeleportCause = Java.type('org.bukkit.event.player.PlayerTeleportEvent.TeleportCause');

module.exports = (plugin) => {
  let autocomplete_players = (sender, command, alias, args) => {
    let value = args[0];
    let players = plugin.java.getServer().getOnlinePlayers();
    // TODO fuzzy filter by player name
    return Java.from(players).map(x => x.getName())
  }

  plugin.command("killanimals", {
    onCommand: (sender, command, alias) => {
      sender.chat('/minecraft:kill @e[distance=1..10]')
      sender.sendMessage(command_success('/killanimals'), )
    },
  });

  // TODO Add custom seconds/minutes argument
  plugin.command("undo", {
    onCommand: (sender, command, alias) => {
      sender.chat(`/coreprotect:co rollback time: 30s radius: 9 user: ${sender.getName()}`)
    },
  });

  plugin.command("redo", {
    onCommand: (sender, command, alias) => {
      sender.chat(`/coreprotect:co restore time: 60s radius: 9 user: ${sender.getName()}`);
    },
  });

  let parse_time_format = (time_string) => {
    let format_match = time_string.match(/^(\d+):(\d+)$/)
    if (format_match) {
      let hours = Number(format_match[1]);
      let minutes = Number(format_match[2]);
      let ticks = ((hours * 1000 + minutes * 17) + 18000) % 24000;
      return ticks;
    } else {
      return null
    }
  }
  let times = {
    day: parse_time_format('09:00'),
    midnight: parse_time_format('00:00'),
    night: parse_time_format('21:00'),
    noon: parse_time_format('16:00'),
    dawn: parse_time_format('05:00'),
    dusk: parse_time_format('19:00'),
  }
  let time_to_string = (ticks) => {
    ticks = (ticks + 6000) % 24000;
    let hour = String(Math.floor(ticks / 1000))
    let minute = String(Math.floor((ticks % 1000) / 17))
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
  }
  let parse_time = (time_string) => {
    if (times[time_string]) {
      return times[time_string];
    }
    let ticks = parse_time_format(time_string);
    if (ticks != null) {
      return ticks
    } else {
      return Number(time_string);
    }
  }
  plugin.command("time", {
    onCommand: (sender, command, alias, [time]) => {
      let info = (message) => command_info('/time', message);
      let success = (message) => command_success('/time', message);

      if (!time) {
        if (sender.isPlayerTimeRelative()) {
          sender.sendMessage(info(`The current server time is ${ChatColor.WHITE}${time_to_string(sender.getPlayerTime())}`));
        } else {
          sender.sendMessage(info(`The your current time is ${time_to_string(sender.getPlayerTime())}`));
        }
        return
      }

      if (time === 'reset') {
        sender.resetPlayerTime();
        sender.sendMessage(success(`Your time is in sync with the server again`));
        return;
      }

      let ticks = parse_time(time)
      sender.setPlayerTime(ticks, false);
      sender.sendMessage(success(`Set your personal time to ${ChatColor.WHITE}${time_to_string(ticks)}`));
    },
    onTabComplete: (sender, command, alias, args) => {
      if (args.length !== 1) {
        return []
      };

      let value = args[0].toLowerCase();

      // TODO fuzzy filter by player name
      return ['reset', ...Object.keys(times)].filter(x => x.startsWith(value))
    }
  })

  let WeakIdentityHashMap = Java_type("eu.dral.unchained.WeakIdentityHashMap");
  let last_locations = new WeakIdentityHashMap();
  let BACK_CAUSES = [TeleportCause.COMMAND, TeleportCause.SPECTATE, TeleportCause.UNKNOWN]
  plugin.events.PlayerTeleport(event => {
    let cause = event.getCause();
    if (BACK_CAUSES.includes(cause)) {
      let locations = last_locations.get(event.getPlayer()) || [];
      last_locations.put(event.getPlayer(), [event.getFrom(), ...locations])
    }
    // if (cause === TeleportCause.PLUGIN) {
    //   console.log('Teleport caused by plugin');
    // }
  });
  plugin.events.PlayerRespawn(event => {
    let player = event.getPlayer();
    let locations = last_locations.get(player) || [];
    last_locations.put(player, [player.getLocation(), ...locations])
  })

  // let tp_command = {
  //   onTabComplete: autocomplete_players,
  //   onCommand: (sender, command, alias, [to_player]) => {
  //     console.log(`alias:`, alias)
  //     sender.chat('/coreprotect:co restore time: 10s radius: 9 user: @p')
  //   },
  // }
  // plugin.command("tp", tp_command);
  // plugin.command("teleport", tp_command);
  plugin.command("back", {
    onCommand: (sender, command, alias, [times = 1]) => {
      let [last_location, ...locations] = (last_locations.get(sender) || []).slice(times - 1);
      if (last_location) {
        sender.teleport(last_location, TeleportCause.PLUGIN);
        last_locations.put(sender, locations);
        sender.sendMessage(command_success('/back', `Aaaand we're back`));
      } else {
        sender.sendMessage(command_error('/back', `No previous teleport location found`));
      }
    }
  })

  plugin.command("spectate", {
    onCommand: (sender, command, alias, [person_to_spectate]) => {
      if (!person_to_spectate) {
        sender.chat('/minecraft:gamemode creative');
      } else {
        sender.chat(`/minecraft:gamemode spectator`);
        sender.chat(`/minecraft:spectate ${person_to_spectate}`);
      }
    },
    onTabComplete: autocomplete_players,
  });
  plugin.events.PlayerToggleSneak((event) => {
    if (event.getPlayer().getSpectatorTarget()) {
      event.getPlayer().chat('/minecraft:gamemode creative');
    }
  })
}
