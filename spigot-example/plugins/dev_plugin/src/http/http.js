let { ref } = require('worker_threads');

let parse_input_json = exchange => {
  let Collectors = Java.type("java.util.stream.Collectors");
  let BufferedReader = Java.type("java.io.BufferedReader");
  let InputStreamReader = Java.type("java.io.InputStreamReader");
  let result = new BufferedReader(
    new InputStreamReader(exchange.getRequestBody())
  )
    .lines()
    .collect(Collectors.joining("\n"));
  return JSON.parse(result);
};

let send_response = (exchange, response) => {
  let outputstream = exchange.getResponseBody();
  var json = JSON.stringify(response);

  let getBytesMethod = Java.type("java.lang.String").class.getDeclaredMethod(
    "getBytes"
  );
  let bytes = getBytesMethod.invoke(json);

  exchange.sendResponseHeaders(200, bytes.length);
  outputstream.write(bytes);
  outputstream.close();
};

let create_http_server = (port, handler_fn) => {
  let HttpServer = Java.type("com.sun.net.httpserver.HttpServer");
  let InetSocketAddress = Java.type("java.net.InetSocketAddress");
  let HttpHandler = Java.type("com.sun.net.httpserver.HttpHandler");

  let JavascriptHttpHandler = Java.extend(HttpHandler, {
    handle: exchange => {
      handler_fn(exchange);
    }
  });

  let server = HttpServer.create(new InetSocketAddress(port), 0);
  server.createContext("/", new JavascriptHttpHandler());
  server.setExecutor(null); // creates a default executor
  server.start();

  ref(server);

  return server;
};


let http_server = create_http_server(8001, async exchange => {
  try {
    let body = parse_input_json(exchange);

    let plot = plots.findOne({ password: body.key });

    if (plot == null) {
      throw new Error(`Plot for key not found`);
    }

    let headers = exchange.getResponseHeaders();
    headers.add("Access-Control-Allow-Origin", "*");
    headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization");

    plots.updateOne(
      { plot_id: plot.plot_id },
      {
        $set: {
          script: body.script
        }
      }
    );

    let result = await refresh_plot(plot.plot_id);

    if (result && result.type === 'error') {
      send_response(exchange, {
        error: {
          message: result.message,
          stack: result.stack,
        },
      });
    } else {
      // send_response(exchange, { result: make_value_plain(new_module.exports) })
      send_response(exchange, { result: {} });
    }
  } catch (err) {
    console.error(`Error in http response:`, err);
    send_response(exchange, {
      error: { message: err.message, stack: err.stack }
    });
  }
});
