module.exports = ({ plugin, commands, adapt }) => {
  let Material = adapt.get_class('org.bukkit.Material');
  let ItemStack = adapt.get_class('org.bukkit.inventory.ItemStack');
  let ChatColor = adapt.get_class('org.bukkit.ChatColor');

  commands.registerCommand({
    name: "give",
    onCommand: (player, args) => {
      let material = Material.matchMaterial(args[0]);

      if (material == null) {
        throw new commands.InvalidArgumentsError('No item found by that name');
      }

      player.getInventory().addItem(new ItemStack(material, 1));
      player.sendMessage(`${ChatColor.GREEN}Here you go, one ${material.name()}`);
    },
    // onTabComplete: (player, alias, args) => {
    //   if (args)
    // },
    arguments: [{ parser: 'minecraft:item_stack' }],
  });
}
