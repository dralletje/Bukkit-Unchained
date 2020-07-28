let _ = require("lodash");
let { Worker } = require("worker_threads");
let Packet = require("bukkit/Packet");
let fs = require('fs');

let { chat } = require("./chat.js");
let {nbt, unpack_nbt} = require('./_nbt.js');

let UUID = Java.type("java.util.UUID");

let ItemStack = Java.type("org.bukkit.inventory.ItemStack");
let Material = Java.type("org.bukkit.Material");
let ChatColor = Java.type("org.bukkit.ChatColor");
let ItemFlag = Java.type("org.bukkit.inventory.ItemFlag");
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

let dev_plugin_data_path = Polyglot.import('plugin').getDataFolder()
  .toPath()
  .toString();

let ALL_HEADS = JSON.parse(fs.readFileSync(`${dev_plugin_data_path}/minecraft-heads-backup/ALL_HEADS.json`).toString())
// let all_tags = ALL_HEADS.flatMap(head =>
//   (head.tags || "").split(/ *, */g).map(x => x.toLowerCase())
// );
let all_heads = ALL_HEADS.filter(x => x.name && x.value).map(head => {
  return {
    name: head.name,
    value: head.value,
    skullowner: head.uuid,
    tags: (head.tags || "").split(/ *, */g),
    tags_search: [
      ...(head.tags || "").split(/ *, */g).map(x => x.toLowerCase()),
      head.name.toLowerCase()
    ]
  };
});

let fetch_minecraft_heads = async url => {
  let response = await fetch(url);
  let json = await response.json();
  return json.map(head => ({
    name: head.name,
    value: head.value,
    skullowner: head.uuid,
    tags: (head.tags || "").split(/ *, */g),
    tags_search: [
      ...(head.tags || "").split(/ *, */g).map(x => x.toLowerCase()),
      head.name.toLowerCase()
    ]
  }));
};

let NULL_ITEM = new ItemStack(Material.BLACK_STAINED_GLASS_PANE);

