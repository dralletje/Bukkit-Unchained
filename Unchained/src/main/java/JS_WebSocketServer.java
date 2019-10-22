package eu.dral.unchained;

import java.net.InetSocketAddress;
import java.nio.ByteBuffer;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import org.bukkit.plugin.Plugin;
import org.graalvm.polyglot.Value;

public class JS_WebSocketServer extends WebSocketServer {
  private Plugin plugin;
  private Value websocketserver;

	public JS_WebSocketServer(Plugin plugin, Value websocketserver, InetSocketAddress address) {
		super(address);
    this.plugin = plugin;
    this.websocketserver = websocketserver;
	}

  private void runBukkit(Runnable task) {
    if (this.plugin.getServer().isPrimaryThread()) {
      System.out.println("[JavaWebsocket] Running on primary thread!");
      task.run();
    } else {
      this.plugin.getServer().getScheduler().runTask(this.plugin, task);
    }
  }

	@Override
	public void onOpen(WebSocket conn, ClientHandshake handshake) {
    this.runBukkit(() -> {
      this.websocketserver.getMember("onOpen").execute(conn, handshake);
    });
	}

	@Override
	public void onClose(WebSocket conn, int code, String reason, boolean remote) {
    System.out.println("Closing websockets!");
    try {
      this.runBukkit(() -> {
        this.websocketserver.getMember("onClose").execute(conn, code, reason, remote);
      });
    } catch (Exception error) {}
  }

	@Override
	public void onMessage(WebSocket conn, String message) {
    this.runBukkit(() -> {
      this.websocketserver.getMember("onMessage").execute(conn, message);
    });
	}

	@Override
	public void onMessage( WebSocket conn, ByteBuffer message ) {
    this.runBukkit(() -> {
      this.websocketserver.getMember("onMessage").execute(conn, message);
    });
	}

	@Override
	public void onError(WebSocket conn, Exception ex) {
    this.runBukkit(() -> {
      this.websocketserver.getMember("onError").execute(conn, ex);
    });
	}

	@Override
	public void onStart() {
    this.runBukkit(() -> {
		   System.out.println("server started successfully");
    });
	}
}
