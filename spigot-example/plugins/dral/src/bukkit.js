let ItemStack = Java.type("org.bukkit.inventory.ItemStack");
let ItemFlag = Java.type("org.bukkit.inventory.ItemFlag");
let Enchantment = Java.type("org.bukkit.enchantments.Enchantment");

let create_itemstack = (material, { name, lore, data }) => {
  let stack = new ItemStack(material);
  let meta = stack.getItemMeta();

  if (name) {
    meta.setDisplayName(name);
  }
  if (lore) {
    meta.setLora(lore);
  }

  if (data) {
    for (let [key, type, value] of data) {
      meta.getPersistentDataContainer().set(key, type, value);
    }
  }

  meta.addItemFlags(ItemFlag.HIDE_ATTRIBUTES);
  meta.addItemFlags(ItemFlag.HIDE_ENCHANTS);
  meta.addItemFlags(ItemFlag.HIDE_DESTROYS);
  meta.addItemFlags(ItemFlag.HIDE_PLACED_ON);
  meta.addItemFlags(ItemFlag.HIDE_POTION_EFFECTS);
  meta.addItemFlags(ItemFlag.HIDE_UNBREAKABLE);

  stack.setItemMeta(meta);
  return stack;
};
