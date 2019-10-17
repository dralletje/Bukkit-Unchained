import { debounce } from 'lodash';

import Packet from '../Packet.js';

let ChatColor = Java.type('org.bukkit.ChatColor');

export let create_isolated_commands = ({ plugin, adapt }) => {
  let commands_map = new Map();

  let default_command_handler = null;

  // TODO Replace with adapted events
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

    let [command, ...args] = message.split(' ');

    if (command === '' || command === 'help') {
      // Show help?
      player.sendMessage(`${ChatColor.LIGHT_BLUE}Soon this will show help`);
      return;
    }

    if (command === 'leave') {

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

  Packet.addIncomingPacketListener(Packet.fromClient.TAB_COMPLETE, (event) => {
    let player = event.getPlayer();
    let { params: { transactionId, text } } = event.getData();
    let [command, ..._args] = text.slice(1).split(' ');

    if (!commands_map.has(command)) {
      return;
    }

    let command_description = commands_map.get(command);
    let last_arg = _args.slice(-1)[0];
    let args = _args.slice(0, -1);

    let start = `/${command} ${args.join(' ')}${args.length === 0 ? '' : ' '}`.length;

    let matches = command_description.onTabComplete(player, command, _args);

    console.log(`${ChatColor.BLUE}Sending packet...`);
    let label = `${ChatColor.GREEN}Sent packet`;
    console.time(label);

    event.setCancelled(true);
    Packet.send_packet(player, {
      name: 'tab_complete',
      params: {
        transactionId: transactionId,
        start: start,
        length: last_arg.length,
        matches: matches.map(match => {
          if (typeof match === 'string') {
            return {
              match: match,
              // tooltip: '{"text": "foo"}',
            }
          } else {
            return { match: 'ERROR' };
          }
        }),
      },
    });
    console.timeEnd(label);
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
      // TODO Write brigadier library (I know one exists but I feel like I can do better)
      let command_nodes = Array.from(commands_map.values()).map(command => {
        return {
          flags: {
            command_node_type: 1,
          },
          extraNodeData: command.name,
          children: [1],
        };
      })
      Packet.send_packet(player, {
        name: "declare_commands",
        params: {
            rootIndex: 0,
            nodes: [
              // ROOT NODE
              {
                flags: {
                  command_node_type: 0,
                },
                children: command_nodes.map((x, index) => index + 2),
              },
              // GREEDY ASK SERVER
              {
                children: [],
                flags: {
                    command_node_type: 2,
                    has_command: 1,
                    has_custom_suggestions: 1,
                },
                extraNodeData: {
                    name: 'thing',
                    parser: 'brigadier:string',
                    properties: 2,
                    suggests: 'minecraft:ask_server',
                },
              },
              ...command_nodes,
        ]}
      });
    },
  };
}
