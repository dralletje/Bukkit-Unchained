let { range, sortBy, throttle, random } = require("lodash");
let { ChatColor, Material } = require("bukkit");

let {} = require("./util.js");
let Packet = require("./Packet.js");
let { Plane, Face } = require("./Geometry.js");

let Vector = Java.type("org.bukkit.util.Vector");
let Location = Java.type("org.bukkit.Location");
let Directional = Java.type('org.bukkit.block.data.Directional');

// Hmmm
// TODO Very hacky thing to make
global.crypto = {
  getRandomValues: buf => {
    // console.log(`buf.length:`, buf.length);
    return buf;
  }
};

let { Drone } = require("./Drone.js");

let reset_location_for_player = (player, location) => {
  player.sendBlockChange(location, location.getBlock().getBlockData());
};

// Simple way to add timeout to an async function:
// - await delay(1000); // Waits for 1 second before continueing
let delay = ms => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

class PreconditionError extends Error {
  constructor(...args) {
    super(...args);
    this.name = "PreconditionError";
  }
}
let precondition = (condition, message) => {
  if (!condition) {
    throw new PreconditionError(message);
  }
};

let block_middle = location => {
  return location.clone().add(new Vector(0.5, 0.5, 0.5));
};

let multiblock = ({ in_chunk: [x, z], y, blockId }) => {
  return {
    horizontalPos: (x << 4) + z,
    y: y,
    blockId: blockId
  };
};

let queue_function = fn => {
  let IS_RUNNING = Symbol(
    "render_portal is running, with no next render_portal scheduled"
  );
  let next = null;
  let exeute_next = async (...args) => {
    try {
      // console.log(`START: ${typeof next}`);
      if (next == null) {
        next = IS_RUNNING;

        await fn(...args);
        await delay(10);

        let current = next;
        next = null;
        if (current !== IS_RUNNING && current != null) {
          console.log("executing next");
          exeute_next(...current);
        }
        // console.log(`END: ${typeof next}`);
      } else {
        console.log("Schedule next");
        next = args;
      }
    } catch (err) {
      console.log(`err:`, err);
      throw err;
    }
  };

  return exeute_next;
};

