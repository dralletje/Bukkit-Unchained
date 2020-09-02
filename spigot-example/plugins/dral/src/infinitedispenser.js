let ItemFlag = Java.type("org.bukkit.inventory.ItemFlag");
let Enchantment = Java.type("org.bukkit.enchantments.Enchantment");

module.exports = (plugin) => {
  let plugin_item = ({
    itemstack: uncloned_itemstack,
    title,
    description,
    active,
  }) => {
    let itemstack = uncloned_itemstack.clone();
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

  plugin.command("infinite", {
    /** @param {org$bukkit$entity$Player} sender */
    onCommand: (sender) => {
      let item = sender.getInventory().getItemInMainHand();
      if (item == null) {
        return;
      }

      let infinite_item = plugin_item({
        itemstack: item,
        title: `Infinite ${item
          .getType()
          .toString()
          .replace(/_/g, " ")
          .toLowerCase()}`,
        description: ["In a dispenser this will never run out"],
        active: true,
      });
      sender.getInventory().setItemInMainHand(infinite_item);
    },
  });

  // plugin.command("nameitem", {
  //   onCommand: (sender) => {
  //     let item = sender.getInventory().getItemInMainHand();
  //     if (item == null) {
  //       return;
  //     }
  //     let infinite_item = plugin_item({
  //       itemstack: item,
  //       title: `Infinite ${item.getType().toString().replace(/_/g, ' ').toLowerCase()}`,
  //       description: ["In a dispenser this will never run out"],
  //       active: true
  //     })
  //     sender.getInventory().setItemInMainHand(infinite_item);
  //   }
  // });

  plugin.events.BlockDispense(async (event) => {
    let block = event.getBlock().getState();
    let dispenser_inventory = block.getInventory();

    let item = event.getItem();
    let item_meta = item.getItemMeta();
    let item_title = item_meta.getDisplayName();

    if (!item_title.startsWith("Infinite ")) {
      console.log("Not infinte:", item_title);
      return;
    }

    // let new_item = item.clone();
    // let new_item_meta = item_meta.clone();
    // new_item_meta.setDisplayName(item_title.replace(/$Infinite /, ''));
    // new_item.setItemMeta(new_item_meta)
    // event.setItem(new_item);

    // let new_items = Java.from(dispenser_inventory.getStorageContents()).map(() => item.clone());
    // dispenser_inventory.setStorageContents(new_items);

    setTimeout(() => {
      dispenser_inventory.addItem(item);
    }, 200);
  });
};
