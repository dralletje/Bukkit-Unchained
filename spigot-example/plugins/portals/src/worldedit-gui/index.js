let {
  ChatColor,
  Material,
  DyeColor,
  PatternType,
  // Tag,
  Pattern
} = require("bukkit");
let { chunk, flatten } = require("lodash");

let Tag = Java_type("com.sk89q.worldedit.world.block.BlockCategories").static;

let Bukkit = Java.type("org.bukkit.Bukkit");
let ItemStack = Java.type("org.bukkit.inventory.ItemStack");

let Mask = require("./Mask.js");

let InventoryHolder = Java.type("org.bukkit.inventory.InventoryHolder");
let WorldEdit_Mask_Holder = new (Java.extend(InventoryHolder, {}))();

let create_item_stack = ({ material, display_name, lore, active }) => {
  let ItemFlag = Java.type("org.bukkit.inventory.ItemFlag");
  let Enchantment = Java.type("org.bukkit.enchantments.Enchantment");

  let itemstack = new ItemStack(material);
  let item_meta = itemstack.getItemMeta();

  if (display_name) {
    item_meta.setDisplayName(display_name);
  }
  if (lore) {
    item_meta.setLore(lore.split("\n"));
  }

  if (active) {
    item_meta.addEnchant(Enchantment.VANISHING_CURSE, 1, false);
  }

  item_meta.addItemFlags(ItemFlag.HIDE_ATTRIBUTES);
  item_meta.addItemFlags(ItemFlag.HIDE_ENCHANTS);
  item_meta.addItemFlags(ItemFlag.HIDE_POTION_EFFECTS);

  itemstack.setItemMeta(item_meta);
  return itemstack;
};

let add_banner_meta = ({
  item,
  base_color = DyeColor.WHITE,
  patterns = []
}) => {
  let item_meta = item.getItemMeta();

  item_meta.setBaseColor(base_color);
  item_meta.setPatterns(patterns);

  item.setItemMeta(item_meta);
  return item;
};

let Special_Items = {
  WOOL: create_item_stack({
    material: Material.WHITE_WOOL,
    display_name: "WOOL - all",
    lore: `Matches all different types of wool`,
    active: true
  }),
  PLANKS: create_item_stack({
    material: Material.OAK_PLANKS,
    display_name: "Planks - all",
    lore: `Matches all different types of planks`,
    active: true
  }),
  EXISTING: create_item_stack({
    material: Material.GLASS,
    display_name: "Not air",
    lore: `Matches everything that is not air`,
    active: true
  }),
  SOLID: create_item_stack({
    material: Material.STONE,
    display_name: "Solids",
    lore: `Matches all material that would\nblock you from moving.`,
    active: true
  }),
  NOT: add_banner_meta({
    item: create_item_stack({
      material: Material.WHITE_BANNER,
      display_name: "Not",
      lore: `Operator that applies to\nthe item next to it.`,
      active: true
    }),
    base_color: DyeColor.WHITE,
    patterns: [new Pattern(DyeColor.BLACK, PatternType.STRIPE_CENTER)]
  }),
  UNDER: add_banner_meta({
    item: create_item_stack({
      material: Material.WHITE_BANNER,
      display_name: "Under",
      lore: `Operator that applies to\nthe item next to it.`,
      active: true
    }),
    base_color: DyeColor.WHITE,
    patterns: [
      new Pattern(DyeColor.BLACK, PatternType.STRIPE_CENTER),
      new Pattern(DyeColor.WHITE, PatternType.HALF_HORIZONTAL_MIRROR),
      new Pattern(DyeColor.BLACK, PatternType.RHOMBUS_MIDDLE)
    ]
  }),
  ABOVE: add_banner_meta({
    item: create_item_stack({
      material: Material.WHITE_BANNER,
      display_name: "Above",
      lore: `Operator that applies to\nthe item next to it.`,
      active: true
    }),
    base_color: DyeColor.WHITE,
    patterns: [
      new Pattern(DyeColor.BLACK, PatternType.STRIPE_CENTER),
      new Pattern(DyeColor.WHITE, PatternType.HALF_HORIZONTAL),
      new Pattern(DyeColor.BLACK, PatternType.RHOMBUS_MIDDLE)
    ]
  })
};
// AND: add_banner_meta({
//   item: create_item_stack({
//     material: Material.WHITE_BANNER,
//     display_name: 'And',
//     lore: `Operator that applies to\nthe item next to it.`,
//     active: true,
//   }),
//   base_color: DyeColor.WHITE,
//   patterns: [
//     new Pattern(DyeColor.BLACK, PatternType.CROSS),
//   ]
// }),

