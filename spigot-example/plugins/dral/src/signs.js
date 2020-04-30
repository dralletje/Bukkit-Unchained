let ChatColor = Java.type('org.bukkit.ChatColor');
let Material = Java.type('org.bukkit.Material');

module.exports = (plugin) => {
  plugin.events.SignChange(event => {
    let block = event.getBlock();
    let lines = event.getLines();

    let colored_lines = Java.from(lines).map(line => ChatColor.translateAlternateColorCodes("&", line));

    if (block.getType() === Material.DARK_OAK_WALL_SIGN || block.getType() === Material.DARK_OAK_SIGN) {
      colored_lines = colored_lines.map(line => `${ChatColor.WHITE}${line}`)
    }

    colored_lines.forEach((line, index) => {
      event.setLine(index, line)
    })
  })
}