let math = require("mathjs");
let get_transformation_matrix = vectors => {
  let X_from = math.transpose(
    vectors.map(x => {
      return [...x.from, 1];
    })
  );
  let X_to = math.transpose(
    vectors.map(x => {
      return [...x.to, 1];
    })
  );

  let inverse = math.inv(X_from);
  let T = math.transpose(math.multiply(X_to, inverse));
  return T;
};
let get_transformation_matrix_for_portal = (portal) => {
  let { corner_blocks, looking_direction } = portal;
  let [left, left_top, right_top, right] = corner_blocks
    .map(x => x.getLocation())
    .map(x => block_middle(x));

  let transformation_matrix = get_transformation_matrix([
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

let JavaVector = {
  to_js: vector => {
    return [vector.getX(), vector.getY(), vector.getZ()];
  },
  from_js: vector => {
    return new Vector(vector[0], vector[1], vector[2]);
  }
};

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

    let idk_vector = left
      .toVector()
      .clone()
      .add(looking_direction)
      .subtract(location.toVector())
      .multiply(looking_direction);
    let isReal = idk_vector.getX() + idk_vector.getY() + idk_vector.getZ() < 0;

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
        // let [x, y, z, _] = math.multiply([...JavaVector.to_js(location), 1], transformation_matrix);
        let mirrored = transform_location(location, transformation_matrix);

        locations.push([location, mirrored]);
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
          let next_direction = transform_direction(current_direction, transformation_matrix);
          let available_faces = Java.from(mirrored_block_data.getFaces().toArray());
          let next_face = Face.get_closest_face_for_vector(next_direction, available_faces);
          mirrored_block_data.setFacing(next_face);
          // console.log(`mirrored_block_data.getFacing().toString():`, mirrored_block_data.getFacing().toString())
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
        multiblock({
          in_chunk: [
            Math.floor(location.getX()) - chunk_x * 16,
            Math.floor(location.getZ()) - chunk_z * 16
          ],
          y: location.getBlockY(),
          blockId: get_combined_id(blockdata)
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
  let [left, _1, _2, right] = corner_blocks;

  let idk_vector = left
    .getLocation()
    .toVector()
    .clone()
    .add(looking_direction)
    .subtract(player.getLocation().toVector())
    .multiply(looking_direction);
  return idk_vector.getX() + idk_vector.getY() + idk_vector.getZ() < 0;
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

let double_to_int = double => {
  let result = Math.round(double);
  if (result === -0) {
    return 0;
  } else {
    return result;
  }
};

let debug_spawn = ({
  player,
  location,
  id = random(0, 1000),
  entity_type = 63,
  spawn_timeout = 1000
}) => {
  Packet.send_packet(player, {
    name: "spawn_entity",
    params: {
      entityId: id,
      objectUUID: id,
      type: entity_type,
      x: location.getX(),
      y: location.getY(),
      z: location.getZ(),
      velocityX: 0,
      velocityY: 0,
      velocityZ: 0,
      pitch: 0,
      yaw: 0
    }
  });

  // setTimeout(() => {
  //   entity.remove();
  // }, spawn_timeout)
};

let to_vector = m => (m.toVector ? m.toVector() : m);

let trace_eye = function*(player, to_location) {
  let world = player.getLocation().getWorld();

  let head_vector = player.getEyeLocation().toVector();

  let to_vector = to_location.toVector();
  // left_vector = left_vector.clone().add(left_vector.subtract(right_vector).normalize())

  let delta_to = head_vector.clone().subtract(to_vector);

  // let ExperienceOrb = Java.type('org.bukkit.entity.Arrow')
  // let ExperienceOrb = Java.type('org.bukkit.entity.ExperienceOrb')
  let ExperienceOrb = Java.type("org.bukkit.entity.Snowball");

  let previous = null;
  for (let i of range(16)) {
    let direction = delta_to
      .clone()
      .normalize()
      .multiply(-i);
    let next = to_location.clone().add(direction);
    yield next;

    // if (previous) {
    //   let diff = next.clone().add(previous.clone().multiply(-1));
    //   let N = 1;
    //   for (let n of range(N)) {
    //     debug_spawn({
    //       player: player,
    //       location: previous.clone().add(diff.clone().multiply(1 / N * n)),
    //       entity_type: ExperienceOrb,
    //       id: 1000 + (i * 3) + n,
    //     });
    //   }
    // }

    previous = next;
  }
};

let v_null = new Vector(0, 0, 0);

let get_combined_id = blockdata => {
  // Most hacky stuff pfff
  let BLOCK = Java.type("net.minecraft.server.v1_13_R2.Block").class.static;
  let iblockdata = Java_type("com.comphenix.protocol.wrappers.WrappedBlockData")
    .static.createData(blockdata)
    .getHandle();
  let combined_id = BLOCK.getCombinedId(iblockdata);
  return combined_id;
};

let middle_between_vectors = (v1, v2) => {
  return v1
    .clone()
    .add(v2)
    .multiply(0.5);
};

let transform_direction = (direction_vector, T) => {
  let direction_only_transform = [
    [T[0][0], T[0][1], T[0][2]],
    [T[1][0], T[1][1], T[1][2]],
    [T[2][0], T[2][1], T[2][2]],
  ];
  let [x, y, z] = math.multiply(JavaVector.to_js(direction_vector), direction_only_transform);
  return new Vector(x, y, z);
}

let transform_location = (location, transformation_matrix) => {
  let [x, y, z, _] = math.multiply([...JavaVector.to_js(location), 1], transformation_matrix);
  let new_location = new Location(location.getWorld(), x, y, z);
  new_location.setDirection(transform_direction(location.getDirection(), transformation_matrix));
  return new_location;
}

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
  // player.setVelocity(
  //   transform_location(
  //     event.getTo().clone().add(player.getVelocity())
  //   ).toVector()
  // );
  player.setVelocity(transform_direction(player.getVelocity(), transformation_matrix));
  event.setTo(transform_location(event.getTo(), transformation_matrix));
};

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
      await render_portal(player, event.getTo(), portal);

      await check_for_portal_crossing(event, portal);
    }
  });

  plugin.command("portal", async player => {
    let looking_location = player.getTargetBlockExact(120).getLocation();
    let looking_direction = player
      .getTargetBlockFace(120)
      .getDirection()
      .clone()
      .multiply(-1);
    let world = looking_location.getWorld();

    let chunk = looking_location.getChunk();
    let chunk_x = chunk.getX();
    let chunk_z = chunk.getZ();
    let x = looking_location.getBlockX();
    let z = looking_location.getBlockZ();

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
  });
};
