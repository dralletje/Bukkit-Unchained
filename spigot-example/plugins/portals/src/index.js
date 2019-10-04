let { range, sortBy, throttle, random } = require("lodash");
let { ChatColor, Material, BlockFace } = require("bukkit");

let { delay, precondition, queue_function } = require("./util.js");
let Packet = require("./Packet.js");
let { FakePlayer } = require('./EntityComponents.js');

let {
  Plane,
  Face,
  TransformationMatrix,
  JavaVector
} = require("./Geometry.js");
let { Drone } = require("./Drone.js");

let Vector = Java.type("org.bukkit.util.Vector");
let Location = Java.type("org.bukkit.Location");

let Directional = Java.type("org.bukkit.block.data.Directional");
let Rotatable = Java.type("org.bukkit.block.data.Rotatable");
let Bisected = Java.type("org.bukkit.block.data.Bisected");

// Hmmm
// TODO Very hacky thing to make
global.crypto = {
  getRandomValues: buf => {
    // console.log(`buf.length:`, buf.length);
    return buf;
  }
};

let block_middle = location => {
  return location.clone().add(new Vector(0.5, 0.5, 0.5));
};

let get_transformation_matrix_for_portal = (portal) => {
  // Single portal mirror
  if (portal.corner_blocks) {
    portal = {
      from: portal,
      to: reverse_portal(portal),
    };
  }

  let { from, to } = portal;

  let [left, left_top, right_top, right] = from.corner_blocks
    .map(x => x.getLocation())
    .map(x => block_middle(x));

  let [left2, left_top2, right_top2, right2] = to.corner_blocks
    .map(x => x.getLocation())
    .map(x => block_middle(x));

  let transformation_matrix = TransformationMatrix.from_vector_mappings([
    { from: JavaVector.to_js(left), to: JavaVector.to_js(left2) },
    { from: JavaVector.to_js(right), to: JavaVector.to_js(right2) },
    {
      from: JavaVector.to_js(right_top.toVector().add(from.looking_direction)),
      to: JavaVector.to_js(right_top2.toVector().add(to.looking_direction))
    },
    // {
    //   from: JavaVector.to_js(right_top.toVector().add(right_top.toVector().crossProduct(left.toVector()))),
    //   to: JavaVector.to_js(right_top2.toVector().add(right_top2.toVector().crossProduct(left2.toVector())))
    // },
    { from: JavaVector.to_js(left_top), to: JavaVector.to_js(left_top2) }
  ], {
    world: { from: left.getWorld(), to: left2.getWorld() }
  });

  return transformation_matrix;
};

let NINE_SQUARED = 9 ** 2;
let EIGHT_SQUARED = 8 ** 2;

let console_time = (...args) => {
  console.time(...args)
};
let console_timeEnd = (...args) => {
  console.timeEnd(...args)
};

let render_entity_to_player = (player, { key, value }) => {
  let runtime_metadata = player_runtime_metadata(player, "render_entities");
  let instance_storage = {
    get: () => {
      let has_rendered = runtime_metadata.get({ default: {} });
      let instance = has_rendered[key];
      return instance;
    },
    set: (instance) => {
      runtime_metadata.set({
        ...runtime_metadata.get({ default: {} }),
        [key]: instance
      });
    }
  };

  let instance = instance_storage.get();
  let resulting_instance = Reakkit.render_single_instance(instance, value);
  instance_storage.set(resulting_instance)
}

