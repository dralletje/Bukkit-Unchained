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

	@Override
	public void onOpen(WebSocket conn, ClientHandshake handshake) {
    this.plugin.getServer().getScheduler().runTask(this.plugin, () -> {
      this.websocketserver.getMember("onOpen").execute(conn, handshake);
    });
	}

	@Override
	public void onClose(WebSocket conn, int code, String reason, boolean remote) {
    this.plugin.getServer().getScheduler().runTask(this.plugin, () -> {
      this.websocketserver.getMember("onClose").execute(conn, code, reason, remote);
    });
  }

	@Override
	public void onMessage(WebSocket conn, String message) {
    this.plugin.getServer().getScheduler().runTask(this.plugin, () -> {
      this.websocketserver.getMember("onMessage").execute(conn, message);
    });
	}

	@Override
	public void onMessage( WebSocket conn, ByteBuffer message ) {
    this.plugin.getServer().getScheduler().runTask(this.plugin, () -> {
      this.websocketserver.getMember("onMessage").execute(conn, message);
    });
	}

	@Override
	public void onError(WebSocket conn, Exception ex) {
    this.plugin.getServer().getScheduler().runTask(this.plugin, () -> {
      this.websocketserver.getMember("onError").execute(conn, ex);
    });
	}

	@Override
	public void onStart() {
    this.plugin.getServer().getScheduler().runTask(this.plugin, () -> {
		    System.out.println("server started successfully");
    });
	}
}