let WoolCategories = [Tag.BANNERS, Tag.BEDS, Tag.CARPETS];
let WoodCategories = [
  Tag.WOODEN_DOORS,
  Tag.WOODEN_FENCES,
  Tag.LEAVES,
  Tag.LOGS,
  Tag.PLANKS,
  Tag.SAPLINGS,
  Tag.SIGNS,
  Tag.WOODEN_SLABS,
  Tag.WOODEN_STAIRS,
  Tag.STANDING_SIGNS,
  Tag.WOODEN_TRAPDOORS,
  Tag.WOODEN_BUTTONS,
  Tag.WOODEN_PRESSURE_PLATES
];

let create_mask_inventory = () => {
  return [
    Special_Items.WOOL,
    Special_Items.PLANKS,
    null,
    Special_Items.EXISTING,
    Special_Items.SOLID,
    null,
    Special_Items.NOT,
    Special_Items.UNDER,
    Special_Items.ABOVE
  ];
};

let bukkit_adapter = Java_type("com.sk89q.worldedit.bukkit.BukkitAdapter")
  .static;
let RequestExtent = Java_type(
  "com.sk89q.worldedit.session.request.RequestExtent"
);

let expression_to_mask = expression => {
  if (expression.length === 0) {
    return { mask: { type: "null" }, rest: [] };
  }
  if (expression.length === 1) {
    let item = expression[0];
    if (Special_Items.EXISTING.equals(item)) {
      return {
        mask: {
          type: "com.sk89q.worldedit.function.mask.ExistingBlockMask",
          extent: new RequestExtent()
        },
        rest: []
      };
    }
    if (Special_Items.SOLID.equals(item)) {
      return {
        mask: {
          type: "com.sk89q.worldedit.function.mask.SolidBlockMask",
          extent: new RequestExtent()
        },
        rest: []
      };
    }
    return {
      mask: {
        type: "com.sk89q.worldedit.function.mask.BlockMask",
        extent: new RequestExtent(),
        blocks: [bukkit_adapter.asBlockState(item).toBaseBlock()]
      },
      rest: []
    };
  }

  if (expression.length >= 2) {
    let [first, ...rest] = expression;
    if (Special_Items.UNDER.equals(first)) {
      let result = expression_to_mask(rest);
      return {
        mask: {
          type: "com.sk89q.worldedit.function.mask.OffsetMask",
          offset: { x: 0, y: 1, z: 0 },
          mask: result.mask
        },
        rest: result.rest
      };
    }

    if (Special_Items.ABOVE.equals(first)) {
      let result = expression_to_mask(rest);
      return {
        mask: {
          type: "com.sk89q.worldedit.function.mask.OffsetMask",
          offset: { x: 0, y: -1, z: 0 },
          mask: result.mask
        },
        rest: result.rest
      };
    }

    if (Special_Items.NOT.equals(first)) {
      let result = expression_to_mask(rest);
      return {
        mask: {
          type: "com.sk89q.worldedit.function.mask.Masks$1",
          mask: result.mask
        },
        rest: result.rest
      };
    }

    if (Special_Items.PLANKS.equals(first)) {
      let [second, ...event_more_rest] = rest;
      let block_type = bukkit_adapter.asBlockType(second.getType());
      let category = WoodCategories.find(category =>
        category.contains(block_type)
      );
      if (category) {
        return {
          mask: {
            type: "com.sk89q.worldedit.function.mask.BlockCategoryMask",
            extent: new RequestExtent(),
            category: category
          },
          rest: event_more_rest
        };
      } else {
        return { type: "null" };
      }
    }

    if (Special_Items.WOOL.equals(first)) {
      let [second, ...event_more_rest] = rest;
      let block_type = bukkit_adapter.asBlockType(second.getType());
      let category = WoolCategories.find(category =>
        category.contains(block_type)
      );
      if (category) {
        return {
          mask: {
            type: "com.sk89q.worldedit.function.mask.BlockCategoryMask",
            extent: new RequestExtent(),
            category: category
          },
          rest: event_more_rest
        };
      } else {
        return { type: "null" };
      }
    }

    return {
      mask: expression_to_mask([first]),
      rest: rest
    };
  }

  throw new Error("Huh, expression length is " + expression.length);
};

