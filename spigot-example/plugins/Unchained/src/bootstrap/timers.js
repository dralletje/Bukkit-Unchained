let plugin = Polyglot.import("plugin");
let server = plugin.getServer();

let Runnable = Java.type("java.lang.Runnable");

let callback_to_runnable = callback => {
  let MyRunnable = Java.extend(Runnable, {
    run: function() {
      callback();
    }
  });
  let _runnable = new MyRunnable();
  return _runnable;
};

let bukkit_set_timeout = (callback, delay_in_milliseconds) => {
  var delay = Math.ceil(delay_in_milliseconds / 50);
  var task = server.getScheduler().runTaskLater(plugin, callback_to_runnable(callback), delay);
  return task.getTaskId();
}

let bukkit_clear_timeout = (task_id) => {
  server.getScheduler().cancelTask(task_id);
}

let bukkit_set_interval = (callback, interval_in_milliseconds) => {
  var delay = Math.ceil(interval_in_milliseconds / 50);
  var task = server
    .getScheduler()
    .runTaskTimer(plugin, callback_to_runnable(callback), delay, delay);
  return task.getTaskId();
}
let bukkit_clear_interval = (task_id) => {
  server.getScheduler().cancelTask(task_id);
}

module.exports = function(global) {
  global.setTimeout = bukkit_set_timeout;
  global.clearTimeout = bukkit_clear_timeout;
  global.setInterval = bukkit_set_interval;
  global.clearInterval = bukkit_clear_interval;

  global.clearImmediate = bukkit_clear_interval;
  global.setImmediate = (callback) => {
    server
      .getScheduler()
      .runTask(plugin, callback_to_runnable(callback));
  };
};
