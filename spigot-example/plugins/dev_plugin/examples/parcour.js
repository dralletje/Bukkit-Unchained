let lodash = require('lodash');
let { ChatColor } = bukkit;

let spawn_position = plugin.buildconfig.define_key('spawn-position', 'location');
let start_region = plugin.buildconfig.define_key('start-region', 'region');
let end_region = plugin.buildconfig.define_key('end-region', 'region');
let fall_height = plugin.buildconfig.define_key('fall-height', 'location');

let location_is_fall = (location) => {
    return (
        location.getY() < fall_height.get().getY() ||
        location.getBlock().getRelative(0, -1, 0).getType() === bukkit.Material.LIGHT_BLUE_WOOL
    );
}

let cooldown_players = {};
let player_start_timers = {};

let start_session = (player) => {
    clearTimeout(cooldown_players[player.getName()] || 0);
    player_start_timers[player.getName()] = null;
    cooldown_players[player.getName()] = setTimeout(() => {
        cooldown_players[player.getName()] = null;

        player.sendActionBar(`${ChatColor.GREEN}Go go go!!`);
        setTimeout(() => {
        }, 1000)
    }, 1000);
}

plugin.events.onPlayerMove((event) => {
    let player = event.getPlayer();
    let name = player.getName();
    let to = event.getTo();
    let from = event.getFrom();

    try {
        // console.log('start_region.get():', start_region.get())
        // console.log('start_region.get().contains(to):', start_region.get().contains(to))
        if (start_region.get().contains(to)) {
            player_start_timers[name] = Date.now();
        }
        if (end_region.get().contains(to) && player_start_timers[name] != null) {
            let time = (Date.now() - player_start_timers[name]) / 1000;
            player_start_timers[name] = null;
            player.sendMessage(`Nice, you scored ${time.toFixed(3)}s`)
            player.sendActionBar(`${ChatColor.WHITE}${time.toFixed(3)}`)

        }
    } catch (error) {
        console.log('Error:', error);
    }

    if (cooldown_players[name]) {
        if (
            to.getX() !== from.getX() ||
            to.getY() !== from.getY() ||
            to.getZ() !== from.getZ()
        ) {
            event.setCancelled(true);
        }
        return;
    }

    if (location_is_fall(to)) {
        event.setTo(spawn_position.get());
        player.sendActionBar(`Too bad you fell, ${ChatColor.RED}preparing run...`);
        start_session(player)
    }
});

setInterval(() => {
    for (let player of plugin.getPlayers()) {
        if (player_start_timers[player.getName()]) {
            let start = player_start_timers[player.getName()];
            let time = (Date.now() - start) / 1000;
            player.sendActionBar(`${ChatColor.WHITE}${time.toFixed(3)}`)
        }
    }
}, 100);

plugin.events.onEntityDamage(event => {
    event.setCancelled(true);
})
plugin.events.onFoodLevelChange(event => {
    event.setCancelled(true);
})

let GameMode = Java.type('org.bukkit.GameMode');
plugin.events.onPlayerJoin(event => {
    let player = event.getPlayer();
    player.setGameMode(GameMode.SURVIVAL);

    let reset_location = spawn_position.get();
    if (player.getLocation().distance(reset_location) > 6) {
        player.teleport(reset_location);
    }
    player.sendActionBar(`${ChatColor.GREEN}Welcome, now RUN!!`)
    // start_session(player);
})

module.exports = { success: true };
