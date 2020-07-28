let ItemStack = Java.type("org.bukkit.inventory.ItemStack");
let Material = Java.type("org.bukkit.Material");
let ChatColor = Java.type("org.bukkit.ChatColor");
let ItemFlag = Java.type("org.bukkit.inventory.ItemFlag");

export let create_itemstack = (material, { name, lore, data }) => {
  let stack = new ItemStack(material);
  let meta = stack.getItemMeta();

  if (name) {
    meta.setDisplayName(name);
  }
  if (lore) {
    meta.setLore(lore);
  }

  if (data) {
    for (let [{ key, type }, value] of data) {
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

let PersistentDataType = Java.type("org.bukkit.persistence.PersistentDataType");
let NamespacedKey = Java.type("org.bukkit.NamespacedKey");
export let DataKey = ({ plugin, name, type, default: default_value }) => {
  let key = new NamespacedKey(plugin, name);
  return {
    key: key,
    type: type,
    get: (container) => {
      try {
        return container.get(key, type) || default_value;
      } catch (error) {
        console.log(`error:`, error)
        return {};
      }
    }
  };
};
DataKey.STRING = PersistentDataType.STRING;
DataKey.INTEGER = PersistentDataType.INTEGER;
