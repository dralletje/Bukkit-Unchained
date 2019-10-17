# Unchained playground

Before I release this as a proper plugin, I just take this whole thing for playing around with it.

Also I totally assume you have [node.js](https://nodejs.org/en/) installed.
I mean, com'on.

### Cool cool, but what is this?

A way to run plugins written in javascript at bukkit/spigot.
The main reason is because I DETEST the java development cycle,
and I love the ease of experimentation that javascript provides.

### Cool cool, how do I get this running?

**Downloads:**
- Graalvm (https://github.com/oracle/graal/releases)  
  Unzip unto `graal-bin` folder.
- Spigot/Paper (https://papermc.io/downloads)  
  Not entirely sure what the difference is and I don't really care.  
  Put it at `spigot-example/minecraft-server.jar`.
- ProtocolLib (https://www.spigotmc.org/resources/protocollib.1997/)
  For my portals plugin to use packets to spoof the portals appearing in high(er) speed.  
  Put at `spigot-example/plugins/ProtocolLib.jar`
- Worldedit (https://dev.bukkit.org/projects/worldedit/files)  
  Not necessary, but really don't bother without it.
  Make sure you download a version that works with `1.13` or higher.   
  Put this at `spigot-example/plugins/Worldedit.jar`.

**Compile Unchained**

First you need to have `maven` installed. If you have [Homebrew](https://brew.sh/), you can install `maven` with

```
brew install maven
```

Once that is ready, `npm run compile-unchained` should do the trick!  
It will also move `Unchained.jar` into the `spigot-example/plugins` directory automatically.

**Actually run it**

```
npm run run-minecraft-server
```

While on the server, Unchained provides two commands
- `/js <filename>`
  Run a file from the `plugins/Unchained` directory.
  This is very bare, and I don't really know why I have it now.
- `/jsplugin <plugin name>`
  Load a javascript plugin by name (or all plugin, if no name is provided).
  Look at the "Plugin Atonomy" section for more information.

You need to run `npm install` in most the plugin directories before you can run them.
Even in `spigot-example/plugins/Unchained` itself (even though it is not a plugin).

Also in `spigot-example/plugins/portals` you need to have `npm run watch` running, because webpack is used to pre-compile the code.

### Basic architecture

So I try to keep as much as possible in javascript.
You will see the Java parts are small, and really don't contain that much logic.
For now, all of this is in the `spigot-example/plugins/Unchained` directory.
Eventually I will compile it into the jar file, but for now it I am changing the core too much.

- `entry.js`
  Really the initial-initial file that is loaded before any other javascript file.
  This tweaks `console.log`, defines `global.process`, and loads in the require implementation from `require.js`,
  and then returns the require function (so from java, you can load a next file).
- `require.js`
  Contains a bare-bones require implementation, but it certainly does not work very well 😂.
  This is why I use webpack now in my biggest plugin, because my require implementation just didn't cut it (also using webpack is a lot faster it turns out).
- `PluginBridge.js`
  Contains the hooks for the base plugin, stuff like
  - onEnable
  - onCommand  
  And basics for loading the plugin (combined with `plugin.js`)
- `fs.js`
  Basic implementation for `fs` that uses Java.

### Plugin Atonomy

*I am chronically unsure about all of this*

The basis is `package.json`, which you can create with `npm init`.
To illustrate how `package.json` maps to normal `plugin.yml`-s, look at the actual code:

```javascript
return {
  name: package_json.name,
  version: package_json.version,
  author: package_json.author,
  main: package_json.main,
  ...package_json.bukkit,
}
```

So if you want to add commands or help or, anything really, you add them to the `bukkit` property in your package.json.

Your main file, as described in `package_json.main` property, will be loaded in. It is expected to return a function that will take the java plugin proxy as argument. This plugin proxy has a couple of methods and properties:

- `.java` - Reference to the actual java plugin object.
- `.command(name: string, handler: function)`
  Register a handler for a command. The handler function will receive the same arguments as the bukkit `onCommand` handler. [More info about onCommand](https://bukkit.gamepedia.com/Plugin_Tutorial#The_onCommand.28.29_Method).
- `.events.<EventName>(handler: function)`
  Preloaded with all possible bukkit events, with their names like `PlayerMove`, `BlockBreak`. Again, the handler takes the exact same arguments as the handler in java.  
  Full lists can be found here:
  - [Block events](https://hub.spigotmc.org/javadocs/bukkit/org/bukkit/event/block/package-summary.html)
  - [Player events](https://hub.spigotmc.org/javadocs/bukkit/org/bukkit/event/player/package-summary.html)
  - [Entity events](https://hub.spigotmc.org/javadocs/bukkit/org/bukkit/event/entity/package-summary.html)

Because of the lacking `require()` implementation, and just the fact people have worked hours and hours in getting a node-ish-like environment on other places, I think using webpack to pre-pack plugins is ideal.

### Roadmap-ish

[x] **Something with threads**
  I need to, idk, at least load in the javascript in the background.
  Right now, everything freezes when I re-load a plugin. Also because I need it for the portals plugin, I want some way do processing in a background thread without freezing the server.

[ ] **Make everything more solid**
  This will come over time, I just need to experiment with it more.

[x] **Give every plugin a separate context**
  I think this is better for plugin to have a lot of separation,
  just to prevent all these stupid bugs that will come from sharing.

[x] **Build process worked out**
  I think I should just make webpack mandatory, but I need to make sure I keep this stuff as basic and simple as possible. Also I think it would be cool to have a react-native style hybrid plugin, where you can still make some classes in java when you need it.
