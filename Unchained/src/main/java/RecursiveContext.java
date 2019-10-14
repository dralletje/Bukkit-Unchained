package eu.dral.unchained;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.Engine;

import java.io.File;
import java.util.*;

import org.bukkit.plugin.Plugin;

import org.reflections.Reflections;
// import org.reflections.util.*;
// import  org.reflections.scanners.*;

public class RecursiveContext {
    public static class InterContextEvent {
      public String name;
      public Map<String, Object> data;

      public InterContextEvent(String name) {
        this.name = name;
        this.data = null;
      }

      public InterContextEvent(String name, Value value_data) {
        this.name = name;

        Map<String, Object> data = new HashMap<String, Object>();
        for (String key : value_data.getMemberKeys()) {
          data.put(key, value_data.getMember(key).as(Object.class));
        }
        this.data = data;
      }
    }

    // https://github.com/ronmamo/reflections#integrating-into-your-build-lifecycle
    public static Reflections reflections = new Reflections("org.bukkit.event");

    private Context context;
    private Value entry;
    private Value emit_event;

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

        // NOTE Use this to move entry.js and PluginBridge.js inside the .jar
        // Reader stream = new InputStreamReader(this.getResource("boot.js"));
        // Source source = Source.newBuilder("js", stream, "boot.js").build();
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
      this.emit(new InterContextEvent("close"));

      this.emit_event = this.invokeJavascriptBridge("load_plugin", new String[]{source, JsonObject});
    }

    public InterContextEvent emit(InterContextEvent event) {
      if (this.emit_event != null) {
        try {
          return this.emit_event.execute(event).as(InterContextEvent.class);
        } catch (Exception error) {
          error.printStackTrace();
          return null;
        }
      } else {
        return null;
      }
    }

    public void close() {
      this.emit(new InterContextEvent("close"));
      try {
        this.context.close(true);
      } catch (Exception error) {

      }
    }
}
