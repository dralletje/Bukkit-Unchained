import {
  command_info,
  chat
} from "./chat.js";

let ChatColor = Java.type("org.bukkit.ChatColor");

export let SpectatePlugin = (plugin, { defineCommand }) => {
  let autocomplete_players = (sender, command, alias, args) => {
    let value = args[0].toLowerCase();
    let players = plugin.java.getServer().getOnlinePlayers();
    // TODO fuzzy filter by player name
    return Java.from(players)
      .map(x => x.getName())
      .filter(x => x.toLowerCase().startsWith(value));
  };

  defineCommand("reop", {
    onCommand: ({ sender, reply_success }) => {
      sender.setOp(false);
      setTimeout(() => {
        sender.setOp(true);
      }, 200);
      reply_success("Toggled you back to OP!");
    }
  });

  // TODO Add custom seconds/minutes argument
  defineCommand("undo", {
    onCommand: ({ sender, reply_success }) => {
      sender.chat(
        `/coreprotect:co rollback time: 30s radius: 9 user: ${sender.getName()}`
      );
      reply_success("Undid your changes!");
    }
  });

  defineCommand("redo", {
    onCommand: ({ sender, reply_success }) => {
      sender.chat(
        `/coreprotect:co restore time: 60s radius: 9 user: ${sender.getName()}`
      );
      reply_success("Redid your changes!");
    }
  });

  let parse_time_format = time_string => {
    let format_match = time_string.match(/^(\d+):(\d+)$/);
    if (format_match) {
      let hours = Number(format_match[1]);
      let minutes = Number(format_match[2]);
      let ticks = (hours * 1000 + minutes * 17 + 18000) % 24000;
      return ticks;
    } else {
      return null;
    }
  };
  let times = {
    day: parse_time_format("09:00"),
    midnight: parse_time_format("00:00"),
    night: parse_time_format("21:00"),
    noon: parse_time_format("16:00"),
    dawn: parse_time_format("05:00"),
    dusk: parse_time_format("19:00")
  };
  let time_to_string = ticks => {
    ticks = (ticks + 6000) % 24000;
    let hour = String(Math.floor(ticks / 1000));
    let minute = String(Math.floor((ticks % 1000) / 17));
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  };
  let parse_time = time_string => {
    if (times[time_string]) {
      return times[time_string];
    }
    let ticks = parse_time_format(time_string);
    if (ticks != null) {
      return ticks;
    } else {
      return Number(time_string);
    }
  };
  defineCommand("time", {
    onCommand: ({
      sender,
      args: [time],
      reply_info,
      reply_success,
      UserError,
      broadcast_action
    }) => {
      if (!time) {
        if (sender.isPlayerTimeRelative()) {
          reply_info(
            `The current server time is ${ChatColor.WHITE}${time_to_string(
              sender.getPlayerTime()
            )}`
          );
        } else {
          reply_info(
            `The your current time is ${time_to_string(sender.getPlayerTime())}`
          );
        }
        return;
      }

      if (time === "reset") {
        sender.resetPlayerTime();
        reply_success(`Your time is in sync with the server again`);
        broadcast_action(`aligned their time with the server time`);
        return;
      }

      let ticks = parse_time(time);
      sender.setPlayerTime(ticks, false);
      reply_success(
        `Set your personal time to ${ChatColor.WHITE}${time_to_string(ticks)}`
      );
      broadcast_action(
        `set their personal time to ${ChatColor.WHITE}${time_to_string(ticks)}`
      );
    },
    onTabComplete: (sender, command, alias, args) => {
      if (args.length !== 1) {
        return [];
      }

      let value = args[0].toLowerCase();

      // TODO fuzzy filter by player name
      return ["reset", ...Object.keys(times)].filter(x => x.startsWith(value));
    }
  });

  let GameMode = Java.type("org.bukkit.GameMode");
  defineCommand("spectate", {
    onCommand: ({ sender, args: [person_to_spectate], broadcast_action }) => {
      if (!person_to_spectate) {
        sender.setGameMode(GameMode.SPECTATOR);
      } else {
        let other_player = plugin.java
          .getServer()
          .getPlayer(person_to_spectate);
        sender.setGameMode(GameMode.SPECTATOR);
        sender.setSpectatorTarget(other_player);
        broadcast_action(`is now spectating ${other_player.getDisplayName()}`);
      }
    },
    onTabComplete: autocomplete_players
  });
  plugin.events.PlayerToggleSneak(event => {
    if (event.getPlayer().getSpectatorTarget()) {
      event.getPlayer().setGameMode(GameMode.CREATIVE);
    }
  });

  plugin.events.PlayerCommandPreprocess(async event => {
    let player = event.getPlayer();

    let spectators = Java.from(plugin.java.getServer().getOnlinePlayers());
    // prettier-ignore
    let message = `${player.getDisplayName()} ${ChatColor.GRAY}used ${ChatColor.WHITE}${event.getMessage()}`;
    for (let spectator of spectators) {
      if (spectator.getSpectatorTarget() === player) {
        chat.send_message(spectator, command_info("/spectate", message));
      }
    }
  });
};
