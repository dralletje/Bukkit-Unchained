let ItemStack = Java.type('org.bukkit.ItemStack');

module.exports = (plugin) => {
  plugin.command("take", {
    onCommand: (sender, command, alias, [warp_name]) => {
      let block = sender.getTargetBlock(20);
      let material = block.getType();
      let itemstack = new ItemStack(material);

      sender.setItemInMainHand(itemstack)
    },
  });
}
