let { ChatColor } = require('bukkit');
let bkEventPriority = Java.type('org.bukkit.event.EventPriority');
let bkHandlerList = Java.type('org.bukkit.event.HandlerList');
// let bukkit_pluginmanager = org.bukkit.Bukkit.pluginManager;

// Ask Nashorn to generate a class implementing the Listener
// interface, so that we may instantiate it to tag our event
// handlers.
var ScriptCraftListener = Java.extend(Java.type('org.bukkit.event.Listener'), {});

let make_addEventListener_for_plugin = (plugin) => {
  let addEventListener = function(
    eventType,
    handler,
    priority = 'HIGHEST'
  ) {
    let priority_symbol = bkEventPriority[priority.toUpperCase()];

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
        // try {
          try {
            await handler(event);
          } catch (err) {
            // TODO Add global event handling stuff
            // prettier-ignore
            console.log(`${ChatColor.DARK_RED}[${plugin.getName()}] ${ChatColor.RED}Error in event handler (${eventType}):`, err)
            if (event.getPlayer) {
              let player = event.getPlayer();
              // prettier-ignore
              player.sendMessage(`${ChatColor.DARK_RED}[${plugin.getName()}] ${ChatColor.RED}Error in event handler (${eventType}): ${err.message}`)
            }
          }
        // } catch (err) {
        //   // This gets called if there is something to do with the
        //   // `event.getPlayer()` stuff, not sure if this will ever call
        //   // BUT IF it does, I want to catch it!!
        //
        //   // prettier-ignore
        //   print('Error error:', err);
        // }
      })();
    };

    // Create an instance of our empty Listener implementation to track the handler
    var listener = new ScriptCraftListener();

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
