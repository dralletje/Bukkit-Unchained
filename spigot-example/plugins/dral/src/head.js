let _ = require("lodash");
let { Worker } = require("worker_threads");
let { chat } = require("./chat.js");

let UUID = Java.type("java.util.UUID");

let ItemStack = Java.type("org.bukkit.inventory.ItemStack");
let Material = Java.type("org.bukkit.Material");
let ChatColor = Java.type("org.bukkit.ChatColor");
let ItemFlag = Java.type("org.bukkit.inventory.ItemFlag");
let Enchantment = Java.type("org.bukkit.enchantments.Enchantment");
// prettier-ignore
let ProfileProperty = Java.type("com.destroystokyo.paper.profile.ProfileProperty");
let InventoryHolder = Java.type("org.bukkit.inventory.InventoryHolder");
let PersistentDataType = Java.type("org.bukkit.persistence.PersistentDataType");
let Bukkit = Java.type("org.bukkit.Bukkit");
let NamespacedKey = Java.type("org.bukkit.NamespacedKey");

// https://minecraft-heads.com/scripts/api.php
// https://freshcoal.com/api.php

let fetch = async (url, options = {}) => {
  let worker = new Worker(`${global.plugin.java.getDataFolder()}/fetch.js`, {
    workerData: {
      url: url,
      ...options
    },
    stdout: true,
    stderr: true
  });

  worker.on("exit", () => {
    console.log(`Worker exit "${url}"`);
  });

  let result = await new Promise((resolve, reject) => {
    worker.on("message", message => {
      if (message.type === "result_text") {
        resolve(message.result);
      }
      // TODO Errors
    });
  });

  return {
    text: async () => result,
    json: async () => JSON.parse(result)
  };
};

let fetch_minecraft_heads = async url => {
  let response = await fetch(url);
  let json = await response.json();
  return json.map(head => ({
    name: head.name,
    value: head.value,
    skullowner: head.uuid
  }));
};

let NULL_ITEM = new ItemStack(Material.BLACK_STAINED_GLASS_PANE);

