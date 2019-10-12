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
import org.bukkit.plugin.Plugin;

public class RecursiveContext {
    // https://github.com/ronmamo/reflections#integrating-into-your-build-lifecycle
    public static Reflections reflections = new Reflections("org.bukkit.event");

    private Context context;
    private Value entry;
    private Value dispose;

    public static Value loadEntry(Context polyglot, Source entry_js) {
      Value entry_fn = polyglot.eval(entry_js);
      return entry_fn;
      // Start debugger loop
      // File debugger_loop_file = new File(getDataFolder(), "debugger_loop.js");
      // polyglot.eval(Source.newBuilder("js", debugger_loop_file).build());

      // Value result = polyglot.eval(Source.newBuilder("js", stream, "debugger_loop.js").build());
      // Value result = polyglot.eval(Source.newBuilder("js", this.getResource("debugger_loop.js")).build());
    }

    public static Context createContext(Plugin plugin) {
      Engine engine = Engine.newBuilder().build();

      Context context = Context.newBuilder("js")
        .allowAllAccess(true)
        .allowHostAccess(true)
        .engine(engine)
        .option("js.ecmascript-version", "2020")
        .option("js.experimental-foreign-object-prototype", "true")
        // .option("inspect", "8228")
        // .option("inspect.Path", "session")
        // .option("engine.inspect.Remote", "true")
        .option("js.polyglot-builtin", "true")
        .build();

      Reflections reflections = RecursiveContext.reflections;

      context.getPolyglotBindings().putMember("reflections", reflections);

      context.getPolyglotBindings().putMember("plugin", plugin);
      context.getPolyglotBindings().putMember("server", plugin.getServer());

      context.getPolyglotBindings().putMember("cwd", System.getProperty("user.dir"));
      // context.getPolyglotBindings().putMember("cwd", this.getDataFolder().getAbsolutePath());

      return context;
    }

    public RecursiveContext() {
      this(Unchained.self);
    }

    public RecursiveContext(Plugin plugin) {
      try {
        Context context = RecursiveContext.createContext(plugin);

        File file = new File(Unchained.self.getDataFolder(), "entry.js");
        Source source = Source.newBuilder("js", file).build();
        Value entry = RecursiveContext.loadEntry(context, source);

        this.context = context;
        this.entry = entry;
      } catch (Exception error) {
        error.printStackTrace();
      }
    }

    public Context getContext() {
      return this.context;
    }

    public Value invokeJavascriptBridge(String method, Object args) {
      return this.entry.execute(method, args);
    }
    public void loadPlugin(String source, String JsonObject) {
      if (this.dispose != null) {
        this.dispose.execute();
      }

      this.dispose = this.invokeJavascriptBridge("load_plugin", new String[]{source, JsonObject});
    }

    public void close() {
      if (this.dispose != null) {
        this.dispose.execute();
      }
      this.context.close();
    }
}
