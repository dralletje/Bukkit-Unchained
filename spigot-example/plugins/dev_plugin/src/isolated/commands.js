import { debounce } from 'lodash';

let ChatColor = Java.type('org.bukkit.ChatColor');

export let create_isolated_commands = ({ plugin, active_session, adapt }) => {
  let commands_map = new Map();

  let default_command_handler = null;

  plugin.events.PlayerCommandPreprocess((java_event) => {
    let event = null;
    try {
      event = adapt.from_java(java_event);
    } catch {
      return;
    }

    let player = event.getPlayer();
    let message = event.getMessage();

    if (message.startsWith('/')) {
      message = message.slice(1);
    }

    event.setCancelled(true);

    player.sendMessage(`${ChatColor.GRAY}/${message}`);
    let [command, ...args] = message.split(' ');

    if (command === '' || command === 'help') {
      // Show help?
      player.sendMessage(`${ChatColor.LIGHT_BLUE}Soon this will show help`);
      return;
    }

    if (!commands_map.has(command)) {
      if (default_command_handler) {
        default_command_handler(event, player, args, command);
      } else {
        player.sendMessage(`${ChatColor.RED}Command not found :(`);
      }
      return;
    }

    let { onCommand } = commands_map.get(command);
    onCommand(player, args, command);
  });

  plugin.events.TabComplete(() => {
    // console.log('Tab complete');
  });

  let refresh_command_map = debounce(() => {
    // Send commands with packet
  });

  return {
    handleDefault: (handler) => {
      if (default_command_handler != null) {
        throw new Error(`Already a default command handler set`);
      }
      default_command_handler = handler;
    },
    registerCommand: ({ name, format = `/${name}`, description, onCommand, onTabComplete = () => [] }) => {
      if (commands_map.get(name)) {
        console.log(`Overwriting existing '${name}' command`);
      }

      commands_map.set(name, {
        name: name,
        format: format,
        description: description,
        onCommand: onCommand,
        onTabComplete: onTabComplete,
      });

      // refresh_command_map();
    },
    activateFor: (player) => {
      // Send commands with packet
    },
  };
}