let portal_get_visible_planes = (player, portal) => {
  let { corner_blocks } = portal;

  let [left, left_top, right_top, right] = corner_blocks
    .map(x => x.getLocation())
    .map(x => block_middle(x));

  let left_plane = Plane.from_three_points(
    left_top.toVector(),
    player.getEyeLocation().toVector(),
    left.toVector(),
    { id: 1 }
  );
  let right_plane = Plane.from_three_points(
    right_top.toVector(),
    right.toVector(),
    player.getEyeLocation().toVector(),
    { id: 2 }
  );
  let top_plane = Plane.from_three_points(
    left_top.toVector(),
    right_top.toVector(),
    player.getEyeLocation().toVector(),
    { id: 3 }
  );
  let bottom_plane = Plane.from_three_points(
    left.toVector(),
    player.getEyeLocation().toVector(),
    right.toVector(),
    { id: 4 }
  );

  let planes = [left_plane, right_plane, top_plane, bottom_plane];
  return planes;
}

let render_portal = async (player, location, _portal) => {
  let { from, to } = _portal;

  let { corner_blocks, looking_direction } = from;
  let [left, left_top, right_top, right] = corner_blocks
    .map(x => x.getLocation())
    .map(x => block_middle(x));

  let planes = portal_get_visible_planes(player, from);

  let { player_portal, set_player_portal } = runtime_portal(player, from);

  // Show mirror image
  {
    let location = player.getLocation();
    if (!is_in_same_world(location, left)) {
      return;
    }

    let distance_to_portal = location.distanceSquared(left);
    if (distance_to_portal > 100 ** 2) {
      return;
    }

    let isReal = is_in_front_of_portal(player, from);
    if (isReal === true && player_portal.isReal === true) {
      return;
    }

    let drone = new Drone({
      player: player,
      initial_location: left,
      initial_direction: looking_direction
    });
    await drone.move(1, Drone.FORWARD);
    await drone.move(3, Drone.DOWN);
    await drone.move(8, Drone.LEFT);
    drone.setSpeed(10);

    let transformation_matrix = get_transformation_matrix_for_portal(_portal);
    // console.log("== UPDATING PORTAL ==");

    let portal_center = middle_between_vectors(left, right_top)
      .clone()
      .add(looking_direction.clone().multiply(4));

    // let WALL_MATERIAL = Material.WHITE_WOOL;
    let WALL_MATERIAL = Material.WHITE_STAINED_GLASS;

    let has_become_real = player_portal.isReal === false && isReal === true;

    // console_time("Cuboid chunks");
    let portal_width = left.distance(right);
    let portal_height = right_top.distance(right);

    let locations = player_portal.current_traced_blocks || [];
    if (locations.length === 0) {
      for await (let location of drone.cuboid_fast([
        { right: 8 + portal_width + 8 },
        { forward: 16 },
        { up: 3 + portal_height + 8 }
      ])) {
        let mirrored = transformation_matrix.apply_to_location(location);
        mirrored.setWorld(to.corner_blocks[0].getWorld());

        locations.push({ location, mirrored });

        if (locations.length % 100 === 0) {
          await delay(10);
        }
      }
    }
    // console_timeEnd("Cuboid chunks");

    // console_time("Get blockdatas");
    let block_datas =
      player_portal.block_datas ||
      locations
        .map(({ location, mirrored }) => {
          let distance_to_portal = portal_center.distanceSquared(location);
          if (distance_to_portal > NINE_SQUARED) {
            return null;
          }

          let is_wall =
            EIGHT_SQUARED < distance_to_portal &&
            distance_to_portal <= NINE_SQUARED;

          let block_data = location.getBlock().getBlockData();
          let mirrored_block_data = is_wall
            ? WALL_MATERIAL
            : mirrored.getBlock().getBlockData();

          if (mirrored_block_data instanceof Directional) {
            let current_direction = mirrored_block_data
              .getFacing()
              .getDirection();
            let next_direction = transformation_matrix.apply_to_direction(
              current_direction
            );
            let available_faces = Java.from(
              mirrored_block_data.getFaces().toArray()
            );
            let next_face = Face.get_closest_face_for_vector(
              next_direction,
              available_faces
            );
            mirrored_block_data.setFacing(next_face);
          }

          if (mirrored_block_data instanceof Rotatable) {
            let current_direction = mirrored_block_data
              .getRotation()
              .getDirection();
            let next_direction = transformation_matrix.apply_to_direction(
              current_direction
            );
            let next_face = Face.get_closest_face_for_vector(next_direction);
            mirrored_block_data.setRotation(next_face);
          }

          if (mirrored_block_data instanceof Bisected) {
            let bisected_face =
              mirrored_block_data.getHalf() === Bisected.Half.TOP
                ? BlockFace.UP
                : BlockFace.DOWN;
            let next_direction = transformation_matrix.apply_to_direction(
              bisected_face.getDirection()
            );
            let next_face = Face.get_closest_face_for_vector(next_direction, [
              BlockFace.UP,
              BlockFace.DOWN
            ]);
            mirrored_block_data.setHalf(
              next_face === BlockFace.UP
                ? Bisected.Half.TOP
                : Bisected.Half.BOTTOM
            );
          }

          if (block_data.equals(mirrored_block_data)) {
            return null;
          }

          return { location, mirrored, mirrored_block_data };
        })
        .filter(x => x != null);
    // console_timeEnd("Get blockdatas");
    //
    // console.log(`has_become_real:`, has_become_real);
    // console.log(`block_datas.length:`, block_datas.length)

    let filtered_block_datas = block_datas
      .map(({ location, mirrored, mirrored_block_data }) => {
        if (has_become_real) {
          return {
            location: location,
            blockdata: location.getBlock().getBlockData()
          };
        }

        let location_vector = location.toVector();
        let is_inside_view = planes.every(plane =>
          plane.is_next_to(location_vector)
        );
        let is_inside_old_view =
          player_portal.last_planes != null &&
          player_portal.last_planes.every(plane =>
            plane.is_next_to(location_vector)
          );
        if (is_inside_view === is_inside_old_view) {
          // Nothing changed, no render needed
          return null;
        }

        if (is_inside_view === false) {
          return {
            location: location,
            blockdata: location.getBlock().getBlockData()
          };
        } else {
          return {
            location: location,
            blockdata: mirrored_block_data
          };
        }
      })
      .filter(x => x != null);

    if (is_in_same_world(player.getLocation(), portal_center)) {
      let own_location_mirrored = transformation_matrix.inverse().apply_to_location(
        player.getLocation()
      );
      let mirrored_player_location = (({ location }) => {
        if (has_become_real) {
          return null;
        }

        let location_vector = location.toVector();
        let is_inside_view = planes.every(plane =>
          plane.is_next_to(location_vector)
        );

        if (is_inside_view === false) {
          return null;
        } else {
          return location;
        }
      })({ location: own_location_mirrored });
      render_entity_to_player(player, {
        key: `self-${portal_center.toString()}`,
        value:
          mirrored_player_location == null
            ? null
            : {
                type: FakePlayer,
                location: mirrored_player_location,
                player: player
              }
      });
    }

    let block_diff = locations.length - filtered_block_datas.length;
    // console.log(`Blocks being sent:`, filtered_block_datas.length);

    // console_time("Get chunks");
    let chunks = {};
    for (let { location, blockdata } of filtered_block_datas) {
      let chunk = location.getChunk();
      let chunk_x = chunk.getX();
      let chunk_z = chunk.getZ();
      let chunk_key = `${chunk_x}:${chunk_z}`;

      chunks[chunk_key] = chunks[chunk_key] || {
        records: [],
        chunk_x: chunk_x,
        chunk_z: chunk_z
      };
      chunks[chunk_key].records.push(
        Packet.multiblock_entry({
          in_chunk: [
            location.getX() - chunk_x * 16,
            location.getZ() - chunk_z * 16
          ],
          y: location.getBlockY(),
          blockId: Packet.combined_id(blockdata)
        })
      );
    }
    // console_timeEnd("Get chunks");
    //
    // console_time("Send chunks");
    // prettier-ignore
    for (let [chunk_key, { records, chunk_x, chunk_z }] of Object.entries(
      chunks
    )) {
      Packet.send_packet(player, {
        name: "multi_block_change",
        params: {
          chunkX: chunk_x,
          chunkZ: chunk_z,
          records: records
        }
      });
    }
    // console_timeEnd("Send chunks");

    set_player_portal({
      isReal: isReal,
      current_traced_blocks: locations,
      last_planes: planes,
      block_datas: block_datas
    });
  }
};

