let { ref, java_fn } = require('./worker_threads');

let plugin = Polyglot.import("plugin");
let server = plugin.getServer();

let callback_to_runnable = callback => java_fn(callback).asRunnable();

let bukkit_set_timeout = (callback, delay_in_milliseconds, ...args) => {
  var delay = Math.ceil(delay_in_milliseconds / 50);
  let runnable = callback_to_runnable(callback.bind(null, ...args));
  var task = server.getScheduler().runTaskLater(plugin, runnable, delay);

  let task_id = task.getTaskId();
  ref({ close: () => bukkit_clear_task(task_id) });
  return task_id;
}

let bukkit_set_interval = (callback, interval_in_milliseconds, ...args) => {
  var delay = Math.ceil(interval_in_milliseconds / 50);
  let runnable = callback_to_runnable(callback.bind(null, ...args));
  var task = server
    .getScheduler()
    .runTaskTimer(plugin, runnable, delay, delay);

    let task_id = task.getTaskId();
    ref({ close: () => bukkit_clear_task(task_id) });
    return task_id;
}

let setImmediate = (callback, ...args) => {
  let runnable = callback_to_runnable(callback.bind(null, ...args));
  let task = server
    .getScheduler()
    .runTask(plugin, runnable);

  let task_id = task.getTaskId();
  ref({ close: () => bukkit_clear_task(task_id) });
  return task_id;
};

let bukkit_clear_task = (task_id) => {
  server.getScheduler().cancelTask(task_id);
}

module.exports = {
  setTimeout: bukkit_set_timeout,
  setInterval: bukkit_set_interval,
  setImmediate: setImmediate,
  clearTimeout: bukkit_clear_task,
  clearInterval: bukkit_clear_task,
  clearImmediate: bukkit_clear_task,
};
