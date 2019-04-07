let { color, colorize } = require("./bootstrap/format_value.js");

module.exports = {
  get color() {
    console.log(`require('bukkit').color is deprecated, use .ChatColor instead`);
    console.log(`(new Error()).stack:`, (new Error()).stack)
    return color;
  },
  Color: Java.type('org.bukkit.Color'),
  colorize: (text) => Java.type('org.bukkit.Color').translateAlternateColorCodes('&', text),
  Material: Java.type('org.bukkit.Material'),
  Biome: Java.type('org.bukkit.block.Biome'),
  ChatColor: Java.type('org.bukkit.ChatColor'),
  EntityType: Java.type('org.bukkit.entity.EntityType'),
  BlockFace: Java.type('org.bukkit.block.BlockFace'),
  Particle: Java.type('org.bukkit.Particle'),

  get Entity() {

  }
};
