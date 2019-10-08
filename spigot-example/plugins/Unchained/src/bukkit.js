// let Tag = Java.type('org.bukkit.Tag');
// let Tags = Object.keys(Tag).map(key => [key, Tag[key]]).filter(([key, value]) => value instanceof Tag)

let  ChatColor = Java.type("org.bukkit.ChatColor");

let plugin = Polyglot.import('plugin');

let TAG = `${ChatColor.DARK_RED}[${plugin.getName()}]`;

let Packet = require('./BukkitModules/Packet.js');

let Unchained = {
  handle_error: ({
    error,
    location = `unknown location`,
    name = "",
    player = null
  }) => {
    try {
      // prettier-ignore
      console.log(`${TAG} ${ChatColor.RED}Error for ${ChatColor.BLUE}${player && player.getName()} ${ChatColor.RED}in ${location} ${name && `(${name})`}:`);
      console.log(error);
      if (player && player.sendMessage) {
        // prettier-ignore
        player.sendMessage(`${TAG} ${ChatColor.RED}Error in ${location } ${name && `(${name})`}:`)
        player.sendMessage(`${TAG} ${ChatColor.RED}${error.message}`)
      }
    } catch (error) {
      // This gets called if there is something to do with the
      // `event.getPlayer()` stuff, not sure if this will ever call
      // BUT IF it does, I want to catch it!!

      // prettier-ignore
      console.log(TAG, `${ChatColor.RED}Error inside the error handling, ${ChatColor.ORANGE} this is a serious problem:`);
      console.log(TAG, `error:`, ChatColor.RED, error);
      console.log(TAG, `player:`, ChatColor.RED, player);
      console.log(TAG, `location:`, ChatColor.RED, location);
      console.log(TAG, `name:`, ChatColor.RED, name)
    }
  }
};

module.exports = {
  Bukkit: Java.type("org.bukkit.Bukkit"),
  Color: Java.type("org.bukkit.Color"),
  colorize: text =>
    Java.type("org.bukkit.Color").translateAlternateColorCodes("&", text),
  Material: Java.type("org.bukkit.Material"),
  Biome: Java.type("org.bukkit.block.Biome"),
  ChatColor: Java.type("org.bukkit.ChatColor"),
  EntityType: Java.type("org.bukkit.entity.EntityType"),
  BlockFace: Java.type("org.bukkit.block.BlockFace"),
  Particle: Java.type("org.bukkit.Particle"),

  Unchained: Unchained,
  Packet: Packet,

  get Entity() {},

  DyeColor: Java.type("org.bukkit.DyeColor"),
  PatternType: Java.type("org.bukkit.block.banner.PatternType"),
  Tag: Java.type("org.bukkit.Tag"),
  Pattern: Java.type("org.bukkit.block.banner.Pattern")
};
