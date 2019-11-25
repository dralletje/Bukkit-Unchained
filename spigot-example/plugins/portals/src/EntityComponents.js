let Packet = require("bukkit/Packet");

let React = require('./Reakkit.js');

let ANGLE = (1 / 360) * 256;
let pack_yaw = yaw => {
  let with_angle = yaw * ANGLE;
  if (with_angle > 128) {
    return Math.floor(with_angle - 256);
  } else {
    return Math.floor(with_angle);
  }
};
let pack_pitch = pitch => pitch * ANGLE;

class FakePlayer extends React.Component {
  componentDidMount() {
    let { player, location } = this.props;

    let entity_counter = Packet.get_entity_count();
    this.entity_id = entity_counter.incrementAndGet();

    Packet.send_packet(player, {
      name: "named_entity_spawn",
      params: {
        entityId: this.entity_id,
        playerUUID: player.getUniqueId().toString(),
        x: location.getX(),
        y: location.getY(),
        z: location.getZ(),
        yaw: pack_yaw(location.getYaw()),
        pitch: pack_pitch(location.getPitch()),
        metadata: []
      }
    });

    // entity_counter.set(entity_counter.get() + 1);
  }

  componentDidUpdate(prev_prop) {
    let { location, player } = this.props;

    if (
      location.getX() !== prev_prop.location.getX() ||
      location.getY() !== prev_prop.location.getY() ||
      location.getZ() !== prev_prop.location.getZ() ||
      location.getPitch() !== prev_prop.location.getPitch()
    ) {
      Packet.send_packet(player, {
        name: "entity_teleport",
        params: {
          entityId: this.entity_id,
          playerUUID: player.getUniqueId().toString(),
          x: location.getX(),
          y: location.getY(),
          z: location.getZ(),
          yaw: pack_yaw(location.getYaw()),
          pitch: pack_pitch(location.getPitch()),
          onGround: false
        }
      });
    }
    if (location.getYaw() !== prev_prop.location.getYaw()) {
      Packet.send_packet(player, {
        name: "entity_head_rotation",
        params: {
          entityId: this.entity_id,
          headYaw: pack_yaw(location.getYaw())
        }
      });
    }
  }

  componentDidUnmount() {
    Packet.send_packet(this.props.player, {
      name: "entity_destroy",
      params: {
        entityIds: [this.entity_id]
      }
    });
  }
}

module.exports = { FakePlayer };
