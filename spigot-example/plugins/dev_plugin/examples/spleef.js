let current_match = null;

let Material = Array.type('org.bukkit.Material');
let Gamemode = Array.type('org.bukkit.GameMode');

let spleef_material = plugin.buildconfig.define_key('spleef-material', 'material');
let spleef_region = plugin.buildconfig.define_key('spleef-region', 'region');
let spawn_location = plugin.buildconfig.define_key('spleef-spawn-location', 'location');
let fall_height = plugin.buildconfig.define_key('spleef-fall-height', 'location');

console.log('Gamemode:', Gamemode);

let start_game = (player) => {
    player.teleport(spawn_location.get());

    player.setGameMode(Gamemode.SURVIVAL);

    let material = spleef_material.get();
    for (let location of spleef_region.get()) {
        console.log('location.getBlock():', location);
        location.getBlock().setType(material);
    }
}

plugin.events.onPlayerJoin(event => {
    let player = event.getPlayer();
    start_game(player);
});

plugin.events.onPlayerInteract(event => {
    console.log('Cool cool');
    let block = event.getClickedBlock();
    console.log('block:', block);
    console.log('block.getType():', block.getType());
    console.log('spleef_material.get():', spleef_material.get());
    if (block != null && block.getType() === spleef_material.get()) {
        block.setType(Material.AIR);
    }
})

plugin.events.onPlayerMove(event => {
    if (event.getTo().getY() < fall_height.get().getY()) {
        start_game(event.getPlayer());
    }
})

plugin.events.onEntityDamage(event => {
    event.setCancelled(true);
})
plugin.events.onFoodLevelChange(event => {
    event.setCancelled(true);
})
