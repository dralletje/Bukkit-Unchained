let ChunkGenerator = Java.type('org.bukkit.generator.ChunkGenerator');
let Location = Java.type("org.bukkit.Location");
let World = Java.type("org.bukkit.World");
let Material = Java.type("org.bukkit.Material");

let get_private_method = (_class, object, field_name, ...parameters) => {
  try {
    let method = _class.getDeclaredMethod(field_name, ...parameters);
    method.setAccessible(true);
    return (...args) => method.invoke(object, ...args);
  } catch (error) {
    console.log(`Error while called method ${field_name} on `, object);
    console.log(error)
  }
};

let modulo = (x, n) => ((x % n) < 0) ? (n + (x % n)) : x % n

module.exports = (plugin) => {
  let set_region = ({ chunk_data, from, to, material }) => {
    chunk_data.setRegion(from.x, from.y, from.z, to.x, to.y, to.z, material);
  }

  let MyChunkGenerator = Java.extend(ChunkGenerator, {
    getFixedSpawnLocation: (world, random) => {
      return new Location(world, 8, 50, 8);
    },
  	canSpawn: (world, x, z) => {
      return true;
    },
    generateChunkData(world, random, x, z, biome) {
      // TODO Make plots
      let chunk_data = createChunkData(world);

      let x_relative = modulo(x, 5);
      let z_relative = modulo(z, 5);

      let WALL_HEIGHT = 5;
      let GROUND_HEIGHT = 49;

      if (x_relative === 0 || z_relative === 0) {
        if (x_relative === 0 && z_relative === 0) {
          set_region({
            chunk_data,
            from: { x: 0, y: 0, z: 0 },
            to: { x: 16, y: GROUND_HEIGHT, z: 16 },
            material: Material.BLACK_WOOL,
          })
        } else if (x_relative === 0) {
          set_region({
            chunk_data,
            from: { x: 0, y: 0, z: 0 },
            to: { x: 16, y: GROUND_HEIGHT, z: 16 },
            material: Material.RED_WOOL,
          });
          set_region({
            chunk_data,
            from: { x: 7, y: 0, z: 0 },
            to: { x: 8, y: GROUND_HEIGHT, z: 16 },
            material: Material.WHITE_WOOL,
          });
        } else if (z_relative === 0) {
          set_region({
            chunk_data,
            from: { x: 0, y: 0, z: 0 },
            to: { x: 16, y: GROUND_HEIGHT, z: 16 },
            material: Material.RED_WOOL,
          });
          set_region({
            chunk_data,
            from: { x: 0, y: 0, z: 7 },
            to: { x: 16, y: GROUND_HEIGHT, z: 8 },
            material: Material.WHITE_WOOL,
          });
        }
      } else {
        set_region({
          chunk_data,
          from: { x: 0, y: 0, z: 0 },
          to: { x: 16, y: GROUND_HEIGHT, z: 16 },
          material: Material.WHITE_WOOL,
        });

        if (x_relative === 1) {
          set_region({
            chunk_data,
            from: { x: 0, y: 0, z: 0 },
            to: { x: 1, y: GROUND_HEIGHT + WALL_HEIGHT, z: 16 },
            material: Material.WHITE_WOOL,
          });
        }
        if (x_relative === 4) {
          set_region({
            chunk_data,
            from: { x: 15, y: 0, z: 0 },
            to: { x: 16, y: GROUND_HEIGHT + WALL_HEIGHT, z: 16 },
            material: Material.WHITE_WOOL,
          });
        }
        if (z_relative === 1) {
          set_region({
            chunk_data,
            from: { x: 0, y: 0, z: 0 },
            to: { x: 16, y: GROUND_HEIGHT + WALL_HEIGHT, z: 1 },
            material: Material.WHITE_WOOL,
          });
        }
        if (z_relative === 4) {
          set_region({
            chunk_data,
            from: { x: 0, y: 0, z: 15 },
            to: { x: 16, y: GROUND_HEIGHT + WALL_HEIGHT, z: 16 },
            material: Material.WHITE_WOOL,
          });
        }
      }

      return chunk_data;
    },
    isParallelCapable() {
      return false;
    }
  });

  let generator = new MyChunkGenerator();
  let createChunkData = get_private_method(ChunkGenerator.class, generator, 'createChunkData', World.class)
  return generator;
}
