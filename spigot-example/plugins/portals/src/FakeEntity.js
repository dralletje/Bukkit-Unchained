let { random } = require('lodash');
let Packet = require('./Packet.js');

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
