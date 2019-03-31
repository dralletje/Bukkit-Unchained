let { ChatColor } = require('bukkit');
let { inspect } = require('util');

let player_environment = {
  'playername': {
    timeout: 1, // setTimeout result
    exports: {}, // Runner,
    last_result: null,
  },
};

let repl = (plugin, player, code) => {
  player.sendMessage(`${ChatColor.DARK_GRAY}> ${ChatColor.GRAY}${code}`);
  let repl_fn = load({
    name: '~repl',
    script: `(function($_, self, events, exports, require, module, __dirname, __filename) { return ${code} })`,
  });
  let player_env = player_environment[player.getName()] || {
    timeout: null, // setTimeout result
    exports: {}, // Runner,
    last_result: null,
  };

  try {
    let result = repl_fn(player_env.last_result, player, plugin.events, player_env.exports, require, module, __dirname, __filename);
    player_environment[player.getName()] = {
      timeout: null,
      exports: player_env.exports,
      last_result: result,
    }
    for (let line of inspect(result).split('\n')) {
      player.sendMessage(`${ChatColor.DARK_BLUE}> ${ChatColor.BLUE}${line}`);
    }
  } catch (err) {
    if (err.stack == null) {
      player.sendMessage(`${ChatColor.RED}> ${ChatColor.DARK_RED}${err.toString()}`);
    } else {
      for (let line of err.stack.split('\n')) {
        player.sendMessage(`${ChatColor.RED}> ${ChatColor.DARK_RED}${line}`);
      }
    }
  }
}

module.exports = repl;
