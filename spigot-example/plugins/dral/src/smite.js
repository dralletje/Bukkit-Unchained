let Material = Java.type("org.bukkit.Material");

module.exports = (plugin) => {
  let plugin_item = ({ material, title, description, active }) => {
    let ItemStack = Java.type("org.bukkit.inventory.ItemStack");
    let ItemFlag = Java.type("org.bukkit.inventory.ItemFlag");
    let Enchantment = Java.type("org.bukkit.enchantments.Enchantment");

    let itemstack = new ItemStack(material);
    let itemmeta = itemstack.getItemMeta();

    itemmeta.setDisplayName(title);
    if (description != null) {
      if (typeof description === "string") {
        description = description.split("\n");
      }
      itemmeta.setLore(description);
    }
    itemmeta.addItemFlags(ItemFlag.HIDE_ATTRIBUTES);
    itemmeta.addItemFlags(ItemFlag.HIDE_ENCHANTS);

    if (active) {
      itemmeta.addEnchant(Enchantment.VANISHING_CURSE, 1, false);
    }

    itemstack.setItemMeta(itemmeta);
    return itemstack;
  };

  let TITLE = `Mjölnir`;
  let portal_tool = () => {
    let tool = plugin_item({
      material: Material.IRON_AXE,
      title: TITLE,
      description: [
        "I will strike down upon thee",
        "with great vengeance and furious anger",
        "those who would attempt to poison",
        "and destroy my brothers.",
        "- Ezekiel 25:17",
      ],
      active: true
    });
    return tool;
  };

  plugin.command("power-of-the-gods", {
    onCommand: (sender) => {
      let infinite_item = portal_tool();
      sender.getInventory().setItemInMainHand(infinite_item);
    }
  });

  plugin.events.PlayerInteract(async event => {
    let player = event.getPlayer();
    let block = event.getClickedBlock()
    let item = event.getItem()

    if (item == null) {
      return;
    }
    // if (event.getHand() !== EquipmentSlot.HAND) {
    //   return;
    // }
    if (item.getItemMeta().getDisplayName() !== TITLE) {
      return
    }

    event.setCancelled(true);

    player.getWorld().strikeLightning(player.getTargetBlock(100).getLocation());
    // player.getWorld().strikeLightningEffect(player.getTargetBlock(100).getLocation());
  });
}
