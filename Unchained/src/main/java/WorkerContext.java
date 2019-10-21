package eu.dral.unchained;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.Engine;

import java.io.File;
import java.io.OutputStream;
import java.io.BufferedOutputStream;
import java.util.*;
import java.util.function.Consumer;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.lang.AutoCloseable;

import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitTask;

import org.reflections.Reflections;

public class WorkerContext implements AutoCloseable {
    // public static class InterContextValue {
    //   // public Map<String, Object> data;
    //   public Object data;
    //
    //   public InterContextValue(Object value) {
    //     this.data = value;
    //   }
    //
    //   public InterContextValue(Value value_data) {
    //     this.data = WorkerContext.htmlLikeClone(value_data);
    //   }
    // }

    public class ExposedContext {
      private ArrayList<AutoCloseable> closables = new ArrayList<AutoCloseable>();

      // public Consumer<InterContextValue> listener;
      public Consumer<Object> listener;

      public void ExposedContext() {}

      public CompletelyGenericFunction wrap_function(Plugin plugin, Value fn, String stack) {
          return new CompletelyGenericFunction() {
            public Object apply(Object... args) {
              if (plugin.getServer().isPrimaryThread()) {
                // System.out.println("Running on primary thread!");
                try {
                  fn.executeVoid(args);
                } catch (IllegalStateException error) {
                  System.err.println("Calling javascript function with context already closed:");
                  error.printStackTrace();
                  System.err.println("JS stack:");
                  System.err.println(stack);
                }
              } else {
                System.out.println("Running from other thread!");
                plugin.getServer().getScheduler().runTask(plugin, () -> {
                  System.out.println("Jumped into bukkit thread!");
                  try {
                    fn.executeVoid(args);
                  } catch (IllegalStateException error) {
                    System.err.println("Calling javascript function with context already closed:");
                    error.printStackTrace();
                    System.err.println("JS stack:");
                    System.err.println(stack);
                  }
                });
              }
              return this;
            }
          };
        }


      public void addClosable(AutoCloseable closable) {
        closables.add(closable);
      }

      public void closeAll() {
        for (AutoCloseable closable : closables) {
          try {
            closable.close();
          } catch (Exception error) {
            error.printStackTrace();
          }
        }
      }

      public void postMessage(Object message) throws Exception {
        if (WorkerContext.this.onMessage == null) {
          throw new Exception("No listener set up for this context");
        }
        WorkerContext.this.onMessage.accept(message);
      }

      // public void onMessage(Consumer<InterContextValue> listener) throws Exception {
      public void onMessage(Consumer<Object> listener) throws Exception {
        if (this.listener != null) {
          throw new Exception("Already a listener set!");
        }
        this.listener = listener;
      }
    }

    // https://github.com/ronmamo/reflections#integrating-into-your-build-lifecycle
    public static Reflections reflections = new Reflections("org.bukkit.event");

    private Context context;
    private Value exports;
    private Plugin plugin;
    private ExposedContext exposed_context;
    public Consumer<Object> onMessage;

    @FunctionalInterface
    public interface NodeStyleCallback {
        public void apply(Exception error, Object value);
    }

