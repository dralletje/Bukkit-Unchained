import { create_isolated_commands } from "../isolated/commands.js";
import { create_isolated_events } from "../isolated/events.js";
import { make_adapters } from "../isolated/primitives.js";

import Packet from 'bukkit/Packet';

export let create_build_plugin = ({
  plugin,
  filters,
  buildconfig,
  plot_config,
}) => {
  let adapt = make_adapters(filters);
  let commands = create_isolated_commands({ plugin, adapt });
  let events = create_isolated_events({ plugin, adapt });

  let Material = adapt.get_class("org.bukkit.Material");
  let BlockAction = adapt.get_class("org.bukkit.event.block.Action");
  let ChatColor = Java.type("org.bukkit.ChatColor");

  let CHUNK = 16;
  let plot_boundaries = {
    x: {
      min: plot_config.plot_x * CHUNK * 5 + CHUNK - 1,
      max: (plot_config.plot_x + 1) * CHUNK * 5
    },
    z: {
      min: plot_config.plot_z * CHUNK * 5 + CHUNK - 1,
      max: (plot_config.plot_z + 1) * CHUNK * 5
    }
  };

  let worldedit = require('./worldedit.js')({ plugin, commands, adapt, plot_boundaries, events })
  require('./util-commands.js')({ plugin, adapt, commands });

  commands.registerCommand({
    name: "set",
    onCommand: (player, args) => {
      let key = args[0];
      try {
        let value = buildconfig.set_from_player(key, player);
        // prettier-ignore
        player.sendMessage(`${ChatColor.GREEN}Set '${key}' to value`);
        // prettier-ignore
        player.sendMessage(`${ChatColor.DARK_GREEN}${JSON.stringify(value)}`);
      } catch (error) {
        // prettier-ignore
        player.sendMessage(`${ChatColor.RED}Couldn't set '${key}', because:`);
        // prettier-ignore
        player.sendMessage(`${ChatColor.DARK_RED}${error.message}`);
      }
    },
    onTabComplete: (player, alias, args) => {
      let result = buildconfig.get_build_keys();
      let text = args[0];

      return result.map(x => x.name).filter(x => x.startsWith(text));
    }
  });

  commands.handleDefault((event, player) => {
    let message = event.getMessage();

    if (message.startsWith('/leave')) {
      event.setCancelled(false);
      return;
    }

    if (message.startsWith('//')) {
      // ensure_worldedit_region_for_player(player);
      // event.setCancelled(false);
    }
  });

  let interaction_events = [
    "BlockPlace",
    "PlayerBucketEmpty",
    "PlayerInteract",
    "PlayerBucketFill",
    "HangingBreak",
    "HangingPlace",
    // 'InventoryOpen',
    "PlayerDropItem",
    "PlayerPickupItem"
  ];
  for (let event of interaction_events) {
    let event_name = `on${event}`;
    events[event_name](
      event => {
        event.setCancelled(false);
      },
      { priority: "LOW" }
    );
  }

  events.onBlockBreak(event => {
    if (event.getPlayer().getItemInHand().getType() === Material.DEBUG_STICK) {
      event.setCancelled(true);
      return;
    }
    event.setCancelled(false);
  }, { priority: "LOW" })

  return {
    apply_to: player => {
      try {
        console.log(`Apply to builder player.getName():`, player.getName());
        worldedit.activateFor(player)
        commands.activateFor(player);
        console.log('Applied');
      } catch (error) {
        console.log(`apply_to error:`, error)
      }
    }
  };
};
