package eu.dral.unchained;

public class AutoCloseables {
  static private AutoCloseable autocloseable(Runnable runnable) {
    return new AutoCloseable() {
      public void close() {
        try {
          runnable.run();
        } catch (Exception error) {}
      }
    };
  }

  static public AutoCloseable forValue(org.bukkit.scheduler.BukkitTask task) {
    return AutoCloseables.autocloseable(() -> {
      task.cancel();
    });
  }

  static public AutoCloseable forValue(com.sun.net.httpserver.HttpServer http_server) {
    return AutoCloseables.autocloseable(() -> {
      http_server.stop(0);
    });
  }

  static public AutoCloseable forValue(org.java_websocket.server.WebSocketServer server) {
    return AutoCloseables.autocloseable(() -> {
      try {
        server.stop(0);
      } catch (Exception error) {}
    });
  }

  static public AutoCloseable forValue(org.bukkit.event.Listener listener) {
    return AutoCloseables.autocloseable(() -> {
      org.bukkit.event.HandlerList.unregisterAll(listener);
    });
  }

  static public AutoCloseable forValue(com.comphenix.protocol.events.PacketAdapter packet_adapter) {
    return AutoCloseables.autocloseable(() -> {
      com.comphenix.protocol.ProtocolLibrary.getProtocolManager().removePacketListener(packet_adapter);
    });
  }
}
