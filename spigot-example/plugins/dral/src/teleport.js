import { command_success, command_error } from "./chat.js";

let TeleportCause = Java.type('org.bukkit.event.player.PlayerTeleportEvent.TeleportCause');

export let TeleportPlugin = (plugin) => {
  let WeakIdentityHashMap = Java_type("eu.dral.unchained.WeakIdentityHashMap");
  let last_locations = new WeakIdentityHashMap();
  let BACK_CAUSES = [
    TeleportCause.COMMAND,
    TeleportCause.SPECTATE,
    // TeleportCause.UNKNOWN,
    TeleportCause.PLUGIN,
  ]
  plugin.events.PlayerTeleport(event => {
    let cause = event.getCause();
    if (BACK_CAUSES.includes(cause)) {
      let locations = last_locations.get(event.getPlayer()) || [];
      console.log('ADDING:', locations.length + 1)
      last_locations.put(event.getPlayer(), [event.getFrom(), ...locations])
    }
  });
  plugin.events.PlayerRespawn(event => {
    let player = event.getPlayer();
    let locations = last_locations.get(player) || [];
    last_locations.put(player, [player.getLocation(), ...locations])
  })

  // let tp_command = {
  //   onTabComplete: autocomplete_players,
  //   onCommand: (sender, command, alias, [to_player]) => {
  //     console.log(`alias:`, alias)
  //     sender.chat('/coreprotect:co restore time: 10s radius: 9 user: @p')
  //   },
  // }
  // plugin.command("tp", tp_command);
  // plugin.command("teleport", tp_command);
  plugin.command("back", {
    onCommand: (sender, command, alias, [times = 1]) => {
      let my_last_locations = last_locations.get(sender) || [];
      console.log(`last_locations.length:`, my_last_locations.length)
      let [last_location, ...locations] = my_last_locations.slice(times - 1);
      console.log(`locations.length:`, locations.length)
      if (last_location) {
        sender.teleport(last_location, TeleportCause.UNKNOWN);
        last_locations.put(sender, locations);
        sender.sendMessage(command_success('/back', `Aaaand we're back`));
      } else {
        sender.sendMessage(command_error('/back', `No previous teleport location found`));
      }
    }
  })

}
