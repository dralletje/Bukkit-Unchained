package eu.dral.unchained;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.Engine;

import org.reflections.*;
import org.reflections.util.*;
import  org.reflections.scanners.*;

import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.HashMap;
import java.util.Map;
import java.util.*;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.event.Event;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.plugin.EventExecutor;
import org.bukkit.plugin.java.JavaPlugin;

public class Unchained extends JavaPlugin implements Listener {
    private Map<String, String> langs = new HashMap<String, String>() {
        {
            put("js", ".js");
            put("python", ".py");
            put("ruby", ".rb");
            //TODO add more langs
        }
    };

    public static Unchained self;
    private Context context;
    public static Value javascript_bridge;
    public static Reflections reflections;

    @Override
    public void onEnable() {
      Unchained.self = this;
      if (!getDataFolder().exists()) {
        getDataFolder().mkdir();
      }

      // try {
      //   Http.start_server(8000, this.pluginBridge("onServerStart"));
      // } catch(Exception e) {
      //   e.printStackTrace();
      // }

      this.getLogger().info("Running plugin bridge onEnable");

      this.pluginBridge("onEnable");
    }

    @Override
    public void onDisable() {
        this.getContext().close();
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
      this.pluginBridge("onCommand", sender, command, label, args);
      return true;
    }

    private Value pluginBridge(String method, Object ... args) {
      try {
        return this.getJavascriptBridge().execute(method, args);
      } catch (Exception e) {
        e.printStackTrace();
        return null;
      }
    }

    // public List<String> onTabComplete(CommandSender sender, Command cmd, String alias, String[] args) {
    //   return this.pluginBridge("onTabComplete", sender, cmd, alias, args).as(List.class);
    // }

    private Value getJavascriptBridge() {
      if (this.javascript_bridge == null) {

        this.getLogger().info("Initializing javascript bridge");
        // NOTE Use this to move entry.js and PluginBridge.js inside the .jar
        // Reader stream = new InputStreamReader(this.getResource("boot.js"));
        // Value result = polyglot.eval(Source.newBuilder("js", stream, "boot.js").build());

        try {
          Context polyglot = this.getContext();
          this.getLogger().info("Got context!");

          File file = new File(getDataFolder(), "entry.js");
          Value entry_fn = polyglot.eval(Source.newBuilder("js", file).build());
          this.javascript_bridge = entry_fn;

          this.getLogger().info("Javascript bridge initialized!");

          // Start debugger loop
          // File debugger_loop_file = new File(getDataFolder(), "debugger_loop.js");
          // polyglot.eval(Source.newBuilder("js", debugger_loop_file).build());

          // Value result = polyglot.eval(Source.newBuilder("js", stream, "debugger_loop.js").build());
          // Value result = polyglot.eval(Source.newBuilder("js", this.getResource("debugger_loop.js")).build());

        } catch (Exception e) {
          // sender.sendMessage(e.getMessage());
          this.getLogger().info("Initializing javascript bridge failed:");
          e.printStackTrace();
          return null;
        }
      }
      return this.javascript_bridge;
    }

    private Context getContext() {
        if (this.context == null) {
          // Engine engine = Engine.newBuilder()
          Context context = Context.newBuilder("js")
            .allowAllAccess(true)
            .allowHostAccess(true)
            // .option("inspect", "8228")
            // .option("inspect.Path", "session")
            // .option("engine.inspect.Remote", "true")
            .option("js.polyglot-builtin", "true")
            .build();

          // https://github.com/ronmamo/reflections#integrating-into-your-build-lifecycle
          Reflections reflections = new Reflections("org.bukkit.event");
          // List<ClassLoader> classLoadersList = new LinkedList<ClassLoader>();
          // classLoadersList.add(ClasspathHelper.contextClassLoader());
          // classLoadersList.add(ClasspathHelper.staticClassLoader());
          // Reflections reflections = new Reflections(new ConfigurationBuilder()
          //     .setScanners(new SubTypesScanner(false /* don't exclude Object.class */), new ResourcesScanner())
          //     .setUrls(ClasspathHelper.forClassLoader(classLoadersList.toArray(new ClassLoader[0])))
          //     .filterInputsBy(new FilterBuilder().include(FilterBuilder.prefix("org.bukkit.event"))));
          Unchained.reflections = reflections;

          context.getPolyglotBindings().putMember("reflections", reflections);

          context.getPolyglotBindings().putMember("plugin", this);
          context.getPolyglotBindings().putMember("server", this.getServer());

          context.getPolyglotBindings().putMember("cwd", System.getProperty("user.dir"));
          // context.getPolyglotBindings().putMember("cwd", this.getDataFolder().getAbsolutePath());

          this.context = context;
        }
        return this.context;
    }
}
