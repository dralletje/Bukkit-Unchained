import { workerData } from 'worker_threads';

let ChatColor = Java.type('org.bukkit.ChatColor');

let plugin = process.binding('plugin');

let { create_isolated_plugin } = require("./isolated_plugin.js");
console.log(`${ChatColor.BLUE}ONE`)
create_isolated_plugin({ plugin, ...workerData });
console.log(`${ChatColor.BLUE}TWO`)
