let ItemStack = Java.type('org.bukkit.inventory.ItemStack');

module.exports = (plugin) => {
  plugin.command("use", {
    onCommand: (sender, command, alias, args) => {
      let block = sender.getTargetBlock(20);
      let material = block.getType();
      let itemstack = new ItemStack(material);

      sender.getInventory().setItemInMainHand(itemstack)
    },
  });
}
