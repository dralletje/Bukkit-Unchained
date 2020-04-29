module.exports = (plugin) => {
  plugin.command("spectate", {
    onCommand: (sender, command, alias, [person_to_spectate]) => {
      if (!person_to_spectate) {
        sender.chat('/minecraft:gamemode creative');
      } else {
        sender.chat(`/minecraft:gamemode spectate`);
        sender.chat(`/minecraft:spectate ${person_to_spectate}`);
      }
    },
    onTabComplete: (sender, command, alias, args) => {
      let value = args[1];
      let players = plugin.java.getServer().getOnlinePlayers();
      // TODO fuzzy filter by player name
      return Java.from(players).map(x => x.getName())
    }
  });

  plugin.command("killanimals", {
    onCommand: (sender, command, alias) => {
      sender.chat('/minecraft:kill @e[distance=1..10]')
    },
  });

  // TODO Add custom seconds/minutes argument
  plugin.command("undo", {
    onCommand: (sender, command, alias) => {
      sender.chat('/coreprotect:co rollback time: 30s radius: 9 user: @p')
    },
  });

  plugin.command("redo", {
    onCommand: (sender, command, alias) => {
      sender.chat('/coreprotect:co restore time: 10s radius: 9 user: @p')
    },
  });
}
