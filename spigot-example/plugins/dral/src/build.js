import { range, chunk, clamp } from "lodash";

let ItemFrame = Java.type("org.bukkit.entity.ItemFrame");
let MineCart = Java.type("org.bukkit.entity.Minecart");
let Boat = Java.type("org.bukkit.entity.Boat");
let Material = Java.type("org.bukkit.Material");
let GameMode = Java.type("org.bukkit.GameMode");
let Location = Java.type("org.bukkit.Location");
let Player = Java.type("org.bukkit.entity.Player");
let EntityDamageEvent = Java.type("org.bukkit.event.entity.EntityDamageEvent");
let CreatureSpawnEvent = Java.type(
  "org.bukkit.event.entity.CreatureSpawnEvent"
);
let Vector = Java.type("org.bukkit.util.Vector");
let EquipmentSlot = Java.type("org.bukkit.inventory.EquipmentSlot");
let Packet = require("bukkit/Packet");

let { JavaWeakMap } = require("./JavaWeakMap");

console.log(`JavaWeakMap:`, JavaWeakMap);

let is_adventure = (player) => player.getGameMode() === GameMode.ADVENTURE;

export let BuildPlugin = (plugin, extra) => {
  // Prevent item frames being placed in itemframes
  plugin.events.PlayerInteractEntity((event) => {
    let item_frame = event.getRightClicked();
    if (item_frame instanceof ItemFrame) {
      if (
        event.getPlayer().getInventory().getItemInMainHand().getType() ===
          Material.ITEM_FRAME &&
        item_frame.getItem().getType() === Material.AIR
      ) {
        event.setCancelled(true);
      }
    }
  });

  plugin.events.PlayerInteractEntity((event) => {
    let item_frame = event.getRightClicked();
    let player = event.getPlayer();
    if (is_adventure(player)) {
      if (item_frame.getItem().getType() === Material.AIR) {
        event.setCancelled(true);
      }
    }
  });

  plugin.events.EntityDamageByEntity((event) => {
    let damager = event.getDamager && event.getDamager();
    let entity = event.getEntity();
    if (damager instanceof Player) {
      if (is_adventure(damager)) {
        if (entity instanceof ItemFrame) {
          event.setCancelled(true);
        }
        if (entity instanceof MineCart) {
          event.setCancelled(true);
        }
        if (entity instanceof Boat) {
          event.setCancelled(true);
        }
      }
    } else {
      if (entity instanceof ItemFrame) {
        event.setCancelled(true);
      }
      if (entity instanceof MineCart) {
        event.setCancelled(true);
      }
      if (entity instanceof Boat) {
        event.setCancelled(true);
      }
    }
  });

  plugin.events.VehicleDamage((event) => {
    let damager = event.getAttacker();
    if (damager instanceof Player) {
      if (is_adventure(damager)) {
        event.setCancelled(true);
      }
    } else {
      event.setCancelled(true);
    }
  });

  plugin.events.PlayerArmorStandManipulate((event) => {
    let player = event.getPlayer();
    let armorstand_item = event.getArmorStandItem();

    if (is_adventure(player)) {
      event.setCancelled(true);
      if (
        player.getInventory().getItemInMainHand().getType() === Material.AIR &&
        armorstand_item
      ) {
        player.getInventory().setItemInMainHand(armorstand_item);
      }
    }
  });

  plugin.events.EntityDamageByBlock((event) => {
    let cause = event.getCause();
    let entity = event.getEntity();

    if (entity instanceof Player) {
      if (cause === EntityDamageEvent.DamageCause.FALL) {
        let lowered_damage = Math.max(0, event.getDamage() - 4);
        let min_damage = Math.max(entity.getHealth() - 1, 4);
        event.setDamage(Math.min(lowered_damage, min_damage));
      }
    }
  });

  let SpawnReason = Java.type(
    "org.bukkit.event.entity.CreatureSpawnEvent$SpawnReason"
  );
  plugin.events.CreatureSpawn(
    /** @param {org$bukkit$event$entity$CreatureSpawnEvent} event */ (
      event
    ) => {
      if (
        event.getSpawnReason &&
        event.getSpawnReason() === SpawnReason.NATURAL
      ) {
        event.setCancelled(true);
      }
    }
  );

  plugin.events.FoodLevelChange((event) => {
    event.setCancelled(true);
    event.getEntity().setFoodLevel(20);
  });

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

  let TITLE = `Grappling Hook`;
  let grappling_hook = () => {
    let tool = plugin_item({
      material: Material.FISHING_ROD,
      title: TITLE,
      description: ["Grab onto any surface"],
      active: true,
    });
    return tool;
  };

  plugin.command("grappling", {
    onCommand: (sender) => {
      sender.getInventory().setItemInMainHand(grappling_hook());
    },
  });

  let entity_ids = range(0, 100).map(() =>
    Packet.get_entity_count().incrementAndGet()
  );

  let spawn_snowball = ({ entity_id, player, location }) => {
    let entity_id_string = String(entity_id).padStart(8, "0");

    Packet.send_packet(player, {
      name: "spawn_entity",
      params: {
        entityId: entity_id,
        objectUUID: `${entity_id_string}-e89b-12d3-a456-426655440000`,
        // type: 64,
        // type: 42, // Minecart
        // type: 38, // leash_knot
        type: 71, // snowball
        // type: 35,
        // type: 40, // llama spit
        // type: 2, // Arrow
        x: location.getX(),
        y: location.getY(),
        z: location.getZ(),
        velocityX: 0,
        velocityY: 0,
        velocityZ: 0,
        pitch: 0,
        yaw: 0,
      },
    });

    Packet.send_packet(player, {
      name: "entity_velocity",
      params: {
        entityId: entity_id,
        velocityX: 0,
        velocityY: 0,
        velocityZ: 0,
      },
    });

    Packet.send_packet(player, {
      name: "entity_metadata",
      params: {
        entityId: entity_id,
        metadata: [
          {
            key: 5,
            type: 7,
            value: true,
          },
        ],
      },
    });

    Packet.send_packet(player, {
      name: "entity_teleport",
      params: {
        entityId: entity_id,
        x: location.getX(),
        y: location.getY(),
        z: location.getZ(),
        yaw: 0,
        pitch: 0,
        onGround: false,
      },
    });
  };

  let player_hooks = new JavaWeakMap();
  plugin.events.EntityDamageByBlock((event) => {
    let cause = event.getCause();
    let entity = event.getEntity();

    if (entity instanceof Player) {
      if (cause === EntityDamageEvent.DamageCause.FALL) {
        if (player_hooks.get(entity)) {
          event.setCancelled(true);
          player_hooks.set(entity, null);
        }
      }
    }
  });
  let BlockAction = Java.type("org.bukkit.event.block.Action");

  plugin.events.PlayerInteract(async (event) => {
    let player = event.getPlayer();
    let item = event.getItem();
    if (item == null) {
      return;
    }
    if (item.getItemMeta().getDisplayName() !== TITLE) {
      return;
    }
    event.setCancelled(true);

    if (event.getHand() !== EquipmentSlot.HAND) {
      return;
    }
    if (
      event.getAction() !== BlockAction.RIGHT_CLICK_AIR &&
      event.getAction() !== BlockAction.RIGHT_CLICK_BLOCK
    ) {
      return;
    }

    let source_location = player
      .getLocation()
      .clone()
      .add(new Vector(0, 0.5, 0));
    let target_block = player.getTargetBlockExact(200);
    if (target_block == null) {
      return;
    }
    let hooked_location = target_block.getLocation();

    let distance_vector = hooked_location
      .toVector()
      .subtract(source_location.toVector());

    let full_distance = distance_vector.length();

    Packet.send_packet(player, {
      name: "entity_destroy",
      params: {
        entityIds: entity_ids,
      },
    });

    let snow_balls = [];
    let dx = Math.floor(full_distance) / 2;
    let direction = distance_vector.multiply(1 / dx);
    for (let x of range(0, dx)) {
      let loc = hooked_location.clone().add(direction.clone().multiply(-x));
      spawn_snowball({
        entity_id: entity_ids[x],
        player: player,
        location: loc,
      });
      snow_balls.push({
        id: entity_ids[x],
        distance: loc.distance(hooked_location),
        location: {
          x: loc.getX(),
          y: loc.getY(),
          z: loc.getZ(),
        },
      });
    }

    let this_hook = Symbol("current hook");
    console.log("OVERWRITE");
    player_hooks.set(player, this_hook);

    await new Promise((resolve) => setTimeout(resolve, 100));
    let initial_jump_source_location = player
      .getLocation()
      .clone()
      .add(new Vector(0, 0.5, 0));
    let initial_jump_direction = hooked_location
      .toVector()
      .subtract(initial_jump_source_location.toVector())
      .normalize();

    player.setVelocity(
      player.getVelocity().add(initial_jump_direction.multiply(1))
    );

    let last_source_location = null;
    let times_without_movement = 0;

    while (player_hooks.get(player) === this_hook) {
      let source_location = player
        .getLocation()
        .clone()
        .add(new Vector(0, 0.5, 0));

      if (last_source_location != null) {
        let distance = source_location.distance(last_source_location);
        if (distance < 0.1) {
          times_without_movement = times_without_movement + 1;
        } else {
          times_without_movement = 0;
        }
      }
      last_source_location = source_location;
      if (times_without_movement >= 3) {
        break;
      }

      let distance = hooked_location.distance(source_location);
      let speed = 1;

      let difference = hooked_location
        .toVector()
        .subtract(source_location.toVector());
      let direction = difference.clone().normalize();
      let velocity = direction.clone().multiply(0.5);
      let max_speed = direction.clone().multiply(1.5);
      let player_velocity = player.getVelocity();

      let new_velocty = (player_dx, acceleration_dx, max_speed) => {
        return player_dx + (max_speed - player_dx) * 0.2;
      };

      if (distance <= 3) {
        player.setVelocity(
          Vector.getMaximum(
            player.getVelocity().add(max_speed.multiply(0.5)),
            max_speed
          )
        );
        console.log("hmmkay");
        break;
      }
      player.setVelocity(
        new Vector(
          new_velocty(
            player_velocity.getX(),
            velocity.getX(),
            max_speed.getX()
          ),
          new_velocty(
            player_velocity.getY(),
            velocity.getY(),
            max_speed.getY() * 1.5
          ),
          new_velocty(player_velocity.getZ(), velocity.getZ(), max_speed.getZ())
        )
      );

      {
        Packet.send_packet(player, {
          name: "entity_destroy",
          params: {
            entityIds: snow_balls
              .filter((x) => x.distance > distance - 2)
              .map((x) => x.id),
          },
        });

        let dx = Math.floor(difference.length()) / 2;
        let direction = difference.multiply(1 / dx);
        for (let x of range(0, dx)) {
          if (snow_balls[x] == null) continue;
          let loc = hooked_location.clone().add(direction.clone().multiply(-x));
          let thing = {
            // (currentX * 32 - prevX * 32) * 128
            dX:
              clamp(loc.getX() - snow_balls[x].location.x, -8, 8) * (32 * 128),
            dY:
              clamp(loc.getY() - snow_balls[x].location.y, -8, 8) * (32 * 128),
            dZ:
              clamp(loc.getZ() - snow_balls[x].location.z, -8, 8) * (32 * 128),
          };
          // console.log(`thing:`, thing);
          Packet.send_packet(player, {
            name: "rel_entity_move",
            params: {
              entityId: snow_balls[x].id,
              dX: thing.dX,
              dY: thing.dY,
              dZ: thing.dZ,
              onGround: false,
            },
          });
          snow_balls[x].location = {
            x: loc.getX(),
            y: loc.getY(),
            z: loc.getZ(),
          };
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (player_hooks.get(player) === this_hook) {
      Packet.send_packet(player, {
        name: "entity_destroy",
        params: {
          entityIds: snow_balls.map((x) => x.id),
        },
      });
    }
  });

  plugin.command("adventure", {
    onCommand: async (sender, command, alias, args) => {
      sender.setGameMode(GameMode.ADVENTURE);
    },
  });
  plugin.command("creative", {
    onCommand: async (sender, command, alias, args) => {
      sender.setGameMode(GameMode.CREATIVE);
    },
  });
  plugin.command("survival", {
    onCommand: async (sender, command, alias, args) => {
      sender.setGameMode(GameMode.SURVIVAL);
    },
  });

  // plugin.events.PlayerInteractEntity((event) => {
  //   let clicked = event.getRightClicked();
  //   let player = event.getPlayer();
  //   if (player.getGameMode() === GameMode.ADVENTURE) {
  //     if (clicked instanceof ItemFrame) {
  //       event.setCancelled(true);
  //     }
  //   }
  // });
};
