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

  let portal_tool = (material) => {
    let tool = plugin_item({
      material: material,
      title: `Infinite ${material}`,
      description: ["In a dispenser this will never run out"],
      active: true
    });
    return tool;
  };

  plugin.command("infinite", {
    onCommand: (sender) => {
      let item = sender.getInventory().getItemInMainHand();
      console.log(`item:`, item);
      if (item == null) {
        return;
      }
      let infinite_item = portal_tool(item.getType())
      sender.getInventory().setItemInMainHand(infinite_item);
    }
  });

  plugin.events.BlockDispense(async (event) => {
    let block = event.getBlock().getState();
    let dispenser_inventory = block.getInventory();

    let item = event.getItem();
    let item_meta = item.getItemMeta();
    let item_title = item_meta.getDisplayName()

    if (!item_title.startsWith('Infinite ')) {
      console.log('Not infinte:', item_title)
      return;
    }

    // let new_items = Java.from(dispenser_inventory.getStorageContents()).map(() => item.clone());
    // dispenser_inventory.setStorageContents(new_items);

    setTimeout(() => {
      dispenser_inventory.addItem(item);
    }, 200)
  })
}
