let { range } = require("lodash");

let Packet = require("bukkit/Packet");

let Vector = Java.type("org.bukkit.util.Vector");

let rgb = (red, green, blue) => {
  return { red, green, blue };
};
let send_dust = ({ player, location, color = rgb(1, 0, 0), scale = 1 }) => {
  Packet.send_packet(player, {
    name: "world_particles",
    params: {
      particleId: 14,
      data: {
        red: color.red,
        green: color.green,
        blue: color.blue,
        scale: scale
      },

      longDistance: false,
      x: location.getX(),
      y: location.getY(),
      z: location.getZ(),
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      particleData: 0,
      particles: 1
    }
  });
};

let get_line_points = ({ count, from: from_location, to: to_location }) => {
  let diff_vector = from_location
    .clone()
    .toVector()
    .subtract(to_location.clone().toVector())
    .multiply(1 / count);

  return range(0, count + 1).map(i => {
    let next_point_relative = diff_vector.clone().multiply(i);
    let location = to_location.clone().add(next_point_relative);
    return location;
  });
};

let cube_points = (from, to) => {
  let x_diff = to.getX() - from.getX();
  let y_diff = to.getY() - from.getY();
  let z_diff = to.getZ() - from.getZ();

  return [
    from.clone().add(new Vector(0, 0, 0)), // from
    from.clone().add(new Vector(x_diff, 0, 0)),
    from.clone().add(new Vector(x_diff, 0, z_diff)),
    from.clone().add(new Vector(0, 0, z_diff)),
    from.clone().add(new Vector(0, y_diff, 0)),
    from.clone().add(new Vector(x_diff, y_diff, 0)),
    from.clone().add(new Vector(x_diff, y_diff, z_diff)),
    from.clone().add(new Vector(0, y_diff, z_diff)) // to
  ];
};

let cube_lines = (from, to) => {
  let simple_lines = [
    // front_bottom_right
    [[0, 0, 0], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 0, 0]],

    // front_top_left
    [[0, 1, 1], [0, 1, 0]],
    [[0, 1, 1], [0, 0, 1]],
    [[0, 1, 1], [1, 1, 1]],

    // back_bottom_left
    [[1, 0, 1], [1, 0, 0]],
    [[1, 0, 1], [1, 1, 1]],
    [[1, 0, 1], [0, 0, 1]],

    // back_top_right
    [[1, 1, 0], [1, 1, 1]],
    [[1, 1, 0], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0]]
  ];

  let x_diff = to.getX() - from.getX();
  let y_diff = to.getY() - from.getY();
  let z_diff = to.getZ() - from.getZ();

  return simple_lines.map(([line_from, line_to]) => {
    return [
      from
        .clone()
        .add(
          new Vector(
            line_from[0] * x_diff,
            line_from[1] * y_diff,
            line_from[2] * z_diff
          )
        ),
      from
        .clone()
        .add(
          new Vector(
            line_to[0] * x_diff,
            line_to[1] * y_diff,
            line_to[2] * z_diff
          )
        )
    ];
  });
};

let send_box_for_player = ({ entity_ids, player, from, to }) => {
  let lines = cube_lines(from, to);
  let points = lines
    .map(([from, to]) => get_line_points({ count: 20, from, to }))
    .flat();

  for (let [index, point] of Object.entries(points)) {
    let entity_id = entity_ids[index];
    if (entity_id == null) {
      throw new Error(`No entity id found for '${index}'`);
    }
    Packet.send_packet(player, {
      name: "spawn_entity",
      params: {
        entityId: entity_id,
        objectUUID: entity_id,
        type: 63,
        x: point.getX(),
        y: point.getY(),
        z: point.getZ(),
        velocityX: 0,
        velocityY: 0,
        velocityZ: 0,
        pitch: 0,
        yaw: 0
      }
    });
    Packet.send_packet(player, {
      name: "entity_metadata",
      params: {
        entityId: entity_id,
        metadata: [
          {
            key: 0,
            type: 0,
            value: 0x40
          }
        ]
      }
    });
  }
};

// prettier-ignore
let CuboidRegionSelector = Java_type("com.sk89q.worldedit.regions.selector.CuboidRegionSelector");
// prettier-ignore
let SkPlayer = Java_type("com.sk89q.worldedit.bukkit.BukkitPlayer");
let bukkit_adapter = Java_type("com.sk89q.worldedit.bukkit.BukkitAdapter")
  .static;

let worldedit_session_for_player = player => {
  return Java_type("com.sk89q.worldedit.WorldEdit")
    .static.getInstance()
    .getSessionManager()
    .get(new SkPlayer(player));
};

module.exports = plugin => {
  let entity_ids = range(0, 12)
    .map(() =>
      range(0, 20 + 1).map(() => Packet.get_entity_count().incrementAndGet())
    )
    .flat();


  plugin.events.PlayerInteract(async event => {
    // let location = event.getTo();
    // let block_location = location.getBlock().getLocation();
    let player = event.getPlayer();

    let session = worldedit_session_for_player(player);
    let sk_player = new SkPlayer(player);
    let selection = session.getRegionSelector(sk_player.getWorld());

    if (!(selection instanceof CuboidRegionSelector)) {
      // If this happens and the selection of the user was not in the same world as the user, his/her
      // selection will be erased by the "getRegionSelector(user.getWorld())" call.
      throw new Error("Only cuboid regions are supported");
    }

    let region = selection.getRegion();
    let from = region.getMinimumPoint();
    let to = region.getMaximumPoint();
    let _to = bukkit_adapter.adapt(player.getLocation().getWorld(), to);

    send_box_for_player({
      entity_ids,
      player,
      from: bukkit_adapter.adapt(player.getLocation().getWorld(), from),
      to: _to.add(new Vector(1, 1, 1))
    });
  });

  // setInterval(() => {
  //   let color = rgb(0, 0, 0);
  //   for (let [player, points] of player_locations.entries()) {
  //     for (let point of points) {
  //       send_dust({
  //         player: player,
  //         location: point,
  //         color,
  //       });
  //     }
  //   }
  // }, 200);
  // plugin.events.PlayerMove(async (event) => {
  //   let player_location = event.getTo();
  //   let player = event.getPlayer();
  //
  //   let lines = cube_lines(player_location.clone().add(new Vector(-5, -5, -5)), player_location.clone().add(new Vector(5, 5, 5)));
  //   let points = lines.map(([from, to]) => get_line_points({ count: 20, from, to })).flat();
  //
  //   player_locations.set(player, points);
  // });
};