let mask_to_item_stacks = mask => {
  if (mask.type === "com.sk89q.worldedit.function.mask.MaskUnion") {
    return flatten(mask.masks.map(x => mask_to_item_stacks(x)));
  }
  if (mask.type === "com.sk89q.worldedit.function.mask.MaskIntersection") {
    return mask.masks.map(x => flatten(mask_to_item_stacks(x)));
  }
  // Negation
  if (mask.type === "com.sk89q.worldedit.function.mask.Masks$1") {
    return [Special_Items.NOT, ...flatten(mask_to_item_stacks(mask.mask))];
  }

  if (mask.type === "com.sk89q.worldedit.function.mask.BlockCategoryMask") {
    if (WoodCategories.includes(mask.category)) {
      let block_type = Array.from(mask.category.getAll())[0];
      return [
        Special_Items.PLANKS,
        create_item_stack({
          material: bukkit_adapter.adapt(block_type),
        })
      ];
    }
    if (WoolCategories.includes(mask.category)) {
      let block_type = Array.from(mask.category.getAll())[0];
      return [
        Special_Items.WOOL,
        create_item_stack({
          material: bukkit_adapter.adapt(block_type),
        })
      ];
    }
    console.log("Hmmm", mask.category);
    return [];
  }

  if (mask.type === 'com.sk89q.worldedit.function.mask.ExistingBlockMask') {
    return [Special_Items.EXISTING];
  }
  if (mask.type === 'com.sk89q.worldedit.function.mask.SolidBlockMask') {
    return [Special_Items.SOLID];
  }

  if (mask.type === "com.sk89q.worldedit.function.mask.OffsetMask") {
    if (mask.offset.z !== 0 || mask.offset.x !== 0) {
      return [];
    }
    let above_or_below =
      mask.offset.y < 0 ? Special_Items.ABOVE : Special_Items.UNDER;
    return [above_or_below, ...flatten(mask_to_item_stacks(mask.mask))];
  }

  if (mask.type === "com.sk89q.worldedit.function.mask.BlockMask") {
    let itemstack = mask.blocks.map(block => {
      let material = bukkit_adapter.adapt(block.getBlockType());
      return create_item_stack({
        material: material
      });
    });
    return [itemstack];
  }

  console.log(`UNKNOWN MASK:`, mask);
  return [];
};

module.exports = plugin => {
  let player_inventory_map = new Map();

  let worldedit_session_for_player = player => {
    return Java_type("com.sk89q.worldedit.WorldEdit")
      .static.getInstance()
      .getSessionManager()
      .findByName(player.getName());
  };

  plugin.command("show-mask", async player => {
    let session = worldedit_session_for_player(player);
    let mask = Mask.from_java(session.getMask());
    console.log(`MASK:`, mask);
    if (mask.type !== "null") {
      session.setMask(Mask.to_java(mask));
    }
  });

  plugin.command("we-ui", async player => {
    let mask_inventory = Bukkit.createInventory(
      WorldEdit_Mask_Holder,
      54,
      "WorldEdit Mask"
    );

    let mask = Mask.from_java(worldedit_session_for_player(player).getMask());
    let item_stacks = mask_to_item_stacks(mask);
    mask_inventory.setStorageContents(
      flatten(item_stacks.map(group => [...group, null]))
    );

    let player_contents = Java.from(player.getInventory().getContents());
    player_inventory_map.set(player.getName(), player_contents);
    player
      .getInventory()
      .setContents([
        ...player_contents.slice(0, 9),
        ...create_mask_inventory()
      ]);
    player.updateInventory();

    player.openInventory(mask_inventory);
  });

  plugin.events.InventoryClick(event => {
    let player = event.getWhoClicked();
    if (
      player
        .getOpenInventory()
        .getInventory(0)
        .getHolder() !== WorldEdit_Mask_Holder
    ) {
      return;
    }

    setImmediate(() => {
      let contents = Java.from(player.getInventory().getContents());
      player_inventory_map.set(player.getName(), contents);
      player
        .getInventory()
        .setContents([...contents.slice(0, 9), ...create_mask_inventory()]);
      player.updateInventory();
    });
  });

  plugin.events.InventoryClose(event => {
    if (event.getInventory().getHolder() !== WorldEdit_Mask_Holder) {
      return;
    }

    let contents = Java.from(event.getInventory().getContents());
    let as_rows = chunk(contents, 9);

    let separate_expressions = [];
    for (let row of as_rows) {
      let current_set = [];
      for (let item of row) {
        if (item == null) {
          if (current_set.length > 0) {
            separate_expressions.push(current_set);
            current_set = [];
          }
          continue;
        } else {
          current_set = [...current_set, item];
        }
      }
    }

    let new_mask = {
      type: "com.sk89q.worldedit.function.mask.MaskIntersection",
      masks: separate_expressions.map(expression => {
        let expressions_left = expression;
        let masks_to_union = [];
        while (expressions_left.length > 0) {
          console.log(`expression:`, expression)
          let { mask, rest } = expression_to_mask(expression);
          console.log(`mask, rest:`, mask, rest)
          masks_to_union = [...masks_to_union, mask];
          expressions_left = rest;
        }
        return {
          type: "com.sk89q.worldedit.function.mask.MaskUnion",
          masks: masks_to_union
        };
      })
    };

    let player = event.getPlayer();
    worldedit_session_for_player(player).setMask(Mask.to_java(new_mask));

    player.sendMessage(`${ChatColor.GREEN}Set your new mask!`);

    player
      .getInventory()
      .setContents(player_inventory_map.get(player.getName()));
    player.updateInventory();
  });
};
