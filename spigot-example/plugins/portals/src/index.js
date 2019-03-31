let { range, sortBy, throttle, random } = require("lodash");
let { ChatColor, Material, BlockFace } = require("bukkit");

let { delay, precondition, queue_function } = require("./util.js");
let Packet = require("./Packet.js");
let { Plane, Face, TransformationMatrix, JavaVector } = require("./Geometry.js");
let { Drone } = require("./Drone.js");

let Vector = Java.type("org.bukkit.util.Vector");
let Location = Java.type("org.bukkit.Location");

let Directional = Java.type('org.bukkit.block.data.Directional');
let Rotatable = Java.type('org.bukkit.block.data.Rotatable');
let Bisected = Java.type('org.bukkit.block.data.Bisected');

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
  let { corner_blocks, looking_direction } = portal;
  let [left, left_top, right_top, right] = corner_blocks
    .map(x => x.getLocation())
    .map(x => block_middle(x));

  let transformation_matrix = TransformationMatrix.from_vector_mappings([
    { from: JavaVector.to_js(left), to: JavaVector.to_js(right) },
    { from: JavaVector.to_js(right), to: JavaVector.to_js(left) },
    {
      from: JavaVector.to_js(right_top.toVector().add(looking_direction)),
      to: JavaVector.to_js(left_top.toVector().subtract(looking_direction))
    },
    { from: JavaVector.to_js(left_top), to: JavaVector.to_js(right_top) }
  ]);

  return transformation_matrix;
}

let NINE_SQUARED = 9 ** 2;
let EIGHT_SQUARED = 8 ** 2;

let render_portal = queue_function(async (player, location, portal) => {
  let { corner_blocks, looking_direction } = portal;
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

  let { player_portal, set_player_portal } = runtime_portal(player, portal);
  // Show mirror image
  {
    let location = player.getLocation();
    let distance_to_portal = location.distanceSquared(left);

    if (distance_to_portal > 100 ** 2) {
      return;
    }

    let plane_point = middle_between_vectors(left, right_top);
    let plane_vector = looking_direction.clone();

    let isReal = is_in_front_of_portal(player, portal);
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

    console.log("== UPDATING PORTAL ==");

    console.time("Cuboid chunks");
    let portal_width = left.distance(right);
    let portal_height = right_top.distance(right);
    let locations = player_portal.current_traced_blocks || [];

    let transformation_matrix = get_transformation_matrix_for_portal(portal);

    if (locations.length === 0) {
      for await (let location of drone.cuboid_fast([
        { right: 8 + portal_width + 8 },
        { forward: 16 },
        { up: 3 + portal_height + 8 }
      ])) {
        let mirrored = transformation_matrix.apply_to_location(location);

        locations.push([location, mirrored]);

        if (locations.length % 100 === 0) {
          await delay(10);
        }
      }
    }
    console.timeEnd("Cuboid chunks");

    let portal_center = middle_between_vectors(left, right_top).clone().add(looking_direction.clone().multiply(4));

    // let WALL_MATERIAL = Material.WHITE_WOOL;
    let WALL_MATERIAL = Material.WHITE_STAINED_GLASS;

    let has_become_real = player_portal.isReal === false && isReal === true;

    console.time("Get blockdatas");
    let block_datas = locations
      .map(([location, mirrored]) => {
        if (has_become_real) {
          return {
            location: location,
            blockdata: location.getBlock().getBlockData()
          };
        }

        let distance_to_portal = portal_center.distanceSquared(location);

        if (distance_to_portal > NINE_SQUARED) {
          return null;
        }

        let is_wall =
          EIGHT_SQUARED < distance_to_portal &&
          distance_to_portal <= NINE_SQUARED;
        let location_vector = location.toVector();

        let is_inside_view = planes.every(plane =>
          plane.is_next_to(location_vector)
        );
        is_inside_old_view =
          player_portal.last_planes != null &&
          player_portal.last_planes.every(plane =>
            plane.is_next_to(location_vector)
          );

        if (is_inside_view === is_inside_old_view) {
          // Nothing changed, no render needed
          return null;
        }

        let block_data = location.getBlock().getBlockData();
        let mirrored_block_data = is_wall
          ? WALL_MATERIAL
          : mirrored.getBlock().getBlockData();

        if (mirrored_block_data instanceof Directional) {
          let current_direction = mirrored_block_data.getFacing().getDirection();
          let next_direction = transformation_matrix.apply_to_direction(current_direction);
          let available_faces = Java.from(mirrored_block_data.getFaces().toArray());
          let next_face = Face.get_closest_face_for_vector(next_direction, available_faces);
          mirrored_block_data.setFacing(next_face);
        }

        if (mirrored_block_data instanceof Rotatable) {
          let current_direction = mirrored_block_data.getRotation().getDirection();
          let next_direction = transformation_matrix.apply_to_direction(current_direction);
          let next_face = Face.get_closest_face_for_vector(next_direction);
          mirrored_block_data.setRotation(next_face);
        }

        if (mirrored_block_data instanceof Bisected) {
          let bisected_face =
            mirrored_block_data.getHalf() === Bisected.Half.TOP
            ? BlockFace.UP
            : BlockFace.DOWN;
          let next_direction = transformation_matrix.apply_to_direction(bisected_face.getDirection());
          let next_face = Face.get_closest_face_for_vector(next_direction, [BlockFace.UP, BlockFace.DOWN]);
          mirrored_block_data.setHalf(next_face === BlockFace.UP ? Bisected.Half.TOP : Bisected.Half.BOTTOM);
        }

        if (block_data.equals(mirrored_block_data)) {
          return null;
        }

        if (is_inside_view === false) {
          return {
            location: location,
            blockdata: block_data
          };
        } else {
          return {
            location: location,
            blockdata: mirrored_block_data
          };
        }
      })
      .filter(x => x != null);
    console.timeEnd("Get blockdatas");

    let block_diff = locations.length - block_datas.length;
    console.log(`Blocks being sent:`, block_datas.length);
    // console.log(`block_diff:`, block_diff);

    console.time("Get chunks");
    let chunks = {};
    for (let { location, blockdata } of block_datas) {
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
            location.getZ() - chunk_z * 16,
          ],
          y: location.getBlockY(),
          blockId: Packet.combined_id(blockdata),
        })
      );
    }
    console.timeEnd("Get chunks");

    console.time("Send chunks");
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
    console.timeEnd("Send chunks");

    set_player_portal({
      isReal: isReal,
      current_traced_blocks: locations,
      last_planes: planes
    });
  }
});

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
  let [bottom_left, top_left, top_right, bottom_right] = corner_blocks.map(x => x.getLocation()).map(x => block_middle(x));

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

