let { color, colorize } = require("./bootstrap/format_value.js");

// let Tag = Java.type('org.bukkit.Tag');
// let Tags = Object.keys(Tag).map(key => [key, Tag[key]]).filter(([key, value]) => value instanceof Tag)

module.exports = {
  get color() {
    console.log(`require('bukkit').color is deprecated, use .ChatColor instead`);
    console.log(`(new Error()).stack:`, (new Error()).stack)
    return color;
  },
  Bukkit: Java.type('org.bukkit.Bukkit'),
  Color: Java.type('org.bukkit.Color'),
  colorize: (text) => Java.type('org.bukkit.Color').translateAlternateColorCodes('&', text),
  Material: Java.type('org.bukkit.Material'),
  Biome: Java.type('org.bukkit.block.Biome'),
  ChatColor: Java.type('org.bukkit.ChatColor'),
  EntityType: Java.type('org.bukkit.entity.EntityType'),
  BlockFace: Java.type('org.bukkit.block.BlockFace'),
  Particle: Java.type('org.bukkit.Particle'),

  get Entity() {

  },

  DyeColor: Java.type('org.bukkit.DyeColor'),
  PatternType: Java.type('org.bukkit.block.banner.PatternType'),
  Tag: Java.type('org.bukkit.Tag'),
  Pattern: Java.type('org.bukkit.block.banner.Pattern')
};
