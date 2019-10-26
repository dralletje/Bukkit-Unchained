let { ref, java_fn } = require('./worker_threads');

let plugin = Polyglot.import("plugin");
let server = plugin.getServer();

let callback_to_runnable = callback => java_fn(callback).asRunnable();

let bukkit_set_timeout = (callback, delay_in_milliseconds, ...args) => {
  var delay = Math.ceil(delay_in_milliseconds / 50);
  let runnable = callback_to_runnable(() => {
    unref(task);
    callback(...args);
  });
  var task = server.getScheduler().runTaskLater(plugin, runnable, delay);

  let unref = ref(task);
  return {
    cancel: () => {
      unref();
      task.cancel();
    }
  };
}

let bukkit_set_interval = (callback, interval_in_milliseconds, ...args) => {
  var delay = Math.ceil(interval_in_milliseconds / 50);
  let runnable = callback_to_runnable(() => {
    callback(...args);
  });
  var task = server
    .getScheduler()
    .runTaskTimer(plugin, runnable, delay, delay);

  let unref = ref(task);
  return {
    cancel: () => {
      unref();
      task.cancel();
    }
  };
}

let setImmediate = (callback, ...args) => {
  let runnable = callback_to_runnable(() => {
    unref();
    callback(...args);
  });
  let task = server
    .getScheduler()
    .runTask(plugin, runnable);

  let unref = ref(task);
  return {
    cancel: () => {
      unref();
      task.cancel();
    }
  };
};

let bukkit_clear_task = (task) => {
  if (!task.cancel) {
    throw new Error(`Invalid object passed to clearTimeout: ${task}`);
  }
  task.cancel();
  // server.getScheduler().cancelTask(task_id);
}

module.exports = {
  setTimeout: bukkit_set_timeout,
  setInterval: bukkit_set_interval,
  setImmediate: setImmediate,
  clearTimeout: bukkit_clear_task,
  clearInterval: bukkit_clear_task,
  clearImmediate: bukkit_clear_task,
};
