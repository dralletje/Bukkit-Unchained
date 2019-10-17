let { Reflection } = require("./Java.js");

let path = require("path");
let fs = require("fs");

let server = process.binding("server");

let get_commandmap = () => {
  return Reflection.get_private_field(server, "commandMap");
};

let get_helpmap = () => {
  return server.getHelpMap();
};

let remove_help_topic = topic_name => {
  let x = Reflection.get_private_field(get_helpmap(), "helpTopics");
  x.remove(topic_name);
};

let unregister_commands_for_plugin = plugin => {
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
      command.setLabel("TRASHTHIS");
      let luck = command.unregister(commandMap);
    }
  }
};

let register_js_pluginloader = () => {
  let JsPluginLoader = Java_type("eu.dral.unchained.JsPluginLoader");

  if (JsPluginLoader.static.initialized === false) {
    server.getPluginManager().registerInterface(JsPluginLoader);
    JsPluginLoader.static.initialized = true;
  }
};

let glob = require("glob");

let find_folders_with_package_json = () => {
  let package_jsons = glob.sync("plugins/*/package.json", {});
  let package_json_paths = package_jsons.map(relative_path =>
    path.join(process.cwd(), relative_path)
  );
  return package_json_paths;
};

let load_all_plugins = async (with_name = null) => {
  let package_json_paths = find_folders_with_package_json();

  if (package_json_paths.length === 0) {
    // prettier-ignore
    throw new Error(`No valid plugins found in the plugins/ directory`);
  }

  let with_matching_name = package_json_paths.filter(path => {
    try {
      let plugin_description = get_plugin_description(path);
      return with_name == null || plugin_description.name === with_name;
    } catch (err) {
      return false;
    }
  });

  if (with_matching_name.length === 0) {
    throw new Error(`No plugin called "${with_name}" found`);
  }

  for (let package_json_path of with_matching_name) {
    try {
      load_plugin(package_json_path);
    } catch (error) {
      // prettier-ignore
      console.error(`Plugin "${path.relative(process.cwd(), package_json_path)}" failed to load due to an error:`);
      if (error.stack) {
        console.error(`error.stack:`, error.stack);
      } else {
        error.printStackTrace();
      }
      console.error("");
    }
  }

  // Send new commands
  try {
    let sync_commands = Reflection.get_private_method(server, "syncCommands");
    sync_commands();
  } catch (error) {}
};
let load_plugin = plugin_package_json_path => {
  let description = get_plugin_description(plugin_package_json_path);
  register_js_pluginloader();

  // Unload plugin if it is already loaded
  let plugins = Java.from(server.getPluginManager().getPlugins());
  for (let plugin of plugins) {
    let loaded_description = plugin.getDescription();
    if (loaded_description.getMain() === description.main) {
      remove_help_topic(loaded_description.getName());
      unregister_commands_for_plugin(plugin);

      server.getPluginManager().disablePlugin(plugin);
    }
  }

  // Load the plugin
  let File = Java.type("java.io.File");
  let plugin = server
    .getPluginManager()
    .loadPlugin(new File(plugin_package_json_path));

  // Enable the plugin
  server.getPluginManager().enablePlugin(plugin);
  // Try to register the helpmap correctly
  get_helpmap().initializeCommands();
};

let get_plugin_description = package_json_path => {
  let package_json_text = fs.readFileSync(package_json_path);
  let package_json = JSON.parse(package_json_text);

  if (package_json.bukkit == null) {
    throw new Error(`No 'bukkit' key in package.json @ '${package_json_path}'`);
  }

  let result = {
    name: package_json.name,
    version: package_json.version,
    author: package_json.author,
    main: path.join(
      path.relative(process.cwd(), path.dirname(package_json_path)),
      package_json.main || "index.js"
    ),
    ...package_json.bukkit
  };
  return result;
};

let methods = {
  // onTabComplete: (...args) => require('./dev_plugin/onTabComplete.js')(...args),
  onEnable: () => {
    console.log("onEnable from javascript!");
    load_all_plugins(null);
  },

  onCommand: (sender, command, alias, args) => {
    // if (alias === 'js') {
    //   let file = [...args].join(' ');
    //   let result = require(file);
    //   return true;
    // }

    if (alias === "jsplugin") {
      try {
        console.log("Starting plugin reload...");
        let plugin_name = [...args].join(" ") || null;
        load_all_plugins(plugin_name).catch(err => {
          console.log(`err:`, err);
        });
        return true;
      } catch (err) {
        console.log(`err:`, err);
      }
    }
  },

  get_plugin_description: file => {
    let package_json_path = typeof file === "string" ? file : file.getPath();
    let description = get_plugin_description(package_json_path);
    return JSON.stringify(description);
  }
};

module.exports = (method, ...args) => {
  if (methods[method]) {
    return methods[method](...Array.from(args));
  } else {
    console.log(`Unknown PluginBridge method '${method}'`);
  }
};
