let { colorize, Material, Biome } = require('bukkit');
// let onTabComplete = require('./onTabComplete.js');
var { range } = require('lodash');
//
// var VISIBLE_COLORS = ['a', 'b', 'c', 'd', 'e', '2', '3', '4', '5', '6', '9'];
// var player_color = function(player) {
//   var playercolor = VISIBLE_COLORS[player.getDisplayName().charCodeAt(0) % VISIBLE_COLORS.length];
//   return color(playercolor);
// }

let get_locations_around = (i) => {
  let chunks = [];
  for (let x of range(-i, i)) {
    for (let y of range(-i, i)) {
      chunks.push([x, y]);
    }
  }
  return chunks;
}

module.exports = (plugin) => {
  plugin.command('get-slime-chunks', {
    onCommand: (sender, command, alias, args) => {
      let chunk = sender.getChunk();
      let [num_of_chunks_str = '3'] = args;
      let num_of_chunks = Number(num_of_chunks_str);

      if (Number.isNaN(num_of_chunks)) {
        throw new Error(`num_of_chunks not a numbers`);
      }

      let world = chunk.getWorld();
      let locations = get_locations_around(num_of_chunks);
      let chunks = locations.map(([x, z]) => {
        return {
          x: chunk.getX() + x,
          z: chunk.getZ() + z,
        };
      });

      for (let { x, z } of chunks) {
        let chunk = world.getChunkAt(x, z);
        let block_0 = chunk.getBlock(0, 0, 0);
        let x_0 = block_0.getX();
        let z_0 = block_0.getZ();

        let block_data = chunk.isSlimeChunk() ? Material.WHITE_WOOL.createBlockData() : Material.BLACK_WOOL.createBlockData()

        for (let x of range(16)) {
          for (let z of range(16)) {
            let block = world.getHighestBlockAt(x_0 + x, z_0 + z);
            sender.sendBlockChange(block.getLocation(), block_data)
            // world.setBiome(x_0 + x, z_0 + z, Biome.FOREST);
          }
        }
      }

      return true;
    },
    // onTabComplete: (sender, command, alias, args) => onTabComplete(plugin, sender, args),
  });
}
