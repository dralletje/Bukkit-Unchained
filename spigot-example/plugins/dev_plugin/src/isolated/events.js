/*
Isolated plugin needs to have isolated events as well.
For that, I want to try to check as little specific events as possible.
This is the current list of top-level events in bukkit, with a comment about if we need it:
  - ✅ AsyncPlayerPreLoginEvent // Not needed, plugins shouldn't have access to this
  - ✅ BlockEvent // event.getBlock().getLocation()
  - ✅ EntityEvent // event.getEntity().getLocation()
  - ✅ HangingEvent // TBF this should be part of EntityEvent hahaha
  - ❌ InventoryEvent // Tricky, as event.getInventory().getLocation() might be null...
  - ✅ InventoryMoveItemEvent // Shouldn't happen in controlled environment (will always be cancelled)
  - ✅ InventoryPickupItemEvent // ^^^
  - ✅ PlayerEvent // event.getPlayer().getLocation()
  - ✅ PlayerLeashEntityEvent // event.getPlayer().getLocation() && event.getEntity().getLocation()
  - ✅ PlayerPreLoginEvent // Not part of the plugin, or maybe we fire this when player enters the plot
  - ❌ ServerEvent // Very tricky, will look at later
  - ❌ TabCompleteEvent // Need to see if we need this at all
  - ✅ VehicleEvent // event.getVehicle().getLocation()
  - ✅ WeatherEvent // Not necessary in controller env
  - ❌ WorldEvent // Tricky, has portal creation but the rest seems to not happen in controlled env
*/

let PlayerEntity = Java.type("org.bukkit.entity.Player");

let AllowedEvents = [
  {
    java_class: Java.type("org.bukkit.event.block.BlockEvent"),
    get_locations: event => [event.getBlock().getLocation()],
    get_players: () => []
  },
  {
    java_class: Java.type("org.bukkit.event.entity.EntityEvent"),
    get_locations: event => [event.getEntity().getLocation()],
    get_players: event =>
      event.getEntity() instanceof PlayerEntity ? [event.getEntity()] : []
  },
  {
    java_class: Java.type("org.bukkit.event.hanging.HangingEvent"),
    get_locations: event => [event.getHanging().getLocation()],
    get_players: () => []
  },
  // 'org.bukkit.event.inventory.InventoryEvent': {},
  {
    java_class: Java.type("org.bukkit.event.player.PlayerEvent"),
    get_locations: event => [event.getPlayer().getLocation()],
    get_players: event => [event.getPlayer()]
  },
  {
    java_class: Java.type("org.bukkit.event.entity.PlayerLeashEntityEvent"),
    get_location: event => [
      event.getPlayer().getLocation(),
      event.getEntity().getLocation()
    ],
    get_players: event => [event.getPlayer()]
  },
  // 'org.bukkit.event.server.ServerEvent': {},
  {
    java_class: Java.type("org.bukkit.event.vehicle.VehicleEvent"),
    get_locations: event => [event.getVehicle().getLocation()],
    get_players: () => []
  }
];


let java_is_subclass = (subclass, superclass) => {
  let subclass_superclass = subclass.getGenericSuperclass();

  if (subclass_superclass === superclass) {
    return true;
  } else {
    if (subclass_superclass !== subclass && subclass_superclass != null) {
      return java_is_subclass(subclass_superclass, superclass);
    }
    return false
  }
};

export let create_isolated_events = ({ plugin, active_session, filters }) => {
  let isolated_events = {};
  for (let { name: event_name, addListener, JavaClass } of plugin.events
    .as_list) {
    let parent_class = AllowedEvents.find(allowed_event => {
      return java_is_subclass(JavaClass, allowed_event.java_class);
    });
    if (parent_class == null) {
      continue;
    }

    isolated_events[`on${event_name}`] = handler => {
      let result = addListener(
        event => {
          if (event.isCancelled && event.isCancelled()) {
            return;
          }
          for (let location of parent_class.get_locations(event)) {
            if (filters.location(location) !== true) {
              return;
            }
          }
          for (let player of parent_class.get_players(event)) {
            if (filters.player(player) !== true) {
              return;
            }
          }

          handler(event);

          // Plugin specific error handling
        },
        { priority: "LOWEST" }
      );
      active_session.add_active_process(result);
    };
  }
  return isolated_events;
};
