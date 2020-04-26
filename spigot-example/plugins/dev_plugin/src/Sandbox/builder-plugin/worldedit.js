let SkPlayer = Java_type("com.sk89q.worldedit.bukkit.BukkitPlayer");
let worldedit_session_for_player = player => {
  return Java_type("com.sk89q.worldedit.WorldEdit")
    .static.getInstance()
    .getSessionManager()
    .get(new SkPlayer(player));
};

let ensure_worldedit_region_for_player = (player, plot_boundaries) => {
  // set global mask
  let RegionMask = Java_type("com.sk89q.worldedit.function.mask.RegionMask");
  let CuboidRegion = Java_type("com.sk89q.worldedit.regions.CuboidRegion");

  let session = worldedit_session_for_player(player);

  // NOTE Cool idea, doesn't work with FAWE asyncness though
  // let AbstractMask = Java_type('com.sk89q.worldedit.function.mask.AbstractMask');
  // let MyMask = Java.extend(AbstractMask, {
  //   test: filters.location,
  // })
  // session.setMask(new MyMask())

  session.setMask(
    new RegionMask(
      new CuboidRegion(
        BlockVector3.static.at(plot_boundaries.x.min, 0, plot_boundaries.z.min),
        BlockVector3.static.at(
          plot_boundaries.x.max,
          255,
          plot_boundaries.z.max
        )
      )
    )
  );
  // console.log(`event:`, event)
  // console.log(`event.setCancelled:`, event.setCancelled)
};

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

module.exports = ({ commands, plot_boundaries, events, adapt }) => {
  let Material = adapt.get_class("org.bukkit.Material");
  let BlockAction = adapt.get_class("org.bukkit.event.block.Action");
  let ChatColor = Java.type("org.bukkit.ChatColor");

  let register_worldedit_command = (name, args) => {
    commands.registerCommand({
      name: name,
      onCommand: (player, _2, _3, perform_default) => {
        ensure_worldedit_region_for_player(
          adapt.to_java(player),
          plot_boundaries
        );
        perform_default();
      },
      arguments: args
    });
  };

  register_worldedit_command("/set", [{ parser: "minecraft:block_predicate" }]);
  register_worldedit_command("/replace", [
    { parser: "minecraft:block_predicate" },
    { parser: "minecraft:block_predicate" }
  ]);
  register_worldedit_command("/undo", []);
  register_worldedit_command("/brush", []);
  register_worldedit_command("/expand", [{ parser: "brigadier:integer", min: 0 }]);
  register_worldedit_command("/contract", [{ parser: "brigadier:integer", min: 0 }]);
  register_worldedit_command("/copy", []);
  register_worldedit_command("/paste", []);
  register_worldedit_command("forestgen");
  register_worldedit_command("tree");
  register_worldedit_command("green");
  register_worldedit_command("mask");

  events.onPlayerInteract(event => {
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
      player.sendMessage(
        `${ChatColor.GREEN}Selected ${position_string} ${ChatColor.GREEN}position for worldedit region`
      );
    }
  });

  return {
    activateFor: player => {
      ensure_worldedit_region_for_player(
        player,
        plot_boundaries
      );
    }
  };
};
