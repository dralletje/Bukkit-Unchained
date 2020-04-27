let ItemStack = Java.type('org.bukkit.ItemStack');

module.exports = (plugin) => {
  plugin.command("take", {
    onCommand: (sender, command, alias, args) => {
      let block = sender.getTargetBlock(20);
      console.log(`block:`, block)
      let material = block.getType();
      console.log(`material:`, material)
      let itemstack = new ItemStack(material);
      console.log(`itemstack:`, itemstack)

      sender.getInventory().setItemInMainHand(itemstack)
    },
  });
}