    static public void async(Plugin plugin, NodeStyleCallback callback, Callable<Object> task)  {
      // System.out.println("async start");
      plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
        try {
          // System.out.println("async execute " + (plugin.getServer().isPrimaryThread() ? "Sync" : "Async"));
          Object thing = task.call();
          // System.out.println("async success " + (plugin.getServer().isPrimaryThread() ? "Sync" : "Async"));
          plugin.getServer().getScheduler().runTask(plugin, () -> {
            // System.out.println("async success callback");
            callback.apply(null, thing);
          });
        } catch (Exception error){
          plugin.getServer().getScheduler().runTask(plugin, () -> {
            // System.out.println("async error callback");
            callback.apply(error, null);
          });
        }
      });
    }

    static public Object htmlLikeClone(Value value) {
      // if (!(object instanceof Value)) {
      //   System.out.println("Is not a value??");
      //   return object;
      // }
      // Value value = (Value) object;

      if (value.isBoolean()) {
        return value.asBoolean();
      }
      if (value.isNumber()) {
        return value.as(Double.class);
      }
      if (value.isString()) {
        return value.asString();
      }
      // if (value.isDate()) {
      //   return value.asDate();
      // }
      if (value.isHostObject()) {
        return value.asHostObject();
      }
      if (value.hasArrayElements()) {
        List<Value> unparsed_list = value.as(List.class);
        List<Object> parsed_list = new ArrayList<Object>();
        for (Value unparsed : unparsed_list) {
          parsed_list.add(WorkerContext.htmlLikeClone(unparsed));
        }
        return parsed_list;
      }
      if (value.hasMembers()) {
        Map<String, Object> data = new HashMap<String, Object>();
        for (String key : value.getMemberKeys()) {
          data.put(key, WorkerContext.htmlLikeClone(value.getMember(key)));
        }
        return data;
      }
      return null;
    }

    static public void createAsync(
      Plugin plugin,
      Object workerData,
      Consumer<Object> onMessage,
      String file_to_load,
      OutputStream out,
      OutputStream err,
      Value callback
    )  {
      // System.out.println("create start");
      WorkerContext.async(
        plugin,
        // (error, value) -> callback.executeVoid(WorkerContext.htmlLikeClone(error), value),
        (error, value) -> callback.executeVoid(error, value),
        () -> {
          // System.out.println("create callback");
          return new WorkerContext(file_to_load, plugin, onMessage, workerData, out, err);
        }
      );
    }

    // static public void createRealAsync(
    //   Plugin plugin,
    //   Object workerData,
    //   Consumer<Object> onMessage,
    //   String file_to_load,
    //   OutputStream out,
    //   OutputStream err,
    //   Value callback
    // )  {
    //   Thread thread = new Thread(() -> {
    //     try {
    //       new WorkerContext(file_to_load, plugin, onMessage, workerData, out, err);
    //     } catch (Exception error) {}
    //   });
    //   thread.start();
    // }

    @FunctionalInterface
    public interface CompletelyGenericFunction {
        Object apply(Object... args);

        default Runnable asRunnable() {
          return () -> {
            this.apply();
          };
        }
    }

    static public Context createContext(ExposedContext exposed_context) {
      return createContext(exposed_context, System.out);
    }
    static public Context createContext(ExposedContext exposed_context, OutputStream out) {
      return createContext(exposed_context, out, System.err);
    }
    static public Context createContext(ExposedContext exposed_context, OutputStream out, OutputStream err) {
      Engine engine = Engine.newBuilder().build();

      Context context = Context.newBuilder("js")
        .allowAllAccess(true)
        .allowHostAccess(true)
        .engine(engine)
        .option("js.ecmascript-version", "2020")
        // .option("js.experimental-foreign-object-prototype", "true")
        // .option("inspect", "8228")
        // .option("inspect.Path", "session")
        // .option("engine.inspect.Remote", "true")
        .option("js.polyglot-builtin", "true")
        .option("js.nashorn-compat", "false")
        .option("js.print", "false")
        .option("js.java-package-globals", "false")
        .option("js.graal-builtin", "false")
        .out(out)
        .err(err)
        .build();

      Reflections reflections = WorkerContext.reflections;
      context.getPolyglotBindings().putMember("reflections", reflections);
      context.getPolyglotBindings().putMember("cwd", System.getProperty("user.dir"));
      // context.getPolyglotBindings().putMember("cwd", this.getDataFolder().getAbsolutePath());

      return context;
    }

    public static class AsyncOutputStream extends OutputStream {
      private Plugin plugin = null;
      private ConcurrentLinkedQueue<byte[]> buffer = new ConcurrentLinkedQueue<byte[]>();
      private OutputStream destination = null;
      private BukkitTask task = null;

      // TODO Move the use of this object to the websocket thread
      // .... When we have an executor, redirect the output of this to something else.
      public AsyncOutputStream(Plugin plugin, OutputStream destination) {
        this.plugin = plugin;
        this.destination = destination;
      }

      private void schedule() {
        if (this.task == null) {
          this.task = this.plugin.getServer().getScheduler().runTask(plugin, () -> {
            this.task = null;

            try {
              byte[] b = this.buffer.poll();
              while (b != null) {
                this.destination.write(b);
                b = this.buffer.poll();
              }
            } catch (Exception error) {
              error.printStackTrace();
            }
          });
        }
      }

      public void write(byte[] b, int off, int len) throws java.io.IOException {
        byte[] bytes = Arrays.copyOfRange(b, off, len);
        this.write(bytes);
        // this.schedule();
      }

      public void write(byte[] b) throws java.io.IOException {
        this.buffer.add(b);
        this.schedule();
      }

      public void write(int b) throws java.io.IOException {
        throw new java.io.IOException("Is this really called?");

        // byte[] bytes = new byte[b];
        // this.buffer.add();
        // this.schedule();
      }
    }

    public WorkerContext(String file_to_load, Plugin plugin) throws Exception {
      this(file_to_load, plugin, null, null, System.out, System.err);
    }
    public WorkerContext(String file_to_load, Plugin plugin, Consumer<Object> onMessage, Object workerData, OutputStream out, OutputStream err) throws Exception {
      // System.out.println("out #2: " + String.valueOf(out));
      // System.out.println("err #2: " + String.valueOf(err));
      this.exposed_context = new WorkerContext.ExposedContext();
      this.plugin = plugin;
      this.onMessage = onMessage;
      try {
        Context context = WorkerContext.createContext(this.exposed_context, out, err);
        context.getPolyglotBindings().putMember("workerData", workerData);
        context.getPolyglotBindings().putMember("context", exposed_context);
        context.getPolyglotBindings().putMember("plugin", plugin);
        this.context = context;

        Value module_value_for_webpack = this.context.eval("js", "({ exports: {} })");
        this.context.getBindings("js").putMember("module", module_value_for_webpack);
        this.context.getBindings("js").putMember("exports", module_value_for_webpack.getMember("exports"));

        // NOTE Use this to move entry.js and PluginBridge.js inside the .jar
        // Reader stream = new InputStreamReader(this.getResource("boot.js"));
        // Source source = Source.newBuilder("js", stream, "boot.js").build();
        File file = new File(Unchained.self.getDataFolder(), "dist/entry.js");
        Source source = Source.newBuilder("js", file).build();
        context.eval(source);

        Value require_fn = this.context.eval("js", "module.exports");
        this.exports = require_fn.execute(file_to_load);
      } catch (Exception error) {
        this.close();
        error.printStackTrace();
        throw error;
      }
    }

    public Value getExports() {
      return this.exports;
    }

    public Context getContext() {
      return this.context;
    }

    public void postMessage(Object message) throws Exception {
      if (this.exposed_context.listener == null) {
        throw new Exception("No listener set up for this context");
      }
      this.exposed_context.listener.accept(message);
    }

    public Value eval(String source) {
      return this.context.eval("js", source);
    }

    public void reset() {
      try {
        this.postMessage("close");
      } catch  (Exception error) {
        error.printStackTrace();
      }
      try {
        this.exposed_context.closeAll();
      } catch (Exception error) {
        error.printStackTrace();
      }
    }

    public void close() {
      try {
        this.postMessage("close");
      } catch  (Exception error) {
        error.printStackTrace();
      }

      try {
        this.exposed_context.closeAll();
      } catch (Exception error) {
        error.printStackTrace();
      }

      try {
        this.context.close(true);
      } catch (Exception error) {
        error.printStackTrace();
      }
    }
}
