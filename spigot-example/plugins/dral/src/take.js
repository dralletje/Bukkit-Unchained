let ItemStack = Java.type('org.bukkit.inventory.ItemStack');
let Material = Java.type('org.bukkit.Material');
let ChatColor = Java.type('org.bukkit.ChatColor');

module.exports = (plugin) => {
  plugin.command("use", {
    onCommand: (sender, command, alias, args) => {
      let block = sender.getTargetBlock(20);
      let material = block.getType();

      if (material === Material.PLAYER_HEAD || material === Material.PLAYER_WALL_HEAD) {
        let itemstack = new ItemStack(Material.PLAYER_HEAD);

        let meta = itemstack.getItemMeta();
        let player_profile = block.getState().getPlayerProfile()
        meta.setPlayerProfile(player_profile);

        let obfuscated = "Unknown Object".split('').map(x => {
          let color = Math.random() > 0.3 ? ChatColor.GRAY : ChatColor.MAGIC;
          return `${color}${x}`;
        }).join('')

        meta.setDisplayName(`${ChatColor.GRAY}${obfuscated}`);
        itemstack.setItemMeta(meta);
        sender.getInventory().setItemInMainHand(itemstack)
        return;
      }

      let itemstack = new ItemStack(material);
      sender.getInventory().setItemInMainHand(itemstack)
    },
  });
}
