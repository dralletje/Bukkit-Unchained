let { ChatColor, Unchained } = require('bukkit');
let bukkit_EventPriority = Java.type('org.bukkit.event.EventPriority');

let BukkitHandlerList = Java.type('org.bukkit.event.HandlerList');

// let bukkit_pluginmanager = org.bukkit.Bukkit.pluginManager;

// Create a class based on the listener interface so we can `new Xxx()` it
var UnchainedListener = Java.extend(Java.type('org.bukkit.event.Listener'), {});

let make_addEventListener_for_plugin = (plugin) => {
  let addEventListener = (
    eventType,
    handler,
    { priority = 'HIGHEST' } = {},
  ) => {
    let priority_symbol = bukkit_EventPriority[priority.toUpperCase()];

    var eventExecutor = function(listener, event) {
      (async () => {
          try {
            await handler(event);
          } catch (error) {
            Unchained.handle_error({
              error: error,
              location: `event handler`,
              name: eventType.getName(),
              player: event.getPlayer && event.getPlayer(),
            });
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

    return {
      dispose: () => {
        BukkitHandlerList.unregisterAll(listener);
      },
    };
  };

  let results = {
    on: addEventListener,
    addEventListener: addEventListener,
    as_list: [],
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
      return addEventListener(event_class, ...args);
    };
    results.as_list.push({
      name: event_name,
      JavaClass: event_class,
      addListener: (...args) => {
        return addEventListener(event_class, ...args);
      },
    })
  }
  return results;
}

let plugin = Polyglot.import('plugin');
module.exports = make_addEventListener_for_plugin(plugin)
module.exports.make_addEventListener_for_plugin = make_addEventListener_for_plugin;
