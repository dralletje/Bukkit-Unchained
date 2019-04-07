let path = require('path');

let plugin_utils = require('./plugin_utils.js');

let parent_plugin = Polyglot.import("plugin");
let server = parent_plugin.getServer();

let promenade = async (fn) => {
  return await new Promise((resolve, reject) => {
    fn((err, result) => {
      if (err != null) {
        reject(err);
      } else {
        resolve(result);
      }
    })
  })
}

let get_hidden_field = (instance, field_name) => {
  let field = instance.getClass().getDeclaredField(field_name);
  field.setAccessible(true);
  return field.get(instance);
}

let get_commandmap = () => {
  return get_hidden_field(server, "commandMap");
}

let get_helpmap = () => {
  return server.getHelpMap();
}

let remove_help_topic = (topic_name) => {
  let x = get_hidden_field(get_helpmap(), 'helpTopics');
  x.remove(topic_name);
}

let unregister_commands_for_plugin = (plugin) => {
  let commandMap = get_commandmap();
  let commands = [...commandMap.getCommands()].filter(x => x.getPlugin != null);

  for (let command of commands) {
    let command_plugin = command.getPlugin && command.getPlugin();
    if (command_plugin === plugin) {
      // NOTE
      // To successfully unregister a command, we also need to change the label.
      // If you don't change the label, the commandMap will remember it still and keep the older version.
      // https://github.com/Bukkit/Bukkit/blob/master/src/main/java/org/bukkit/command/SimpleCommandMap.java#L149
      // https://github.com/Bukkit/Bukkit/blob/f210234e59275330f83b994e199c76f6abd41ee7/src/main/java/org/bukkit/command/Command.java#L239
      remove_help_topic(`/${command.getLabel()}`);
      command.setLabel('TRASHTHIS');
      let luck = command.unregister(commandMap);
    }
  }
}

let register_js_pluginloader = () => {
  let JsPluginLoader = Java_type('eu.dral.unchained.JsPluginLoader');

  if (JsPluginLoader.static.initialized === false) {
    let parent_plugin = Polyglot.import("plugin");
    let server = parent_plugin.getServer();

    server.getPluginManager().registerInterface(JsPluginLoader);
    JsPluginLoader.static.initialized = true
  }
}

module.exports = {
  load_all: async (with_name = null) => {
    let glob = require('glob');
    let package_jsons = await promenade((callback) => {
      glob("plugins/*/package.json", {}, callback);
    });
    package_jsons = package_jsons.filter(x => !x.includes('Graaljs'));

    // let bukkitjs = await promenade((callback) => {
    //   glob("plugins/*.bukkitjs", {}, callback);
    // });
    // bukkitjs.map(bukkitjs => {
    //   console.log(`bukkitjs:`, bukkitjs)
    // })
    // console.log(`bukkitjs:`, bukkitjs);

    let any_found = false;

    for (let package_json of package_jsons) {
      try {
        let plugin_package_json_path = path.join(process.cwd(), package_json);
        let description = plugin_utils.get_plugin_description(plugin_package_json_path);

        if (with_name == null || description.name === with_name) {
          any_found = true;
          module.exports.load_plugin(plugin_package_json_path);
        }
      } catch (err) {
        console.log(`Plugin '${package_json}' did not load:`, err);
      }
    }

    if (any_found !== true) {
      throw new Error(`No plugin for name '${with_name}' found`);
    }
  },
  load_plugin: (plugin_package_json_path) => {
    let description = plugin_utils.get_plugin_description(plugin_package_json_path);
    let parent_plugin = Polyglot.import("plugin");
    let server = parent_plugin.getServer();

    register_js_pluginloader();

    // Unload plugin if it is already loaded
    let plugins = Java.from(server.getPluginManager().getPlugins());
    for (let plugin of plugins) {
      let loaded_description = plugin.getDescription();
      if (loaded_description.getMain() === description.main) {
        remove_help_topic(loaded_description.getName())
        unregister_commands_for_plugin(plugin);

        server
          .getPluginManager()
          .disablePlugin(plugin);
      }
    }

    // Load the plugin
    let File = Java.type('java.io.File');
    let plugin = server
      .getPluginManager()
      .loadPlugin(new File(plugin_package_json_path));

    // Enable the plugin
    server.getPluginManager().enablePlugin(plugin);
    get_helpmap().initializeCommands();
  }
}
