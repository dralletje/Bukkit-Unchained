import { create_isolated_commands } from "./isolated/commands.js";
import { create_isolated_events } from "./isolated/events.js";
import { make_adapters } from "./isolated/primitives.js";

let SkPlayer = Java_type("com.sk89q.worldedit.bukkit.BukkitPlayer");
let worldedit_session_for_player = player => {
  return Java_type("com.sk89q.worldedit.WorldEdit")
    .static.getInstance()
    .getSessionManager()
    .get(new SkPlayer(player));
};

export let create_build_plugin = ({
  plugin,
  active_session,
  filters,
  buildconfig,
  plot_config,
}) => {
  let adapt = make_adapters(filters);
  let commands = create_isolated_commands({ plugin, active_session, adapt });
  let events = create_isolated_events({ plugin, active_session, adapt });

  let Material = adapt.get_class("org.bukkit.Material");
  let BlockAction = adapt.get_class("org.bukkit.event.block.Action");
  let ChatColor = Java.type("org.bukkit.ChatColor");

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

    console.log(`message:`, message)
    if (message.startsWith('/leave')) {
      event.setCancelled(false);
      return;
    }

    if (message.startsWith('//')) {
      // set global mask
      let RegionMask = Java_type('com.sk89q.worldedit.function.mask.RegionMask');
      let CuboidRegion = Java_type('com.sk89q.worldedit.regions.CuboidRegion');

      let session = worldedit_session_for_player(adapt.to_java(player));
      let AbstractMask = Java_type('com.sk89q.worldedit.function.mask.AbstractMask');
      let MyMask = Java.extend(AbstractMask, {
        test: filters.location,
      })
      session.setMask(new MyMask())

      // session.setMask(new RegionMask(new CuboidRegion(
      //   BlockVector3.static.at(bounds.x.min, 0, bounds.z.min),
      //   BlockVector3.static.at(bounds.x.max, 255, bounds.z.max)
      // )))
      // console.log(`event:`, event)
      // console.log(`event.setCancelled:`, event.setCancelled)
      event.setCancelled(false);
    }
  });

  let interaction_events = [
    "BlockPlace",
    "BlockBreak",
    "PlayerBucketEmpty",
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

  // prettier-ignore
  let CuboidRegionSelector = Java_type("com.sk89q.worldedit.regions.selector.CuboidRegionSelector");
  // prettier-ignore
  let BlockVector3 = Java_type("com.sk89q.worldedit.math.BlockVector3");

  let set_worldedit_region = (player, primary, block_location) => {
    let sk_player = new SkPlayer(player);
    let session = worldedit_session_for_player(player);
    let selection = session.getRegionSelector(sk_player.getWorld());

    if (!(selection instanceof CuboidRegionSelector)) {
      // If this happens and the selection of the user was not in the same world as the user, his/her
      // selection will be erased by the "getRegionSelector(user.getWorld())" call.
      throw new Error("Only cuboid regions are supported");
    }

    let block_vector = BlockVector3.static.at(
      Math.floor(block_location.getX()),
      Math.floor(block_location.getY()),
      Math.floor(block_location.getZ())
    );

    if (primary) {
      selection.selectPrimary(block_vector, null);
    } else {
      selection.selectSecondary(block_vector, null);
    }
  };

  events.onPlayerInteract(event => {
    event.setCancelled(false);
    let player = event.getPlayer();

    if (
      player.getItemInHand().getType() === Material.WOODEN_AXE &&
      event.getClickedBlock() != null
    ) {
      let primary = event.getAction() === BlockAction.LEFT_CLICK_BLOCK;
      let position_string = primary
        ? `${ChatColor.BLUE}#1`
        : `${ChatColor.DARK_PURPLE}#2`;
      set_worldedit_region(
        adapt.to_java(player),
        primary,
        adapt.to_java(event.getClickedBlock())
      );

      // prettier-ignore
      event.setCancelled(true);
      player.sendMessage(`${ChatColor.GREEN}Selected ${position_string} ${ChatColor.GREEN}position for worldedit region`);
    }
  });

  return {
    apply_to: player => {
      console.log(`Builder player.getName():`, player.getName());
      commands.activateFor(player)
    }
  };
};
