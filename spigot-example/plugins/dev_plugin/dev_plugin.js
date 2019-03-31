let Bukkit = require('bukkit');
let { BukkitPlugin } = Bukkit;

let onTabComplete = require('./onTabComplete.js');
let repl = require('./repl.js');

// let local_global = {};

module.exports = (plugin) => {
  plugin.command('jsrepl', {
    onCommand: (sender, command, alias, args) => {
      repl(plugin, sender, [...args].join(' '));
      return true;
    },
    onTabComplete: (sender, command, alias, args) => {
      console.log(`sender.toString():`, sender.toString())
      let result = onTabComplete(plugin, sender, args);
      return result;
    },
  });
}
