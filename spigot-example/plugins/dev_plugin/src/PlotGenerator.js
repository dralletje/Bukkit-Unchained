let ChunkGenerator = Java.type("org.bukkit.generator.ChunkGenerator");
let Location = Java.type("org.bukkit.Location");
let World = Java.type("org.bukkit.World");
let Material = Java.type("org.bukkit.Material");

let get_private_method = (_class, object, field_name, ...parameters) => {
  let method = _class.getDeclaredMethod(field_name, ...parameters);
  method.setAccessible(true);
  return (...args) => method.invoke(object, ...args);
};

let modulo = (x, n) => (x % n < 0 ? n + (x % n) : x % n);

module.exports = plugin => {
  let set_region = ({ chunk_data, from, to, material }) => {
    // prettier-ignore
    if ((from.x == null) !== (to.x == null)) throw new Error(`Either from.x and to.x should be defined, or neither. Got from.x: ${from.x} and to.x: ${to.x}`);
    // prettier-ignore
    if ((from.y == null) !== (to.y == null)) throw new Error(`Either from.y and to.y should be defined, or neither. Got from.y: ${from.y} and to.y: ${to.y}`);
    // prettier-ignore
    if ((from.z == null) !== (to.z == null)) throw new Error(`Either from.z and to.z should be defined, or neither. Got from.z: ${from.z} and to.z: ${to.z}`);

    if (from.x == null) {
      from = { ...from, x: 0 };
      to = { ...to, x: 16 };
    }
    if (from.y == null) {
      from = { ...from, y: 0 };
      to = { ...to, y: 255 };
    }
    if (from.z == null) {
      from = { ...from, z: 0 };
      to = { ...to, z: 16 };
    }
    chunk_data.setRegion(from.x, from.y, from.z, to.x, to.y, to.z, material);
  };

  let { fr, grid } = require('./util/block_grid.js');
  let set_region_from_top = ({ chunk_data, map, materials, y }) => {
    let regions = map({ height: 16, width: 16 });
    for (let region of regions) {
      let material = materials[region.name];
      if (material == null) {
        // prettier-ignore
        throw new Error(`No material found called '${region.name}' in material mapping`);
      }
      set_region({
        chunk_data,
        from: { x: region.from.horizontal, y: y.from, z: region.from.vertical },
        to: { x: region.to.horizontal, y: y.to, z: region.to.vertical },
        material: material,
      });
    }
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
          set_region_from_top({
            chunk_data: chunk_data,
            map: grid`
              black     white    black ${fr(1)}
              white     white    white ${2}
              black     white    black ${fr(1)}
              ${fr(1)}  ${2}     ${fr(1)}
            `,
            materials: {
              black: Material.BLACK_WOOL,
              white: Material.WHITE_WOOL,
            },
            y: { from: 0, to: GROUND_HEIGHT }
          });
        } else if (x_relative === 0) {
          set_region_from_top({
            chunk_data: chunk_data,
            map: grid`
              red      white     red ${fr(1)}
              red      white     red ${2}
              red      white     red ${fr(1)}
              ${fr(1)}  ${2}   ${fr(1)}
            `,
            materials: {
              red: Material.RED_WOOL,
              white: Material.WHITE_WOOL,
            },
            y: { from: 0, to: GROUND_HEIGHT }
          });
          // set_region({
          //   chunk_data,
          //   from: { y: 0 },
          //   to: { y: GROUND_HEIGHT },
          //   material: Material.RED_WOOL
          // });
          // set_region({
          //   chunk_data,
          //   from: { x: 7, y: 0 },
          //   to: { x: 8, y: GROUND_HEIGHT },
          //   material: Material.WHITE_WOOL
          // });
        } else if (z_relative === 0) {
          set_region_from_top({
            chunk_data: chunk_data,
            map: grid`
              red      red     red ${fr(1)}
              white    white   white ${2}
              red      red     red ${fr(1)}
              ${fr(1)} ${2}   ${fr(1)}
            `,
            materials: {
              red: Material.RED_WOOL,
              white: Material.WHITE_WOOL,
            },
            y: { from: 0, to: GROUND_HEIGHT }
          });
          // set_region({
          //   chunk_data,
          //   from: { x: 0, y: 0, z: 0 },
          //   to: { x: 16, y: GROUND_HEIGHT, z: 16 },
          //   material: Material.RED_WOOL
          // });
          // set_region({
          //   chunk_data,
          //   from: { x: 0, y: 0, z: 7 },
          //   to: { x: 16, y: GROUND_HEIGHT, z: 8 },
          //   material: Material.WHITE_WOOL
          // });
        }
      } else {
        set_region({
          chunk_data,
          from: { x: 0, y: 0, z: 0 },
          to: { x: 16, y: GROUND_HEIGHT, z: 16 },
          material: Material.WHITE_WOOL
        });

        if (x_relative === 1) {
          set_region({
            chunk_data,
            from: { x: 0, y: 0, z: 0 },
            to: { x: 1, y: GROUND_HEIGHT + WALL_HEIGHT, z: 16 },
            material: Material.WHITE_WOOL
          });
        }
        if (x_relative === 4) {
          set_region({
            chunk_data,
            from: { x: 15, y: 0, z: 0 },
            to: { x: 16, y: GROUND_HEIGHT + WALL_HEIGHT, z: 16 },
            material: Material.WHITE_WOOL
          });
        }
        if (z_relative === 1) {
          set_region({
            chunk_data,
            from: { x: 0, y: 0, z: 0 },
            to: { x: 16, y: GROUND_HEIGHT + WALL_HEIGHT, z: 1 },
            material: Material.WHITE_WOOL
          });
        }
        if (z_relative === 4) {
          set_region({
            chunk_data,
            from: { x: 0, y: 0, z: 15 },
            to: { x: 16, y: GROUND_HEIGHT + WALL_HEIGHT, z: 16 },
            material: Material.WHITE_WOOL
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
  let createChunkData = get_private_method(
    ChunkGenerator.class,
    generator,
    "createChunkData",
    World.class
  );
  return generator;
};