let portal_player_map = new Map();
let get_portal_player = player => {
  if (!portal_player_map.has(player.getName())) {
    portal_player_map.set(player.getName(), {
      portals: new Map(),
      player: player
    });
  }
  return portal_player_map.get(player.getName());
};
let get_portal = (portal, portal_map) => {
  if (!portal_map.portals.has(portal)) {
    let isReal = is_in_front_of_portal(portal_map.player, portal);
    portal_map.portals.set(portal, {
      isReal: !isReal,
      current_traced_blocks: [],
      last_planes: null
    });
  }
  return {
    player_portal: portal_map.portals.get(portal),
    set_player_portal: portal_info => {
      portal_map.portals.set(portal, {
        ...portal_map.portals.get(portal),
        ...portal_info
      });
    }
  };
};

let runtime_portal = (player, portal) => {
  return get_portal(portal, get_portal_player(player));
};

let is_in_front_of_portal = (player, portal) => {
  let { corner_blocks, looking_direction } = portal;
  let [bottom_left, top_left, top_right, bottom_right] = corner_blocks
    .map(x => x.getLocation())
    .map(x => block_middle(x));

  let portal_plane = Plane.from_three_points(bottom_left, top_left, top_right);
  return portal_plane.is_next_to(player.getLocation().toVector());
};

