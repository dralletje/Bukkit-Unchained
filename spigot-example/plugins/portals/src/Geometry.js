let { sortBy } = require('lodash');
let { BlockFace } = require('bukkit');

class Plane {
  constructor(position, normal, options = {}) {
    this.position = position;
    this.normal = normal;
    this.plane_id = options.id || null;
  }

  show(player) {
    let n = 3;
    for (let i of range(0, n)) {
      debug_spawn({
        player: player,
        id: 2000 + this.plane_id * n + i,
        location: this.position.clone().add(this.normal.clone().multiply(i))
      });
    }
  }

  is_next_to(location) {
    let relative_location = location.clone().subtract(this.position);
    let angle = this.normal.angle(relative_location);

    return Math.abs(angle) < Math.PI * 0.5;
  }
}
let to_vector = (m) => m.toVector ? m.toVector() : m;
Plane.from_three_points = (p1, p2, p3, options = {}) => {
  let v1 = to_vector(p1);
  let v2 = to_vector(p2);
  let v3 = to_vector(p3);

  let vx = v1.clone().subtract(v2);
  let vy = v1.clone().subtract(v3);
  let normal = vx
    .crossProduct(vy)
    .normalize()
    .multiply(options.invert_normal ? -1 : 1);

  return new Plane(v1, normal, options);
};

let Face = {
  all_faces: Java.from(BlockFace.values()),
  get_closest_face_for_vector: (vector, faces = Face.all_faces) => {
    let angles = sortBy(faces, (face) => {
      return face.getDirection().angle(vector);
    });
    return angles[0];
  },
};

module.exports = { Plane, Face };
