// Just freeze everything by default
// - No fires
// - No water
// - No trees or mobs
// - NO NOTHING

export default plugin => {
  // prettier-ignore
  let CreatureSpawnEvent = Java.type("org.bukkit.event.entity.CreatureSpawnEvent");
  plugin.events.CreatureSpawn(event => {
    if (
      !event.getCause ||
      event.getCause() !== CreatureSpawnEvent.SpawnReason.CUSTOM
    ) {
      event.setCancelled(true);
    }
  });

  let interaction_events = [
    "BlockBreak",
    "BlockPlace",
    "PlayerBucketEmpty",
    "PlayerBucketFill",
    "PlayerInteract",
    "HangingBreak",
    "HangingPlace",
    "InventoryOpen",
    "PlayerDropItem",
    "PlayerPickupItem",
    'BlockCook',
    'BlockDamage',
    'BlockIgnite',
  ];
  let blockchange_events = [
    'BlockBurn',
    'BlockExplode',
    'BlockGrow',
    'LeavesDecay',
    'BlockPhysics',
    'BlockGrow',
    'BlockForm',
    'BlockSpread',
    'EntityBlockForm',
  ];
  for (let event of [...interaction_events, ...blockchange_events]) {
    let event_name = event;
    if (plugin.events[event_name]) {
      plugin.events[event_name](
        event => {
          event.setCancelled(true);
        },
        { priority: "LOWEST" }
      );
    } else {
      console.error(`Event not found on plugin:`, event_name);
    }
  }
};
