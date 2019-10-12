let ChunkGenerator = Java.type('org.bukkit.generator.ChunkGenerator');
let Location = Java.type("org.bukkit.Location");
let World = Java.type("org.bukkit.World");
let Material = Java.type("org.bukkit.Material");

let get_private_method = (_class, object, field_name, ...parameters) => {
  try {
    console.log(`object:`, object)
    let method = _class.getDeclaredMethod(field_name, ...parameters);
    console.log(`method:`, method)
    method.setAccessible(true);
    return (...args) => method.invoke(object, ...args);
  } catch (error) {
    console.log(`Error while called method ${field_name} on `, object);
    console.log(error)
  }
};

module.exports = (plugin) => {
  let MyChunkGenerator = Java.extend(ChunkGenerator, {
    getFixedSpawnLocation: (world, random) => {
      return new Location(world, 8, 50, 8);
    },
  	canSpawn: (world, x, z) => {
      return true;
    },
    generateChunkData(world, random, x, z, biome) {
      console.log('#1')
      let chunk_data = createChunkData(world);
      console.log('#2')
      chunk_data.setRegion(0, 0, 0, 16, 49, 16, Material.WHITE_WOOL);
      console.log('#3')
      return chunk_data;
    },
    isParallelCapable() {
      return false;
    }
  });

  let generator = new MyChunkGenerator();
  let createChunkData = get_private_method(ChunkGenerator.class, generator, 'createChunkData', World.class)
  console.log(`createChunkData:`, createChunkData)
  return generator;
}
