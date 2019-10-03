let { ChatColor, Material, DyeColor, PatternType, Tag, Pattern } = require("bukkit");

let Bukkit = Java.type("org.bukkit.Bukkit");
let ItemStack = Java.type('org.bukkit.inventory.ItemStack');

let Mask = require('./Mask.js');

let InventoryHolder = Java.type('org.bukkit.inventory.InventoryHolder');
let WorldEdit_Mask_Holder = new (Java.extend(InventoryHolder, {}))();

let create_item_stack = ({
  material,
  display_name,
  lore,
  active,
}) => {
  let ItemFlag = Java.type('org.bukkit.inventory.ItemFlag');
  let Enchantment = Java.type('org.bukkit.enchantments.Enchantment');

  let itemstack = new ItemStack(material);
  let item_meta = itemstack.getItemMeta();

  if (display_name) {
    item_meta.setDisplayName(display_name);
  }
  if (lore) {
    item_meta.setLore(lore.split('\n'));
  }

  if (active) {
    item_meta.addEnchant(Enchantment.VANISHING_CURSE, 1, false);
  }

  item_meta.addItemFlags(ItemFlag.HIDE_ATTRIBUTES);
  item_meta.addItemFlags(ItemFlag.HIDE_ENCHANTS);

  itemstack.setItemMeta(item_meta);
  return itemstack;
}

let add_banner_meta = ({ item, base_color = DyeColor.WHITE, patterns = [] }) => {
  let item_meta = item.getItemMeta();

  item_meta.setBaseColor(base_color);
  item_meta.setPatterns(patterns);

  item.setItemMeta(item_meta);
  return item;
}

let create_mask_inventory = () => {
  return [
    create_item_stack({
      material: Material.WHITE_WOOL,
      display_name: 'WOOL - all',
      lore: `Matches all different types of wool`,
      active: true,
    }),
    create_item_stack({
      material: Material.OAK_PLANKS,
      display_name: 'Planks - all',
      lore: `Matches all different types of planks`,
      active: true,
    }),
    null,
    add_banner_meta({
      item: create_item_stack({
        material: Material.BANNER,
        display_name: 'Under',
        lore: `Matches all different types of wool`,
        active: true,
      }),
      base_color: DyeColor.WHITE,
      patterns: [
        new Pattern(DyeColor.BLACK, PatternType.STRIPE_CENTER),
        new Pattern(DyeColor.WHITE, PatternType.HALF_HORIZONTAL_MIRROR),
        new Pattern(DyeColor.BLACK, PatternType.RHOMBUS_MIDDLE),
      ]
    }),
  ]
}

module.exports = (plugin) => {
  let player_inventory_map = new Map();

  let worldedit_session_for_player = (player) => {
    return Java_type('com.sk89q.worldedit.WorldEdit').static.getInstance().getSessionManager().findByName(player.getName())
  }

  plugin.command("show-mask", async (player) => {
    let session = worldedit_session_for_player(player);
    let mask = Mask.from_java(session.getMask());
    console.log(`mask:`, mask);
    session.setMask(Mask.to_java(mask));
  })

  plugin.command("we-ui", async (player) => {
    let inventory = Bukkit.createInventory(WorldEdit_Mask_Holder, 54, "WorldEdit Mask");

    let contents = Java.from(player.getInventory().getContents());
    player_inventory_map.set(player.getName(), contents);
    player.getInventory().setContents([
      ...contents.slice(0, 9),
      ...create_mask_inventory(),
    ]);
    player.updateInventory();

    player.openInventory(inventory);
  });

  plugin.events.InventoryClick((event) => {
    console.log('Event!');
    let player = event.getWhoClicked();
    if (player.getOpenInventory().getInventory(0).getHolder() !== WorldEdit_Mask_Holder) {
      return;
    }

    console.log(`event.getResult().values():`, event.getResult().toString())

    setImmediate(() => {
      let contents = Java.from(player.getInventory().getContents());
      player_inventory_map.set(player.getName(), contents);
      player.getInventory().setContents([
        ...contents.slice(0, 9),
        ...create_mask_inventory(),
      ]);
      player.updateInventory();
    })
  })

  plugin.events.InventoryClose(event => {
    if (event.getInventory().getHolder() !== WorldEdit_Mask_Holder) {
      return;
    }

    let player = event.getPlayer();

    player.getInventory().setContents(player_inventory_map.get(player.getName()));
    player.updateInventory();
  });
}
