let { ChatColor } = require('bukkit');
let bukkit_EventPriority = Java.type('org.bukkit.event.EventPriority');
let bkHandlerList = Java.type('org.bukkit.event.HandlerList');

// let bukkit_pluginmanager = org.bukkit.Bukkit.pluginManager;

// Create a class based on the listener interface so we can `new Xxx()` it
var UnchainedListener = Java.extend(Java.type('org.bukkit.event.Listener'), {});

let format_error = (err) => {
  if (err.getMessage && err.getMessage()) {
    err.printStackTrace();
    return err.getMessage();
  } else {
    return err;
  }
}

let make_addEventListener_for_plugin = (plugin) => {
  let addEventListener = function(
    eventType,
    handler,
    priority = 'HIGHEST'
  ) {
    let priority_symbol = bukkit_EventPriority[priority.toUpperCase()];

    var eventExecutor = function(listener, event) {
      // console.log(`whatsthisidk:`, whatsthisidk)
      // function cancel() {
      //   if (evt instanceof Java.type('org.bukkit.event.Cancellable')) {
      //     evt.cancelled = true;
      //   } else {
      //     throw new Error('Event not cancellable');
      //   }
      // }

      (async () => {
          try {
            await handler(event);
          } catch (err) {
            try {
              // TODO Add global event handling stuff
              // prettier-ignore
              console.log(`${ChatColor.DARK_RED}[${plugin.getName()}] ${ChatColor.RED}Error in event handler (${eventType}):`, format_error(err))
              if (event.getPlayer && event.getPlayer()) {
                let player = event.getPlayer();
                // prettier-ignore
                player.sendMessage(`${ChatColor.DARK_RED}[${plugin.getName()}] ${ChatColor.RED}Error in event handler (${eventType}): ${err.message}`)
              }
            } catch (error) {
              // This gets called if there is something to do with the
              // `event.getPlayer()` stuff, not sure if this will ever call
              // BUT IF it does, I want to catch it!!

              // prettier-ignore
              print('Error error:');
              print(error)
            }
          }
      })();
    };

    // Create an instance of our empty Listener implementation to track the handler
    var listener = new UnchainedListener();

    let bukkit_pluginmanager = plugin.getServer().getPluginManager();

    bukkit_pluginmanager.registerEvent(
      eventType.class || eventType,
      listener,
      priority_symbol,
      eventExecutor,
      plugin
    );

    // result.unregister = function() {
    //   bkHandlerList.unregisterAll(listener);
    // };
    //
    // return result;
  };

  let results = {
    on: addEventListener,
    addEventListener: addEventListener,
  };
  // https://github.com/ronmamo/reflections#integrating-into-your-build-lifecycle
  let reflections = Polyglot.import('reflections');
  // let event_classes = reflections.getSubTypesOf(Java.type('java.lang.Object').class);
  let event_classes = reflections.getSubTypesOf(Java.type('org.bukkit.event.Event').class);

  for (let event_class of event_classes) {
    let name = event_class.getName();
    let match = name.match(/org\.bukkit\.event\.(.*)\.(.*)Event/);
    if (match == null) {
      continue;
    }

    let [_1, namespace, event_name] = match;
    results[event_name] = (...args) => {
      addEventListener(event_class, ...args);
    };
  }
  return results;
}

let plugin = Polyglot.import('plugin');
module.exports = make_addEventListener_for_plugin(plugin)
module.exports.make_addEventListener_for_plugin = make_addEventListener_for_plugin;
