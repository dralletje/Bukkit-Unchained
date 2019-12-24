// import { debounce } from "lodash";

import Packet from "bukkit/Packet";

let ChatColor = Java.type("org.bukkit.ChatColor");

export let create_isolated_commands = ({ plugin, adapt }) => {
  let commands_map = new Map();

  let default_command_handler = null;

  class PlayerMistakeError extends Error {}
  class InvalidArgumentsError extends PlayerMistakeError {}
  class NotAllowedError extends PlayerMistakeError {}

  // TODO Replace with adapted events
  plugin.events.PlayerCommandPreprocess(java_event => {
    let event = null;
    try {
      event = adapt.from_java(java_event);
    } catch {
      return;
    }

    let player = event.getPlayer();
    let message = event.getMessage();

    if (message.startsWith("/")) {
      message = message.slice(1);
    }

    event.setCancelled(true);

    let [command, ...args] = message.split(" ");

    if (command === "" || command === "help") {
      // Show help?
      player.sendMessage(`${ChatColor.LIGHT_BLUE}Soon this will show help`);
      return;
    }

    if (command === "leave") {
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

    try {
      // TODO Restrict usage of setCancelled false to builder plugin
      // TODO Make this show errors for async events too
      onCommand(player, args, command, () => event.setCancelled(false));
    } catch (err) {
      if (err instanceof PlayerMistakeError) {
        console.log(`${ChatColor.RED}${err.message}`);
      } else {
        throw err;
      }
    }
  });

  Packet.addIncomingPacketListener(Packet.fromClient.TAB_COMPLETE, event => {
    let player = event.getPlayer();
    let {
      params: { transactionId, text }
    } = event.getData();
    let [command, ..._args] = text.slice(1).split(" ");

    if (!commands_map.has(command)) {
      return;
    }

    let command_description = commands_map.get(command);
    let last_arg = _args.slice(-1)[0];
    let args = _args.slice(0, -1);

    let start = `/${command} ${args.join(" ")}${args.length === 0 ? "" : " "}`
      .length;

    let matches = command_description.onTabComplete(player, command, _args);

    console.log(`${ChatColor.BLUE}Sending packet...`);
    let label = `${ChatColor.GREEN}Sent packet`;
    console.time(label);

    event.setCancelled(true);
    Packet.send_packet(player, {
      name: "tab_complete",
      params: {
        transactionId: transactionId,
        start: start,
        length: last_arg.length,
        matches: matches.map(match => {
          if (typeof match === "string") {
            return {
              match: match
              // tooltip: '{"text": "foo"}',
            };
          } else {
            return { match: "ERROR" };
          }
        })
      }
    });
    console.timeEnd(label);
  });

  return {
    PlayerMistakeError: PlayerMistakeError,
    NotAllowedError: NotAllowedError,
    InvalidArgumentsError: InvalidArgumentsError,

    handleDefault: handler => {
      if (default_command_handler != null) {
        throw new Error(`Already a default command handler set`);
      }
      default_command_handler = handler;
    },
    registerCommand: ({
      name,
      format = `/${name}`,
      description,
      onCommand,
      onTabComplete = () => [],
      arguments: command_arguments
    }) => {
      if (commands_map.get(name)) {
        console.log(`Overwriting existing '${name}' command`);
      }

      commands_map.set(name, {
        name: name,
        format: format,
        description: description,
        onCommand: onCommand,
        onTabComplete: onTabComplete,
        arguments: command_arguments
      });

      // refresh_command_map();
    },
    activateFor: player => {
      console.log(`activeFor player.getName():`, player.getName());
      let GREEDY_ASK = {
        children: [],
        flags: {
          command_node_type: 2,
          has_command: 1,
          has_custom_suggestions: 1
        },
        extraNodeData: {
          name: "anything, really",
          parser: "brigadier:string",
          properties: 2,
          suggests: "minecraft:ask_server"
        }
      };

      let children_from_command_arguments = ([arg, ...args]) => {
        if (arg == null) {
          return [];
        }

        return [
          {
            flags: {
              command_node_type: 2,
              has_command: args.length === 0 ? 1 : 0
              // has_custom_suggestions: 1
            },
            extraNodeData: {
              name: arg.name || "argument",
              parser: arg.parser,
              properties: 2
              // suggests: "minecraft:ask_server"
            },
            children: children_from_command_arguments(args)
          }
        ];
      };

      // TODO Write brigadier library (I know one exists but I feel like I can do better)
      let command_nodes = Array.from(commands_map.values()).map(command => {
        if (command.arguments == null) {
          return {
            flags: {
              command_node_type: 1
            },
            extraNodeData: command.name,
            children: [GREEDY_ASK]
          };
        }

        return {
          flags: {
            command_node_type: 1
          },
          extraNodeData: command.name,
          children: children_from_command_arguments(command.arguments)
        };
      });

      Packet.send_packet(player, {
        name: "declare_commands",
        params: to_nodes(command_nodes)
      });
    }
  };
};

let to_nodes = children => {
  let MUTABLE_NODES = [];
  let MUTABLE_NODES_MAPPING = new Map();

  let add_node = node => {
    if (MUTABLE_NODES_MAPPING.has(node)) {
      return MUTABLE_NODES_MAPPING.get(node);
    }

    // Make sure we set the mapping first, to prevent any infinite recursion
    let index = MUTABLE_NODES.length;
    MUTABLE_NODES_MAPPING.set(node, index);

    let node_clone = { ...node };
    MUTABLE_NODES.push(node_clone);
    node_clone.children =
      node_clone.children && node_clone.children.map(add_node);
    return index;
  };

  let rootIndex = add_node({
    flags: {
      command_node_type: 0
    },
    children: children
  });
  return { rootIndex, nodes: MUTABLE_NODES };
};
