package eu.dral.unchained;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import org.graalvm.polyglot.Value;

public class Http {
    public static void start_server(int port, Value handler) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", new JavascriptHttpHandler(handler));
        server.setExecutor(null); // creates a default executor
        server.start();
    }

    static class JavascriptHttpHandler implements HttpHandler {
        Value handler = null;
        public JavascriptHttpHandler(Value handler) {
          if (!handler.canExecute()) {
            // throw
          }

          this.handler = handler;
        }

        @Override
        public void handle(HttpExchange http_exchange) throws IOException {
            this.handler.executeVoid(http_exchange);
            // String response = "This is the response";
            // t.sendResponseHeaders(200, response.length());
            // OutputStream os = t.getResponseBody();
            // os.write(response.getBytes());
            // os.close();
        }
    }

}