let trace_portal = async (player, looking_location, looking_direction) => {
  let white_wool = Material.RED_WOOL.createBlockData();
  let drone = new Drone({
    player,
    initial_location: looking_location,
    initial_direction: looking_direction
  });

  try {
    drone.lookTo(Drone.LEFT);

    let first_location = drone.getLocation();
    let i = 0;

    let corner_blocks = [];

    while (true) {
      i = i + 1;
      if (i > 100) {
        // prettier-ignore
        throw new Error(`Portal being traced is bigger than 100 blocks`);
      }

      if (drone.getBlock().getType() !== Material.BLUE_WOOL) {
        // prettier-ignore
        throw new Error(`Couldn't find next block in tracing the portal`);
      }
      drone.sendPlayer(player, white_wool);

      if (
        (await drone.peekBlock(1, Drone.FORWARD)).getType() !==
        Material.BLUE_WOOL
      ) {
        drone.lookTo(vector =>
          vector.rotateAroundAxis(looking_direction, Math.PI * 0.5)
        );
        corner_blocks.push(drone.getBlock());
      }

      await drone.move(1, Drone.FORWARD);

      if (drone.getLocation().equals(first_location)) {
        break;
      }
    }
    return corner_blocks;
  } finally {
    drone.exeunt();
  }
};

let middle_between_vectors = (v1, v2) => {
  return v1
    .clone()
    .add(v2)
    .multiply(0.5);
};

let is_in_same_world = (location1, location2) => {
  return location1.getWorld() === location2.getWorld();
}

