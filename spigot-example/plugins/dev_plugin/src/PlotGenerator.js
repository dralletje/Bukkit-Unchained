let ChunkGenerator = Java.type('org.bukkit.generator.ChunkGenerator');
let Location = Java.type("org.bukkit.Location");

module.exports = () => {
  let MyChunkGenerator = Java.extend(ChunkGenerator, {
    getFixedSpawnLocation: (world, random) => {
      return new Location(world, 8, 80, 8);
    },
  	canSpawn: (world, x, z) => {
      return true;
    },
    generateChunkData(world, random, x, z, biome) {
      console.log(`this:`, this);
      return null;
    }
  });


}
