let plugin = Polyglot.import("plugin");
let server = plugin.getServer();

let Runnable = Java.type('java.lang.Runnable');

function bukkitSetTimeout(callback, delayInMillis) {
  let MyRunnable = Java.extend(Runnable, {
    run: function() {
      callback();
    },
  })
  let _runnable = new MyRunnable();

  var delay = Math.ceil(delayInMillis / 50);
  var task = server.getScheduler().runTaskLater(plugin, _runnable, delay);
  return task;
}
function bukkitClearTimeout(task) {
  task.cancel();
}
function bukkitSetInterval(callback, intervalInMillis) {
  let MyRunnable = Java.extend(Runnable, {
    run: function() {
      callback();
    },
  })
  let _runnable = new MyRunnable();


  var delay = Math.ceil(intervalInMillis / 50);
  var task = server
    .getScheduler()
    .runTaskTimer(
      plugin,
      _runnable,
      delay,
      delay
    );
  return task;
}
function bukkitClearInterval(bukkitTask) {
  bukkitTask.cancel();
}
module.exports = function(g) {
  g.setTimeout = bukkitSetTimeout;
  g.clearTimeout = bukkitClearTimeout;
  g.setInterval = bukkitSetInterval;
  g.clearInterval = bukkitClearInterval;
};