let check_for_portal_crossing = (event, _portal) => {
  let { from, to } = _portal;
  let [
    bottom_left,
    top_left,
    top_right,
    bottom_right
  ] = from.corner_blocks.map(x => x.getLocation()).map(x => block_middle(x));
  let plane_point = middle_between_vectors(bottom_left, top_right);

  if (!is_in_same_world(plane_point, event.getTo())) {
    return;
  }

  let distance_to_portal = plane_point.distanceSquared(event.getTo());
  if (distance_to_portal > EIGHT_SQUARED) {
    return;
  }

  // Check if player crosses the planes
  let portal_plane = Plane.from_three_points(bottom_left, top_left, top_right);

  let to_next_to = portal_plane.is_next_to(event.getTo().toVector());
  let from_next_to = portal_plane.is_next_to(event.getFrom().toVector());
  if (!(from_next_to === false && to_next_to === true)) {
    return;
  }

  let distance_left_right = bottom_left.distanceSquared(bottom_right) + 4;
  let distance_to_left = bottom_left.distanceSquared(event.getTo());
  let distance_to_right = bottom_right.distanceSquared(event.getTo());

  if (
    distance_to_left > distance_left_right ||
    distance_to_right > distance_left_right
  ) {
    return;
  }

  let transformation_matrix = get_transformation_matrix_for_portal(_portal);

  let player = event.getPlayer();
  player.setVelocity(
    transformation_matrix.apply_to_direction(player.getVelocity())
  );

  let destination = transformation_matrix.apply_to_location(event.getTo());
  destination.setWorld(_portal.to.corner_blocks[0].getWorld());
  event.setTo(destination);
};

let PLAYER_RUNTIME_DATA = {};
let player_runtime_metadata = (player, key) => {
  // TODO Add listener to remove data when player leaves

  let uuid = player.getUniqueId().toString();

  return {
    get: ({ default: default_value = null } = {}) => {
      PLAYER_RUNTIME_DATA[uuid] = PLAYER_RUNTIME_DATA[uuid] || {};
      return PLAYER_RUNTIME_DATA[uuid][key] == null
        ? default_value
        : PLAYER_RUNTIME_DATA[uuid][key];
    },
    set: value => {
      PLAYER_RUNTIME_DATA[uuid] = PLAYER_RUNTIME_DATA[uuid] || {};
      PLAYER_RUNTIME_DATA[uuid][key] = value;
    }
  };
};

let Reakkit = require('./Reakkit.js');

let plugin_item = ({ material, title, description, active }) => {
  let ItemStack = Java.type('org.bukkit.inventory.ItemStack');
  let ItemFlag = Java.type('org.bukkit.inventory.ItemFlag');
  let Enchantment = Java.type('org.bukkit.enchantments.Enchantment');

  let itemstack = new ItemStack(material);
  let itemmeta = itemstack.getItemMeta();

  itemmeta.setDisplayName(title);
  if (description != null) {
    if (typeof description === 'string') {
      description = description.split('\n');
    }
    itemmeta.setLore(description);
  }
  itemmeta.addItemFlags(ItemFlag.HIDE_ATTRIBUTES);
  itemmeta.addItemFlags(ItemFlag.HIDE_ENCHANTS);

  if (active) {
    itemmeta.addEnchant(Enchantment.VANISHING_CURSE, 1, false);
  }

  itemstack.setItemMeta(itemmeta);
  return itemstack;
}

let reverse_portal = (portal) => {
  return {
    ...portal,
    corner_blocks: portal.corner_blocks.slice().reverse(),
    looking_direction: portal.looking_direction.clone().multiply(-1),
  }
}