let FRESHCOAL_CATEGORIES = [
  {
    title: "Food",
    slug: "food",
    icon: {
      name: "Nutella",
      skullowner: "014df015-7eba-4ad0-a0e0-83164b7a45f2",
      category: "food",
      value:
        "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvNTE1ZGNiMmRhMDJjZjczNDgyOWUxZTI3M2UzMDI1NjE3ZDgwNzE1MTZmOTUzMjUxYjUyNTQ1ZGE4ZDNlOGRiOCJ9fX0="
    },
    fetch: () =>
      fetch_freshcoal_category(`https://freshcoal.com/mainapi.php?query=food`)
  },
  // {
  //   title: "Food",
  //   slug: "food",
  //   icon: {
  //     name: "Nutella",
  //     skullowner: "014df015-7eba-4ad0-a0e0-83164b7a45f2",
  //     category: "food",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvNTE1ZGNiMmRhMDJjZjczNDgyOWUxZTI3M2UzMDI1NjE3ZDgwNzE1MTZmOTUzMjUxYjUyNTQ1ZGE4ZDNlOGRiOCJ9fX0="
  //   },
  //   fetch: () => fetch_freshcoal_category(`https://freshcoal.com/mainapi.php?query=food`),
  // },
  {
    title: "Devices",
    slug: "devices",
    icon: {
      name: "Monitor",
      skullowner: "6522a7fd-3649-4d2c-a6b4-3c24e5",
      category: "devices",
      value:
        "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvMTVjMjkyYTI0ZjU0YTdhNDM3ODUyNjY1NTJkYmE3YTE4NGY5YzUwZTBkOTRiMzM3ZDhkM2U3NmU5ZTljY2U3In19fQ=="
    },
    fetch: () =>
      fetch_freshcoal_category(
        `https://freshcoal.com/mainapi.php?query=devices`
      )
  },
  {
    title: "Misc",
    slug: "misc",
    icon: {
      name: "Lava Bucket",
      skullowner: "511af44d-67f6-44e7-a3c2-64d844",
      category: "misc",
      value:
        "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvOGQ1NDI3YTgzNTQwYTA4YTNmYTJlNjU1YzI5NjRhMDcyNDM1MTQ1ODRhNzFlYzM1ZDZiOWUxODRkZmJlMzE4In19fQ=="
    },
    fetch: () =>
      fetch_minecraft_heads(
        `https://minecraft-heads.com/scripts/api.php?cat=miscellaneous`
      )
  },
  {
    title: "Alphabet",
    slug: "alphabet",
    icon: {
      name: "A",
      skullowner: "e8e10bc5-b94e-4378-a54c-ac71a6",
      category: "alphabet",
      value:
        "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvYTY3ZDgxM2FlN2ZmZTViZTk1MWE0ZjQxZjJhYTYxOWE1ZTM4OTRlODVlYTVkNDk4NmY4NDk0OWM2M2Q3NjcyZSJ9fX0="
    },
    fetch: () =>
      fetch_freshcoal_category(
        `https://freshcoal.com/mainapi.php?query=alphabet`
      )
  },
  {
    title: "Decorations",
    slug: "decoration",
    icon: {
      name: "Stack of Books",
      skullowner: "d93fd71a-94fa-479b-8d8e-8bfb601a8df2",
      category: "decoration",
      value:
        "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvZjQ5MzkzNjU0NGNhMjkxYjlmYzc5Mjg2NjNhZTI3NjNlMTgzNTc1NmFhMWIzOTUyZjk2NWQ1MjVjMzkzN2I1ZCJ9fX0="
    },
    fetch: () =>
      fetch_minecraft_heads(
        `https://minecraft-heads.com/scripts/api.php?cat=decoration`
      )
  },
  {
    title: "Colors",
    slug: "color",
    icon: {
      name: "Magenta",
      skullowner: "309c9299-c87a-4b3f-9472-b5df45",
      category: "color",
      value:
        "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvOTEzM2ZhNTJkZDc0ZDcxMWU1Mzc0N2RhOTYzYjhhZGVjZjkyZGI5NDZiZTExM2I1NmMzOGIzZGMyNzBlZWIzIn19fQ=="
    },
    fetch: () =>
      fetch_freshcoal_category(`https://freshcoal.com/mainapi.php?query=color`)
  },
  {
    title: "Blocks",
    slug: "blocks",
    icon: {
      name: "Grass",
      skullowner: "fe02ba7c-6fb4-458d-af7d-85a72a",
      category: "blocks",
      value:
        "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvMzQ5YzYzYmM1MDg3MjMzMjhhMTllNTk3ZjQwODYyZDI3YWQ1YzFkNTQ1NjYzYWMyNDQ2NjU4MmY1NjhkOSJ9fX0="
    },
    fetch: () =>
      fetch_freshcoal_category(`https://freshcoal.com/mainapi.php?query=blocks`)
  },
  // {
  //   title: "Games",
  //   slug: "games",
  //   icon: {
  //     name: "Pokemon",
  //     skullowner: "04be8421-c832-4cf8-82e5-9b88d8",
  //     category: "games",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvZDQzZDRiN2FjMjRhMWQ2NTBkZGY3M2JkMTQwZjQ5ZmMxMmQyNzM2ZmMxNGE4ZGMyNWMwZjNmMjlkODVmOGYifX19"
  //   },
  //   fetch: () =>
  //     fetch_freshcoal_category(`https://freshcoal.com/mainapi.php?query=games`)
  // },
  {
    title: "Animals",
    slug: "mobs",
    icon: {
      name: "Steampunk Fox",
      skullowner: "f146e5d3-6194-4047-8c9a-17c8640b1601",
      category: "mobs",
      value:
        "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvY2Q4NTZhNWM0MGU4ZTcyMDY0ZmQ5YmVmOGVjOTBhODZlZTEzMGE0ZGE0YmVlYWJkYmRiNjM0YjcyMmJjYjBiYSJ9fX0="
    },
    fetch: () =>
      fetch_minecraft_heads(
        `https://minecraft-heads.com/scripts/api.php?cat=animals`
      )
  }
  // {   title: "Characters",
  //   slug: "characters",
  //   icon: {
  //     name: "Zelda",
  //     skullowner: "63b2a003-04da-450b-b07a-de6906f8f677",
  //     category: "characters",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvZGFhMDU5NjZkYmIzOWY3ODBlN2VhNjNhMjk1NjBkOGViNDhlMGMyNDk3YTgxOGE4OTU2NGE1YTE0YTMzZWYifX19"
  //   },
  //   fetch: () =>
  //     fetch_minecraft_heads(
  //       `https://minecraft-heads.com/scripts/api.php?cat=humanoid`
  //     )
  // }
  // { title: "Pokemon", slug: "pokemon", icon: {} },
];