let check_for_portal_crossing = (event, portal) => {
  let [
    bottom_left,
    top_left,
    top_right,
    bottom_right
  ] = portal.corner_blocks.map(x => x.getLocation()).map(x => block_middle(x));
  let plane_point = middle_between_vectors(bottom_left, top_right);

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

  let transformation_matrix = get_transformation_matrix_for_portal(portal);

  let player = event.getPlayer();
  player.setVelocity(transformation_matrix.apply_to_direction(player.getVelocity()));
  event.setTo(transformation_matrix.apply_to_location(event.getTo()));
};

let spawn_fake_player = (player) => {
  let looking_location_1 = player.getTargetBlockExact(120).getLocation().add(new Vector(0, 1, 0));

  Packet.send_packet(player, {
    name: 'named_entity_spawn',
    params: {
      entityId: 1003,
      playerUUID: player.getUniqueId().toString(),
      x: looking_location_1.getX(),
      y: looking_location_1.getY(),
      z: looking_location_1.getZ(),
      yaw: 0,
      pitch: 0,
      metadata: [],
    },
  });
}

module.exports = plugin => {
  let portals = [];

  // TODO On block change, apply block change to portals
  // plugin.events.PlayerBreak

  plugin.events.PlayerMove(async event => {
    let to = event.getTo().toVector();
    let from = event.getFrom().toVector();
    if (to.equals(from)) {
      return;
    }

    let player = event.getPlayer();
    for (let portal of portals) {
      await check_for_portal_crossing(event, portal);

      await render_portal(player, event.getTo(), portal);
    }
  });

  plugin.command("portal", async player => {
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
    portals.push(portal);
    await render_portal(player, player.getLocation(), portal);

    player.sendMessage(`${ChatColor.PURPLE}Portal activated!`)
  });
};
