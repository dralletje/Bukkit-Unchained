package eu.dral.unchained;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;

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
    private Context context;
    private Map<String, String> langs = new HashMap<String, String>() {
        {
            put("js", ".js");
            put("python", ".py");
            put("ruby", ".rb");
            //TODO add more langs
        }
    };

    public static Unchained self;
    public static Value javascript_bridge;
    public static Reflections reflections;

    @Override
    public void onEnable() {
        Unchained.self = this;
        if (!getDataFolder().exists()) {
            getDataFolder().mkdir();
        }

        this.pluginBridge("onEnable");
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (label.startsWith("graal")) {
          String lang = label.replace("graal", "");
          if (!langs.containsKey(lang)) {
              sender.sendMessage(ChatColor.RED + "Language " + lang + " not found!");
              return true;
          }

          try {
            String src = String.join(" ", args);
            Value result = this.createContext(null).eval(lang, src);
            sender.sendMessage(result.toString());
          } catch (PolyglotException ex) {
            sender.sendMessage(ChatColor.RED + "Error: " + ex.getMessage());
            ex.printStackTrace();
          }

          return true;
        } else {
          this.pluginBridge("onCommand", sender, command, label, args);
          return true;
        }
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
        // NOTE Use this to move entry.js and PluginBridge.js inside the .jar
        // Reader stream = new InputStreamReader(this.getResource("boot.js"));
        // Value result = polyglot.eval(Source.newBuilder("js", stream, "boot.js").build());

        try {
          Context polyglot = this.createContext(null);
          File file = new File(getDataFolder(), "entry.js");
          Value entry_fn = polyglot.eval(Source.newBuilder("js", file).build());
          this.javascript_bridge = entry_fn;
        } catch (Exception e) {
          // sender.sendMessage(e.getMessage());
          e.printStackTrace();
          return null;
        }
      }
      return this.javascript_bridge;
    }

    private Context createContext(CommandSender sender) {
        if (this.context == null) {
          Context context = Context.newBuilder(langs.keySet().toArray(new String[0])).allowHostAccess(true).build();

          // https://github.com/ronmamo/reflections#integrating-into-your-build-lifecycle
          // Reflections reflections = new Reflections("org.bukkit.event");
          List<ClassLoader> classLoadersList = new LinkedList<ClassLoader>();
          classLoadersList.add(ClasspathHelper.contextClassLoader());
          classLoadersList.add(ClasspathHelper.staticClassLoader());
          Reflections reflections = new Reflections(new ConfigurationBuilder()
              .setScanners(new SubTypesScanner(false /* don't exclude Object.class */), new ResourcesScanner())
              .setUrls(ClasspathHelper.forClassLoader(classLoadersList.toArray(new ClassLoader[0])))
              .filterInputsBy(new FilterBuilder().include(FilterBuilder.prefix("org.bukkit.event"))));
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