module.exports = plugin => {
  let portals = [];

  try {
    let worldedit_gui = require('./worldedit-gui/index.js');
    worldedit_gui(plugin);
  } catch (error) {
    console.log(`${ChatColor.RED}Error while enabling wordedit gui:`);
    console.log(error);
  }
  // TODO On block change, apply block change to portals
  // plugin.events.PlayerBreak

  plugin.events.PlayerMove(async event => {
    let player = event.getPlayer();
    for (let portal of portals) {
      await check_for_portal_crossing(event, portal);
    }
  });

  plugin.events.PlayerMove(queue_function(async event => {
    let player = event.getPlayer();
    for (let portal of portals) {
      await render_portal(player, event.getTo(), portal);
    }
  }));

  // TODO Show animations of projected players
  // plugin.events.PlayerAnimation(event => {
  //   console.log(`event.getAnimationType().name():`, event.getAnimationType().name())
  // })

  // let InventorySlot = Java.type('org.bukkit.inventory.EquipmentSlot');
  plugin.events.PlayerInteract(async (event) => {
    let block_face = event.getBlockFace();
    let block = event.getClickedBlock();
    let item = event.getItem();
    let player = event.getPlayer();

    // let hand = event.getHand();
    // let action = event.getAction();
    // console.log(`action:`, action.name());
    // console.log(`hand:`, hand.name());

    if (item == null) {
      return;
    }
    if (item.getItemMeta().getDisplayName() !== 'Portal creation') {
      return;
    }
    event.setCancelled(true);

    let selected_portal_storage = player_runtime_metadata(player, "selected_portal");

    let looking_location = block.getLocation();
    let looking_direction = block_face.getDirection().clone().multiply(-1);

    let corner_blocks = await trace_portal(
      player,
      looking_location,
      looking_direction
    );

    let portal = {
      corner_blocks: corner_blocks,
      looking_direction: looking_direction
    };

    let selected_portal = selected_portal_storage.get();

    if (selected_portal == null) {
      selected_portal_storage.set(portal);
      player.getInventory().setItemInMainHand(portal_tool(true));
      player.sendMessage(`${ChatColor.BLUE}Source portal selected!`);
    } else {
      // prettier-ignore
      player.sendMessage(`${ChatColor.BLUE}Destination portal selected, activating...`);
      let from_to_portal = {
        from: selected_portal,
        to: reverse_portal({ corner_blocks, looking_direction }),
      };
      let to_from_portal = {
        from: { corner_blocks, looking_direction },
        to: reverse_portal(selected_portal),
      };

      portals.push(from_to_portal);
      portals.push(to_from_portal);
      selected_portal_storage.set(null);

      player.getInventory().setItemInMainHand(portal_tool(false));
      await render_portal(player, player.getLocation(), from_to_portal);
      await render_portal(player, player.getLocation(), to_from_portal);
      player.sendMessage(`${ChatColor.DARK_BLUE}Portal activated!`);
    }
  });

  let portal_tool = (active = false) => {
    let tool = plugin_item({
      material: Material.IRON_HOE,
      title: 'Portal creation',
      description: [
        'Click on a frame of blue wool',
      ],
      active: active,
    });
    return tool;
  }

  plugin.command("itemstack", async (player) => {
    player.getInventory().setItemInMainHand(portal_tool(false));
  });

  plugin.command("portal", async player => {
    let selected_portal_storage = player_runtime_metadata(player, "selected_portal");

    let looking_location = player.getTargetBlockExact(120).getLocation();
    let looking_direction = player
      .getTargetBlockFace(120)
      .getDirection()
      .clone()
      .multiply(-1);

    let corner_blocks = await trace_portal(
      player,
      looking_location,
      looking_direction
    );

    let portal = {
      corner_blocks: corner_blocks,
      looking_direction: looking_direction
    };

    let selected_portal = selected_portal_storage.get();

    if (selected_portal == null) {
      selected_portal_storage.set(portal);
      player.sendMessage(`${ChatColor.DARK_BLUE}Portal set!`);
    } else {
      let from_to_portal = {
        from: selected_portal,
        to: {
          corner_blocks: corner_blocks.slice().reverse(),
          looking_direction: looking_direction.clone().multiply(-1),
        },
      };
      let to_from_portal = {
        from: {
          corner_blocks: corner_blocks.slice().reverse(),
          looking_direction: looking_direction.clone().multiply(-1),
        },
        to: selected_portal,
      };
      portals.push(from_to_portal);
      portals.push(to_from_portal);
      selected_portal_storage.set(null);

      await render_portal(player, player.getLocation(), from_to_portal);
      await render_portal(player, player.getLocation(), to_from_portal);
      player.sendMessage(`${ChatColor.DARK_BLUE}Portal activated!`);
    }

  });
};
