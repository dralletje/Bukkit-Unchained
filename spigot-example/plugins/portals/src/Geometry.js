let { sortBy } = require('lodash');
let math = require("mathjs");
let { BlockFace } = require('bukkit');

let { precondition } = require('./util.js');

let Vector = Java.type("org.bukkit.util.Vector");
let Location = Java.type("org.bukkit.Location");

let JavaVector = {
  to_js: vector => {
    return [vector.getX(), vector.getY(), vector.getZ()];
  },
  from_js: vector => {
    return new Vector(vector[0], vector[1], vector[2]);
  }
};

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

class TransformationMatrix {
  constructor(matrix) {
    // TODO Check if matrix is valid
    // TODO Also check if it only has rotate + translate,
    // .... as apply_to_direction only works with that

    this.matrix = matrix;
  }

  apply_to_direction(direction_vector) {
    let T = this.matrix;
    let direction_only_transform = [
      [T[0][0], T[0][1], T[0][2]],
      [T[1][0], T[1][1], T[1][2]],
      [T[2][0], T[2][1], T[2][2]],
    ];
    let [x, y, z] = math.multiply(JavaVector.to_js(direction_vector), direction_only_transform);
    return new Vector(x, y, z)
  }

  apply_to_location(location) {
    let [x, y, z, _] = math.multiply([...JavaVector.to_js(location), 1], this.matrix);
    let new_location = new Location(location.getWorld(), x, y, z);
    new_location.setDirection(this.apply_to_direction(location.getDirection()));
    return new_location;
  }
}
TransformationMatrix.from_vector_mappings = (transformed_vectors) => {
  // prettier-ignore
  precondition(transformed_vectors.length === 4, `You need to provide 4 transformed vectors, you provided ${transformed_vectors.length}`);

  let X_from = math.transpose(
    transformed_vectors.map(x => {
      return [...x.from, 1];
    })
  );
  let X_to = math.transpose(
    transformed_vectors.map(x => {
      return [...x.to, 1];
    })
  );

  let inverse = math.inv(X_from);
  let T = math.transpose(math.multiply(X_to, inverse));
  return new TransformationMatrix(T);
}

module.exports = { Plane, Face, TransformationMatrix, JavaVector };
