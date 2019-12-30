import chat from '@unchained/chat';

// let lodash = require('lodash');

let Material = Java.type('org.bukkit.Material');
let ChatColor = Java.type('org.bukkit.ChatColor')

let spawn_position = plugin.buildconfig.define_key('spawn-position', 'location');
let start_region = plugin.buildconfig.define_key('start-region', 'region');
let end_region = plugin.buildconfig.define_key('end-region', 'region');
let fall_height = plugin.buildconfig.define_key('fall-height', 'location');

let location_is_fall = (location) => {
    return (
        location.getY() < fall_height.get().getY() ||
        location.getBlock().getRelative(0, -1, 0).getType() === Material.LIGHT_BLUE_WOOL
    );
}

let cooldown_players = {};
let player_start_timers = {};

let delay = async (milliseconds, task_fn = () => {}) => {
    return await new Promise((resolve) => {
        let task = setTimeout(resolve, milliseconds);
        task_fn(task);
    })
}

let start_session = async (player) => {
    let no_fade = { fadeIn: 0, fadeOut: 0, stay: 100 };

    if (cooldown_players[player.getName()]) {
        clearTimeout(cooldown_players[player.getName()]);
    }
    player_start_timers[player.getName()] = null;

    send_title(player, { title: chat.bold.yellow`3`, timing: no_fade });
    await delay(700, (timer) => cooldown_players[player.getName()] = timer);

    send_title(player, { title: chat.bold.yellow`2`, timing: no_fade });
    await delay(700, (timer) => cooldown_players[player.getName()] = timer);

    send_title(player, { title: chat.bold.yellow`1`, timing: no_fade });
    await delay(700, (timer) => cooldown_players[player.getName()] = timer);

    send_title(player, { title: chat.bold.green`GO`, timing: { fadeIn: 0, stay: 10, fadeOut: 5 } });
    cooldown_players[player.getName()] = null;
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

            let time = (Date.now() - player_start_timers[name]) / 1000;
            player_start_timers[name] = null;
            send_message(player, chat.green(`Nice, you scored ${time.toFixed(3)}s`));
            send_message(player, chat.run_command('/respawn', chat.bold(chat.underline`[Click to respawn]`)));
            send_action_bar(player, chat.green(chat.bold(time.toFixed(3))));

        }
    } catch (error) {
        console.log('Error:', error);
    }

    if (cooldown_players[name]) {
        let new_to = from.clone();
        new_to.setYaw(to.getYaw());
        new_to.setPitch(to.getPitch());
        event.setTo(new_to);
        return;
    }

    if (location_is_fall(to)) {
        event.setTo(spawn_position.get());
        send_action_bar(player, chat`Too bad you fell, ${chat.red`preparing run...`}`);
        start_session(player)
        .catch(err => {
            console.error('Start_session err', err);
        })
    }
});

setInterval(() => {
    for (let player of plugin.getServer().getOnlinePlayers()) {
        if (player_start_timers[player.getName()]) {
            let start = player_start_timers[player.getName()];
            let time = ((Date.now() - start) / 1000) + (Math.random() / 50);

            send_action_bar(player, chat.white`${time.toFixed(3)}`);
        }
    }
}, 100);



plugin.events.onEntityDamage(event => {
    event.setCancelled(true);
})
plugin.events.onFoodLevelChange(event => {
    event.setCancelled(true);
})

plugin.commands.registerCommand({
    name: "respawn",
    onCommand: (player, args) => {
        let reset_location = spawn_position.get();
        player.teleport(reset_location);
    },
});

let GameMode = Java.type('org.bukkit.GameMode');
plugin.events.onPlayerJoin(event => {
    let player = event.getPlayer();

    delete cooldown_players[player.getName()];
    delete player_start_timers[player.getName()];

    player.setGameMode(GameMode.CREATIVE);
    player.setAllowFlight(false);

    let reset_location = spawn_position.get();
    if (player.getLocation().distance(reset_location) > 6) {
        player.teleport(reset_location);
    }

    send_action_bar(player, chat.green`Welcome, now RUN!!`);
});

let send_action_bar = (player, json) => {
    plugin.send_packet(player, {
        name: 'title',
        params: {
            action: 2, // 0 = actionbar
            text: JSON.stringify(json),
        }
    });
}

let send_title = (player, { title, subtitle, timing }) => {
    if (timing != null) {
        plugin.send_packet(player, {
            name: 'title',
            params: {
                action: 3, // 3 = times
                fadeIn: timing.fadeIn || 0,
                fadeOut: timing.fadeOut || 0,
                stay: timing.stay || 3,
            },
        });
    }
    if (title != null) {
        plugin.send_packet(player, {
            name: 'title',
            params: {
                action: 0, // 0 = actionbar
                text: JSON.stringify(title),
            }
        });
    }
    if (subtitle != null) {
        plugin.send_packet(player, {
            name: 'title',
            params: {
                action: 1, // 0 = actionbar
                text: JSON.stringify(subtitle),
            }
        });
    }
}

let send_message = (player, json) => {
    plugin.send_packet(player, {
        name: 'chat',
        params: {
            message: JSON.stringify(json),
        }
    });
}
