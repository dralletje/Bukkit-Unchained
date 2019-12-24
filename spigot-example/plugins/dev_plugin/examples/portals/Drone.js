let { range, sortBy } = require('lodash');
let BlockFace = Java.type("org.bukkit.block.BlockFace");
let Particle = Java.type("org.bukkit.Particle");
let Vector = Java.type('org.bukkit.util.Vector');

let { delay } = require('./util.js');

let get_face_for_vector = (vector) => {
  let angles = sortBy(BlockFace.values(), (face) => {
    return face.getDirection().angle(vector);
  });
  return angles[0];
}

let block_center = (location) => {
  let new_loc = location.clone();
  new_loc.setX(new_loc.getX() + 0.5);
  new_loc.setZ(new_loc.getZ() + 0.5);
  return new_loc;
}

let axis = {
  X: {
    set: (vector, value) => vector.setX(value),
    get: (vector) => vector.getX(),
  },
  Y: {
    set: (vector, value) => vector.setY(value),
    get: (vector) => vector.getY(),
  },
  Z: {
    set: (vector, value) => vector.setZ(value),
    get: (vector) => vector.getZ(),
  },
};

class Drone {
  constructor({
    player,
    initial_location = player.getLocation(),
    initial_direction = initial_location.getDirection(),
  }) {
    this.player = player;
    this.state = {
      speed: 5,
      location: initial_location,
      direction: initial_direction.normalize(),
    };

    let PoweredMinecart = Java.type('org.bukkit.entity.minecart.PoweredMinecart');

    if (Drone.isDevelopment) {
      this.minecart = initial_location.getWorld().spawn(initial_location, PoweredMinecart); // EntityType.MINECART);
      this.minecart.setGravity(false);
      this.minecart.setGlowing(true);
    } else {
      this.minecart = {
        teleport: () => {},
        isDead: () => false,
        remove: () => {},
      }
    }

    this.updateDispenser();
  }

  setSpeed(speed) {
    this.state.speed = speed;
  }

  updateDispenser() {
    if (Drone.isDevelopment) {
        let { location, direction } = this.state;
        // this.dispenser.setFacing(get_face_for_vector(direction));
        // this.player.sendBlockChange(location, this.dispenser);
        this.minecart.teleport(block_center(location));
    }
  }

  async delay(ms) {
    if (Drone.isDevelopment === true) {
      await delay(ms / this.state.speed);
    } else {
      return;
    }
  }

  async move(amount, direction) {
    if (this.minecart.isDead()) {
      throw new Error(`Drone was killed using other plugin or command`);
    }

    let new_direction = (
      typeof direction === 'function'
      ? get_face_for_vector(direction(this.state.direction.clone())).getDirection()
      : direction
    );
    let old_location = this.state.location;
    this.state.location = this.state.location.clone().add(new_direction.multiply(amount));

    this.updateDispenser();

    await this.delay(1000);
  }
  async peekBlock(amount, direction) {
    let new_direction = direction(this.state.direction.clone());
    let peek_location = this.state.location.clone().add(new_direction.multiply(amount));

    if (Drone.isDevelopment === true) {
      let MinecartClass = Java.type('org.bukkit.entity.minecart.PoweredMinecart').class;
      let peek_minecart = peek_location.getWorld().spawn(block_center(peek_location), MinecartClass); // EntityType.MINECART);
      peek_minecart.setGravity(false);
      peek_minecart.setGlowing(true);

      await this.delay(500);

      peek_minecart.remove();
    }

    return peek_location.getBlock();
  }
  lookTo(direction) {
    this.state.direction = get_face_for_vector(direction(this.state.direction.clone())).getDirection();
  }
  getLocation() {
    return this.state.location.clone();
  }
  getBlock() {
    return this.state.location.getBlock();
  }
  sendPlayer(player, block_data) {
    player.sendBlockChange(this.getLocation(), block_data)
  }

  async *cuboid_fast(steps) {
    yield* this.cuboid(steps);
  }

  async *cuboid(steps) {
    let [current, ...next] = steps;
    if (current == null) {
      yield this.getLocation();
    } else {
      let keys = Object.keys(current);
      if (keys.length !== 1) {
        // prettier-ignore
        throw new Error(`Expecting only one key in a direction object`);
      }

      let amount = current[keys[0]];
      let direction_fn = Drone[keys[0].toUpperCase()];
      let direction = typeof direction_fn === 'function' ? direction_fn(this.state.direction.clone()) : direction_fn;

      for (let i of range(0, amount)) {
        yield* this.cuboid(next);
        await this.move(1, direction);
      }
      // drone.setSpeed(5)

      await this.move(amount, direction.clone().multiply(-1));
    }
  }

  exeunt() {
    let temp_loc = block_center(this.state.location);
    temp_loc.setY(temp_loc.getY() + 1);
    temp_loc.getWorld().spawnParticle(Particle.HEART, temp_loc, 1);

    this.minecart.remove();
  }
}

Drone.FORWARD = (vector) => vector;
Drone.BACKWARD = (vector) => vector.multiply(-1);
Drone.UP = new Vector(0, 1, 0);
Drone.DOWN = new Vector(0, -1, 0);
Drone.LEFT = (vector) => vector.rotateAroundY(Math.PI * 0.5);
Drone.RIGHT = (vector) => vector.rotateAroundY(Math.PI * -0.5);

// Drone.isDevelopment = true;
Drone.isDevelopment = false;

module.exports = { Drone };
