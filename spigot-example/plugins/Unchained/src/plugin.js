let path = require('path');
let chalk = require('chalk');

let plugin_utils = require('./plugin_utils.js');

let server = process.binding("server");


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
    server.getPluginManager().registerInterface(JsPluginLoader);
    JsPluginLoader.static.initialized = true
  }
}

let find_folders_with_package_json = async () => {
  let glob = require('glob');
  let package_jsons = await promenade((callback) => {
    glob("plugins/*/package.json", {}, callback);
  });

  let package_json_paths = package_jsons.map(relative_path => path.join(process.cwd(), relative_path));

  return package_json_paths;
}

let get_private_property = (object, field_name) => {
  try {
    let field = object.getClass().getDeclaredField(field_name);
    field.setAccessible(true);
    return field.get(object);
  } catch (error) {
    console.log(`Error while taking ${field_name} from `, object);
    console.log(error)
  }
};

let get_private_method = (object, field_name) => {
  try {
    let method = object.getClass().getDeclaredMethod(field_name);
    method.setAccessible(true);
    return () => method.invoke(object);
  } catch (error) {
    console.log(`Error while called method ${field_name} on `, object);
    console.log(error)
  }
};

module.exports = {
  load_all: async (with_name = null) => {
    let package_json_paths = await find_folders_with_package_json();

    if (package_json_paths.length === 0) {
      // prettier-ignore
      throw new Error(`No valid plugins found in the plugins/ directory`);
    }

    let with_matching_name =
      with_name == null
      ? package_json_paths
      : (
        package_json_paths.filter(path => {
          try {
            let plugin_description = plugin_utils.get_plugin_description(path)
            return plugin_description.name === with_name
          } catch (err) {
            return false;
          }
        })
      );

    if (with_matching_name.length === 0) {
      throw new Error(`No plugin called "${with_name}" found`);
    }

    for (let package_json_path of with_matching_name) {
      try {
        module.exports.load_plugin(package_json_path);
      } catch (error) {
        // prettier-ignore
        console.log(chalk.red(`Plugin "${path.relative(process.cwd(), package_json_path)}" failed to load due to an error:`));
        console.log(chalk.red(`${chalk.dim("Message:")} ${error.message}`));
        console.log(chalk.red.dim(error.stack));
        console.log('');
      }
    }

    // Send new commands
    try {
      let sync_commands = get_private_method(server, 'syncCommands');
      sync_commands();
    } catch (error) {}
  },
  load_plugin: (plugin_package_json_path) => {
    let description = plugin_utils.get_plugin_description(plugin_package_json_path);
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
    // Try to register the helpmap correctly
    get_helpmap().initializeCommands();
  }
}
