let { ref } = require('worker_threads');

let InetSocketAddress = Java.type('java.net.InetSocketAddress');
// let WebSocket = Java_type('org.java_websocket.WebSocket');
// let ClientHandshake = Java_type('org.java_websocket.handshake.ClientHandshake');
let WebSocketServer = Java_type('org.java_websocket.server.WebSocketServer');

let StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
let JavaString = Java.type("java.lang.String");
class JavaBuffer {
  constructor(java_bytes) {
    this.java_bytes = java_bytes;
  }

  toString() {
    return new JavaString(this.java_bytes, StandardCharsets.UTF_8);
  }
}

console.log('Started worker');

console.log('#1');

let SimpleServer = Java.extend(WebSocketServer, {
  onOpen: (websocket, handshake) => {
    websocket.send("Welcome to the server!"); //This method sends a message to the new client
    // broadcast( "new connection: " + handshake.getResourceDescriptor() ); //This method sends a message to all clients connected
    console.log("new connection to " + websocket.getRemoteSocketAddress());
  },
  onClose: (websocket, code, reason, remote) => {
    console.log("closed " + websocket.getRemoteSocketAddress() + " with exit code " + code + " additional info: " + reason);
  },
  onMessage: (websocket, message) => {
    console.log("received message from "	+ websocket.getRemoteSocketAddress() + ": " + message);
  },
  onError: (websocket, error) => {
    if (websocket) {
      console.error("an error occured on connection " + websocket.getRemoteSocketAddress()  + ":" + error);
    } else {
      console.log(`error:`, error)
    }
  },
  onStart: () => {
    console.log("server started successfully");
  }
});

let address = new InetSocketAddress("localhost", 8004);
let server = new SimpleServer(address);
ref(server);

console.log('#2');
server.start();
console.log('#3');