let FRESHCOAL_CATEGORIES = [
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
  //   fetch: () =>
  //     fetch_freshcoal_category(`https://freshcoal.com/mainapi.php?query=food`)
  // },
  // {
  //   title: "Devices",
  //   slug: "devices",
  //   icon: {
  //     name: "Monitor",
  //     skullowner: "6522a7fd-3649-4d2c-a6b4-3c24e5",
  //     category: "devices",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvMTVjMjkyYTI0ZjU0YTdhNDM3ODUyNjY1NTJkYmE3YTE4NGY5YzUwZTBkOTRiMzM3ZDhkM2U3NmU5ZTljY2U3In19fQ=="
  //   },
  //   fetch: () =>
  //     fetch_freshcoal_category(
  //       `https://freshcoal.com/mainapi.php?query=devices`
  //     )
  // },
  // {
  //   title: "Misc",
  //   slug: "misc",
  //   icon: {
  //     name: "Lava Bucket",
  //     skullowner: "511af44d-67f6-44e7-a3c2-64d844",
  //     category: "misc",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvOGQ1NDI3YTgzNTQwYTA4YTNmYTJlNjU1YzI5NjRhMDcyNDM1MTQ1ODRhNzFlYzM1ZDZiOWUxODRkZmJlMzE4In19fQ=="
  //   },
  //   fetch: () =>
  //     fetch_minecraft_heads(
  //       `https://minecraft-heads.com/scripts/api.php?cat=miscellaneous`
  //     )
  // },
  // {
  //   title: "Alphabet",
  //   slug: "alphabet",
  //   icon: {
  //     name: "A",
  //     skullowner: "e8e10bc5-b94e-4378-a54c-ac71a6",
  //     category: "alphabet",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvYTY3ZDgxM2FlN2ZmZTViZTk1MWE0ZjQxZjJhYTYxOWE1ZTM4OTRlODVlYTVkNDk4NmY4NDk0OWM2M2Q3NjcyZSJ9fX0="
  //   },
  //   fetch: () =>
  //     fetch_freshcoal_category(
  //       `https://freshcoal.com/mainapi.php?query=alphabet`
  //     )
  // },
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
        `https://minecraft-heads.com/scripts/api.php?cat=decoration&tags=true`
      )
  }
  // {
  //   title: "Colors",
  //   slug: "color",
  //   icon: {
  //     name: "Magenta",
  //     skullowner: "309c9299-c87a-4b3f-9472-b5df45",
  //     category: "color",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvOTEzM2ZhNTJkZDc0ZDcxMWU1Mzc0N2RhOTYzYjhhZGVjZjkyZGI5NDZiZTExM2I1NmMzOGIzZGMyNzBlZWIzIn19fQ=="
  //   },
  //   fetch: () =>
  //     fetch_freshcoal_category(`https://freshcoal.com/mainapi.php?query=color`)
  // },
  // {
  //   title: "Blocks",
  //   slug: "blocks",
  //   icon: {
  //     name: "Grass",
  //     skullowner: "fe02ba7c-6fb4-458d-af7d-85a72a",
  //     category: "blocks",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvMzQ5YzYzYmM1MDg3MjMzMjhhMTllNTk3ZjQwODYyZDI3YWQ1YzFkNTQ1NjYzYWMyNDQ2NjU4MmY1NjhkOSJ9fX0="
  //   },
  //   fetch: () =>
  //     fetch_freshcoal_category(`https://freshcoal.com/mainapi.php?query=blocks`)
  // },
  // {
  //   title: "Animals",
  //   slug: "mobs",
  //   icon: {
  //     name: "Steampunk Fox",
  //     skullowner: "f146e5d3-6194-4047-8c9a-17c8640b1601",
  //     category: "mobs",
  //     value:
  //       "eyJ0ZXh0dXJlcyI6eyJTS0lOIjp7InVybCI6Imh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvY2Q4NTZhNWM0MGU4ZTcyMDY0ZmQ5YmVmOGVjOTBhODZlZTEzMGE0ZGE0YmVlYWJkYmRiNjM0YjcyMmJjYjBiYSJ9fX0="
  //   },
  //   fetch: () =>
  //     fetch_minecraft_heads(
  //       `https://minecraft-heads.com/scripts/api.php?cat=animals`
  //     )
  // }
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
    meta.setLore(lore);
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