let fetch_freshcoal_category = async url => {
  let response = await fetch(url);
  let text = await response.text();

  let begin = text.indexOf("[");
  let end = text.lastIndexOf("]");
  let json = text.slice(begin, end + 1);
  return JSON.parse(json);
};

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

let JavaString = Java.type("java.lang.String");
let StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
let Base64 = Java.type("java.util.Base64");
let atob = base64 => {
  let decoder = Base64.getDecoder();
  let bytes = decoder.decode(base64);
  return new JavaString(bytes, StandardCharsets.UTF_8);
};
let btoa = string => {};

export let head_plugin = async (plugin, { defineCommand }) => {
  // let heads = [
  //   {
  //     name: "Nutella",
  //     skullowner: "014df015-7eba-4ad0-a0e0-83164b7a45f2",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvNTE1ZGNiMmRhMDJjZjczNDgyOWUxZTI3M2UzMDI1NjE3ZDgwNzE1MTZmOTUzMjUxYjUyNTQ1ZGE4ZDNlOGRiOCJ9fX0=",
  //     category: "food"
  //   },
  //   {
  //     name: "Vegemite",
  //     skullowner: "3fd44f85-9f07-4a4e-9854-ee57476ce1b8",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvYWU4ODkwODc0YTMwNjZmNDI2ZTY2ZTM3NDM4ZjQ1YWIyOWE1YmYyNTgyZGI3M2NiNGNmZjY5NTRhNTc4ZWYifX19",
  //     category: "food"
  //   },
  //   {
  //     name: "Bread",
  //     skullowner: "a75e3f60-2242-4429-8ece-bcde7753b064",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvZjM0ODdkNDU3ZjkwNjJkNzg3YTNlNmNlMWM0NjY0YmY3NDAyZWM2N2RkMTExMjU2ZjE5YjM4Y2U0ZjY3MCJ9fX0=",
  //     category: "food"
  //   },
  //   {
  //     name: "Cheese",
  //     skullowner: "9c919b83-f3fe-456f-a824-7d1d08cc8bd2",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvOTU1ZDYxMWE4NzhlODIxMjMxNzQ5YjI5NjU3MDhjYWQ5NDI2NTA2NzJkYjA5ZTI2ODQ3YTg4ZTJmYWMyOTQ2In19fQ==",
  //     category: "food"
  //   },
  //   {
  //     name: "Strawberry Jam",
  //     skullowner: "adc3ea73-5b42-4fea-a237-4a72b52dd72b",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvYzBiOGI1ODg5ZWUxYzYzODhkYzZjMmM1ZGJkNzBiNjk4NGFlZmU1NDMxOWEwOTVlNjRkYjc2MzgwOTdiODIxIn19fQ==",
  //     category: "food"
  //   },
  //   {
  //     name: "Pancakes",
  //     skullowner: "78f0c232-7d83-4987-9e34-e15f421ceef9",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvMzQ3ZjRmNWE3NGM2NjkxMjgwY2Q4MGU3MTQ4YjQ5YjJjZTE3ZGNmNjRmZDU1MzY4NjI3ZjVkOTJhOTc2YTZhOCJ9fX0=",
  //     category: "food"
  //   }
  // ];

  // Party from https://gist.github.com/TheLexoPlexx/ed8afd446c0cfda151640cd0f5ccca00 ,
  // though PaperMC has the necessary methods exposed
  let create_skull_itemstack = skull => {
    let stack = new ItemStack(Material.PLAYER_HEAD);
    let meta = stack.getItemMeta();

    let profile = Bukkit.createProfile(
      typeof skull.skullowner === "string"
        ? UUID.fromString(skull.skullowner)
        : skull.skullowner
    );
    profile.setProperty(new ProfileProperty("textures", skull.value));
    meta.setPlayerProfile(profile);

    meta.setDisplayName(skull.name);

    if (skull.category) {
      meta
        .getPersistentDataContainer()
        .set(category_key, PersistentDataType.STRING, skull.category);
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

  console.log(`${ChatColor.DARK_GREEN}Fetching all categories...`);
  let heads = [];
  for (let category of FRESHCOAL_CATEGORIES) {
    try {
      // let category_heads = await fetch_freshcoal_category(
      //   `https://freshcoal.com/mainapi.php?query=${category.slug}`
      // );
      let category_heads = await category.fetch();
      console.log(
        `${ChatColor.DARK_RED}${category.slug}: ${ChatColor.WHITE}${category_heads.length}`
      );
      for (let head of category_heads) {
        heads.push({
          ...head,
          category: category.slug
        });
      }
    } catch (error) {
      console.log(`error:`, category.slug, error);
    }
  }
  console.log(`${ChatColor.GREEN}Fetched all categories!`);

  let Heads_InventoryHolder = new (Java.extend(InventoryHolder, {}))();
  let HeadsCategories_InventoryHolder = new (Java.extend(
    InventoryHolder,
    {}
  ))();

  let category_key = new NamespacedKey(plugin.java, "head-category");
  let page_key = new NamespacedKey(plugin.java, "head-page");
  defineCommand("heads", {
    onCommand: async ({
      sender,
      args: [search],
      UserError,
      reply_success,
      broadcast_action
    }) => {
      if (search != null) {
        let old_minecraft_heads_url_regex = /^https:\/\/minecraft-heads\.com\/player-heads/;
        let minecraft_heads_url_regex = /^https?:\/\/minecraft-heads\.com\/(custom-heads|custom)\/(.*)$/;

        if (old_minecraft_heads_url_regex.test(search)) {
          throw new UserError(
            `This url is from the "Player Heads" section of minecraft-heads.com, these are not stable. Use one from the "Custom Heads" section please.`
          );
        }

        if (minecraft_heads_url_regex.test(search)) {
          let response = await fetch(search);
          let text = await response.text();
          let give_regex = /{display:{Name:"{\\"text\\":\\"([^"]*)\\"}"},SkullOwner:{Id:([^ ]*),Properties:{textures:\[{Value:"([^ ]*)"}\]}}}/;

          let give_match = text.match(give_regex);
          if (give_match == null) {
            throw new UserError(
              `Couldn't find a minecraft head on the page you linked`
            );
          }
          let [_match, name, _uuid, value] = give_match;

          sender.getInventory().addItem(
            create_skull_itemstack({
              name: name,
              skullowner: sender.getUniqueId(),
              value: value
            })
          );
          reply_success(`Here's a ${name} for you!`);
          broadcast_action(chat`took a ${chat.white(name)}`);
          return;
        }

        try {
          let result = JSON.parse(atob(search));
          let obfuscated = "Unknown Object"
            .split("")
            .map(x => {
              let color =
                Math.random() > 0.7 ? ChatColor.GRAY : ChatColor.MAGIC;
              return `${color}${x}`;
            })
            .join("");

          sender.getInventory().addItem(
            create_skull_itemstack({
              name: `${ChatColor.GRAY}${obfuscated}`,
              skullowner: sender.getUniqueId(),
              value: search
            })
          );
          reply_success(`Here's an ${obfuscated} for you!`);
          return;
        } catch (error) {
          console.log(`error.stack:`, error.stack);
        }

        throw new UserError("No idea what you want to do");
        return;
      }

      let lines = Math.ceil(FRESHCOAL_CATEGORIES.length / 9)

      let mask_inventory = Bukkit.createInventory(
        HeadsCategories_InventoryHolder,
        lines * 9,
        "Select a category"
      );

      mask_inventory.setStorageContents(
        FRESHCOAL_CATEGORIES.map(({ title, slug, icon }) => {
          let stack = create_skull_itemstack(icon);
          let itemmeta = stack.getItemMeta();
          itemmeta.setDisplayName(`${ChatColor.DARK_RED}${title}`);
          stack.setItemMeta(itemmeta);
          return stack;
        })
      );

      sender.openInventory(mask_inventory);
    }
  });

  let get_contents_for_name_and_page = (name, page = 0) => {
    let all_items_for_category = heads.filter(x => x.category === name);
    let page_count =
      all_items_for_category.length > 54
        ? Math.ceil(all_items_for_category.length / 51)
        : 1;

    let items = all_items_for_category.slice(page * 51);
    let has_previous_page = page !== 0;
    let has_next_page = items.length > (has_previous_page ? 51 : 54);

    let menu =
      has_next_page || has_previous_page
        ? [
            ...items.slice(0, 51).map(skull => create_skull_itemstack(skull)),
            ..._.range(Math.max(51 - items.length, 0)).map(() => NULL_ITEM),
            NULL_ITEM,
            has_previous_page
              ? create_itemstack(Material.BLACK_CONCRETE, {
                  name: `${ChatColor.DARK_PURPLE}Previous page ${ChatColor.GRAY}(${page}/${page_count})`,
                  data: [
                    [category_key, PersistentDataType.STRING, name],
                    [page_key, PersistentDataType.INTEGER, page - 1]
                  ]
                })
              : create_itemstack(Material.LIGHT_GRAY_CONCRETE, {
                  name: `${ChatColor.GRAY}No previous page`,
                  data: [
                    [category_key, PersistentDataType.STRING, name],
                    [page_key, PersistentDataType.INTEGER, page]
                  ]
                }),

            has_next_page
              ? create_itemstack(Material.WHITE_CONCRETE, {
                  name: `${ChatColor.DARK_PURPLE}Next page ${
                    ChatColor.GRAY
                  }(${page + 2}/${page_count})`,
                  data: [
                    [category_key, PersistentDataType.STRING, name],
                    [page_key, PersistentDataType.INTEGER, page + 1]
                  ]
                })
              : create_itemstack(Material.LIGHT_GRAY_CONCRETE, {
                  name: `${ChatColor.GRAY}No next page`,
                  data: [
                    [category_key, PersistentDataType.STRING, name],
                    [page_key, PersistentDataType.INTEGER, page]
                  ]
                })
          ]
        : items.map(skull => create_skull_itemstack(skull));
    return menu;
  };

  // TODO Maybe multiple pages?
  plugin.events.InventoryClick(event => {
    let player = event.getWhoClicked();
    let inventory = event.getClickedInventory();
    let item = event.getCurrentItem();
    if (item == null) return;
    let itemmeta = item.getItemMeta();
    if (itemmeta == null) return;
    let itemdata = itemmeta.getPersistentDataContainer();
    let title = itemmeta.getDisplayName();

    if (inventory.getHolder() === HeadsCategories_InventoryHolder) {
      event.setCancelled(true);

      let name = itemdata.get(category_key, PersistentDataType.STRING);

      let mask_inventory = Bukkit.createInventory(
        Heads_InventoryHolder,
        54,
        title
      );

      mask_inventory.setStorageContents(
        get_contents_for_name_and_page(name, 0)
      );
      setImmediate(() => {
        player.openInventory(mask_inventory);
      });
      return;
    }

    if (inventory.getHolder() === Heads_InventoryHolder) {
      let name = itemdata.get(category_key, PersistentDataType.STRING);
      let page = itemdata.get(page_key, PersistentDataType.INTEGER);

      if (name == null) {
        return;
      }
      if (page == null) {
        return;
      }

      event.setCancelled(true);
      inventory.setStorageContents(get_contents_for_name_and_page(name, page));
    }
  });
};
