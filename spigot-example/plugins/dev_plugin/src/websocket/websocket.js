let { ref, wrap_java_function } = require('worker_threads');

let plugin = process.binding('plugin');

let InetSocketAddress = Java.type('java.net.InetSocketAddress');
let WeakHashMap = Java.type('java.util.WeakHashMap');

// let WebSocket = Java_type('org.java_websocket.WebSocket');
// let ClientHandshake = Java_type('org.java_websocket.handshake.ClientHandshake');
let JS_WebSocketServer = Java_type('eu.dral.unchained.JS_WebSocketServer');

// let StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
// let JavaString = Java.type("java.lang.String");
// class JavaBuffer {
//   constructor(java_bytes) {
//     this.java_bytes = java_bytes;
//   }
//
//   toString() {
//     return new JavaString(this.java_bytes, StandardCharsets.UTF_8);
//   }
// }

let { EventEmitter } = require('events');
class Server extends EventEmitter {
  constructor({ port }) {
    super();

    let address = new InetSocketAddress("localhost", port);
    let java_to_js_socket = new WeakHashMap();

    let SimpleServer = {
      onOpen: ((native_websocket, handshake) => {
        let js_websocket = new WebSocket(native_websocket);
        java_to_js_socket.put(native_websocket, js_websocket);
        this.emit('connection', js_websocket);
      }),
      onClose: ((native_websocket, code, reason, remote) => {
        let js_websocket = java_to_js_socket.get(native_websocket);
        js_websocket.emit('close', { code, reason, remote });
      }),
      onMessage: ((native_websocket, message) => {
        let js_websocket = java_to_js_socket.get(native_websocket);
        js_websocket.emit('message', JSON.parse(message));
      }),
      onError: ((native_websocket, error) => {
        if (native_websocket) {
          let js_websocket = java_to_js_socket.get(native_websocket);
          js_websocket.emit('error', error);
        } else {
          this.emit('error', error);
        }
      }),
      onStart: (() => {
        this.emit('listening');
      }),
    };
    let server = new JS_WebSocketServer(plugin, SimpleServer, address);

    ref(server);
    this._server = server;
    server.start();

  }
}

class WebSocket extends EventEmitter {
  constructor(native) {
    super();
    this.native = native;
  }

  send(object) {
    this.native.send(JSON.stringify(object));
  }
}
WebSocket.Server = Server;

module.exports = WebSocket;