export let head_plugin = async (plugin, { defineCommand }) => {
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
  // let heads = [];
  // for (let category of FRESHCOAL_CATEGORIES) {
  //   try {
  //     let category_heads = await category.fetch();
  //     console.log(
  //       `${ChatColor.DARK_RED}${category.slug}: ${ChatColor.WHITE}${category_heads.length}`
  //     );
  //     for (let head of category_heads) {
  //       heads.push({
  //         ...head,
  //         category: category.slug
  //       });
  //     }
  //   } catch (error) {
  //     console.log(`error:`, category.slug, error);
  //   }
  // }
  let heads = all_heads;
  console.log(`${ChatColor.GREEN}Fetched all categories!`);

  let Heads_InventoryHolder = new (Java.extend(InventoryHolder, {}))();
  let HeadsCategories_InventoryHolder = new (Java.extend(
    InventoryHolder,
    {}
  ))();

  let FURNACE_WINDOW_ID = 100;

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
      Packet.send_packet(sender, {
        name: "open_window",
        params: {
          windowId: FURNACE_WINDOW_ID,
          inventoryType: 7,
          windowTitle: JSON.stringify(chat`Heads search`)
        }
      });
      debounced_search_per_player({ player: sender, search: "" });
      return;

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
      }

      let lines = Math.ceil(FRESHCOAL_CATEGORIES.length / 9);

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

  let WeakIdentityHashMap = Java_type("eu.dral.unchained.WeakIdentityHashMap");
  class JavaWeakMap {
    constructor() {
      this.java_map = new WeakIdentityHashMap();
    }
    clear() {
      return this.java_map.clear();
    }
    delete(key) {
      return this.java_map.remove(key);
    }
    get(key) {
      return this.java_map.get(key);
    }
    has(key) {
      return this.java_map.containsKey(key);
    }
    set(key, value) {
      return this.java_map.put(key, value);
    }
  }
  let open_inventories = new JavaWeakMap();

  let screen_size = 29 - 3 - 2; // Two spaces for next/previous page buttons
  let search_heads = ({ page, search }) => {
    console.time(`Search for "${search}" on page ${page}:`)
    let found_heads = [];
    for (let head of heads) {
      if (found_heads.length > screen_size * (page + 1) + 1) break;
      if (
        head.tags_search.some(x => x.includes(search)) ||
        head.name.includes(search)
      ) {
        found_heads.push(head);
      }
    }
    console.timeEnd(`Search for "${search}" on page ${page}:`)
    return found_heads;
  };

  let populate_search_inventory = ({ player, search = "", page = 0 }) => {
    let open_inventory = open_inventories.get(player);

    let is_same_inventory =
      open_inventory &&
      open_inventory.search === search &&
      open_inventory.page === page;

    // 0 - Input 1 (Needs to have an item for textinput to be typeable)
    // 1 - Input 2
    // 2 - Output
    // 3–29 - Large inventory (part of player env)
    // 30–38 - Player hotbar

    let found_heads = is_same_inventory
      ? open_inventory.heads
      : search_heads({ search, page });
    let page_heads = found_heads.slice(
      page * screen_size,
      (page + 1) * screen_size + 1
    );

    let has_previous_page = page > 0;
    let has_next_page = found_heads.length > (page + 1) * screen_size + 1;

    open_inventories.set(player, { ...open_inventory, search: search, page, heads: found_heads });

    console.time('Generating inventory packet')
    let head_items = [
      ...page_heads.map(head => {
        return {
          present: true,
          itemId: 771,
          itemCount: 1,
          nbtData: nbt.root({
            Dral_Skullinfo: nbt.compound({
              value: nbt.string(head.value),
              skullowner: nbt.string(head.skullowner),
              name: nbt.string(head.name),
            }),
            SkullOwner: nbt.compound({
              Id: nbt.string(head.skullowner),
              Name: nbt.string(player.getName()),
              Properties: nbt.compound({
                textures: nbt.list(nbt.compound, [
                  { Value: nbt.string(head.value) }
                ])
              })
            }),
            display: nbt.compound({
              Name: nbt.chat(head.name),
              Lore: nbt.list(
                nbt.string,
                head.tags.map(x => JSON.stringify(chat`${x}`))
              )
            })
          })
        };
      }),
      ..._.range(page_heads, screen_size + 1).map(() => ({ present: false }))
    ];

    Packet.send_packet(player, {
      debug: true,
      name: "window_items",
      params: {
        windowId: FURNACE_WINDOW_ID,
        items: [
          ..._.range(3).map(x => ({
            present: true,
            itemId: 1,
            itemCount: 1,
            nbtData: nbt.root({
              display: nbt.compound({
                Name: nbt.chat``
              })
            })
          })),
          ...head_items.slice(0, 9 * 2),
          has_previous_page
            ? {
                present: true,
                itemId: 526,
                itemCount: 1,
                nbtData: nbt.root({
                  display: nbt.compound({
                    Name: nbt.chat`Previous page`
                  }),
                  clickAction: nbt.compound({
                    page: nbt.integer(page - 1),
                    search: nbt.string(search)
                  })
                })
              }
            : {
                present: true,
                itemId: 360,
                itemCount: 1,
                nbtData: nbt.root({
                  display: nbt.compound({
                    Name: nbt.chat`No previous page`
                  }),
                  clickAction: nbt.compound({
                    page: nbt.integer(page),
                    search: nbt.string(search)
                  })
                })
              },
          ...head_items.slice(9 * 2, 9 * 2 + 7),
          has_next_page
            ? {
                present: true,
                itemId: 526,
                itemCount: 1,
                nbtData: nbt.root({
                  display: nbt.compound({
                    Name: nbt.chat`Next page`
                  }),
                  clickAction: nbt.compound({
                    page: nbt.integer(page + 1),
                    search: nbt.string(search)
                  })
                })
              }
            : {
                present: true,
                itemId: 360,
                itemCount: 1,
                nbtData: nbt.root({
                  display: nbt.compound({
                    Name: nbt.chat`No next page`
                  }),
                  clickAction: nbt.compound({
                    page: nbt.integer(page),
                    search: nbt.string(search)
                  })
                })
              }
        ]
      }
    });
    console.timeEnd('Generating inventory packet')
  };

  _.memoize.Cache = JavaWeakMap;
  let debounced_search_per_player_map = _.memoize(player => {
    return _.debounce(populate_search_inventory, 500);
  });
  let debounced_search_per_player = options => {
    let fn = debounced_search_per_player_map(options.player);
    fn(options);
  };

  Packet.addIncomingPacketListener(Packet.fromClient.ITEM_NAME, event => {
    let player = event.getPlayer();
    let {
      params: { name }
    } = event.getData();
    debounced_search_per_player({ player, search: name.toLowerCase() });
  });
  Packet.addIncomingPacketListener(Packet.fromClient.WINDOW_CLICK, event => {
    let player = event.getPlayer();
    let {
      params: { windowId, action, item, ...params }
    } = event.getData();

    let open_inventory = open_inventories.get(player);
    if (windowId !== FURNACE_WINDOW_ID) {
      return;
    }
    if (open_inventory == null) {
      console.warn('Window ID was FURNACE_WINDOW_ID but no open inventory for player');
      return;
    }
    event.setCancelled(true);

    let is_in_head_inventory = 3 <= params.slot && params.slot <= 29;
    let item_nbt = unpack_nbt(item.nbtData);

    // Normal click
    if (is_in_head_inventory) {
      if (item_nbt && item_nbt.clickAction) {
        let { page, search } = item_nbt && item_nbt.clickAction;

        Packet.send_packet(player, {
          name: "transaction",
          params: {
            windowId: FURNACE_WINDOW_ID,
            action: action,
            accepted: false
          }
        });
        Packet.send_packet(player, {
          name: "set_slot",
          params: {
            windowId: -1,
            slot: -1,
            item: { present: false }
          }
        });
        populate_search_inventory({ player, search: search, page: page });
      } else {
        console.log(`params:`, params)
        if (params.mode === 0) {
          // NOTE should always be a player head 🤔
          let skullitem = create_skull_itemstack(item_nbt.Dral_Skullinfo)
          open_inventory.current_item = skullitem;
          open_inventories.set(player, open_inventory);
        }
        else if (params.mode === 1) {
          // player.getInventory.
          // TODO Add item to inventory
        }
        Packet.send_packet(player, {
          name: "transaction",
          params: {
            windowId: FURNACE_WINDOW_ID,
            action: action,
            accepted: true
          }
        });
        populate_search_inventory({
          player,
          search: open_inventory.search,
          page: open_inventory.page
        });
      }
    } else {
      if (params.slot > 29) {
        // HOTBAR
        let item_to_set = open_inventory.current_item;
        open_inventory.current_item = player.getInventory().getItem(params.slot - 30);
        player.getInventory().setItem(params.slot - 30, item_to_set);
      } else {
        Packet.send_packet(player, {
          name: "transaction",
          params: {
            windowId: FURNACE_WINDOW_ID,
            action: action,
            accepted: true
          }
        });
        populate_search_inventory({
          player,
          search: open_inventory.search,
          page: open_inventory.page
        });
      }
    }
  });

  Packet.addIncomingPacketListener(Packet.fromClient.CLOSE_WINDOW, event => {
    let player = event.getPlayer();
    let {
      params: { windowId }
    } = event.getData();

    if (windowId === FURNACE_WINDOW_ID) {
      event.setCancelled(true);
      player.updateInventory();
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
