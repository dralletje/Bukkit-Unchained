let express = require("express");
let cors = require("cors");
let WebSocket = require("ws");
let {MongoClient} = require("mongodb");

let { compile } = require("./compile.js");

let url = "mongodb://localhost:32768/database";

let get_bukkit_socket = (client_socket, session_id) => {
  return new Promise((resolve, reject) => {
    let bukkit_websocket = new WebSocket("ws://localhost:8000");

    bukkit_websocket.on('open', () => {
      bukkit_websocket.send(JSON.stringify({ type: 'open', session_id: session_id }))
    });

    bukkit_websocket.on("close", async () => {
      try {
        console.log(`Trying to close client websocket`);
        client_socket.conn.close();
        reject(new Error('Bukkit socket closed'));
      } catch (err) {
        console.log(`err:`, err);
      }
    });

    bukkit_websocket.on("error", error => {
      console.log(`bukkit socket rror:`, error);
      client_socket.conn.close();
    });

    bukkit_websocket.isAlive = true;
    bukkit_websocket.on("pong", () => {
      bukkit_websocket.isAlive = true;
    });
    const ping_interval = setInterval(() => {
      if (bukkit_websocket.isAlive === false) {
        clearInterval(ping_interval);
        bukkit_websocket.terminate();
        return;
      }

      bukkit_websocket.isAlive = false;
      bukkit_websocket.ping(() => {});
    }, 5 * 1000);

    let the_chamber_of_secrets_has_been_opened = false;
    bukkit_websocket.on("message", async _message => {
      if (the_chamber_of_secrets_has_been_opened) {
        return;
      }

      let message = JSON.parse(_message) || {};

      if (typeof message.type !== "string") {
        // prettier-ignore
        reject(new Error("First message.type isn't even a string.. something is off here!"));
      }

      if (message.type === "open") {
        the_chamber_of_secrets_has_been_opened = true;
        resolve(bukkit_websocket);
        return;
      } else {
        // prettier-ignore
        return reject(new Error(`First message type should be 'open', got ${_message}`));
      }
    });
  });
};

let main = async () => {
  let client = new MongoClient(url, { useUnifiedTopology: true });
  await client.connect();
  let db = client.db("Unchained");
  let plots = db.collection("plots");

  let app = express();

  let http = require("http").createServer(app);
  let io = require("socket.io")(http);

  io.on("connection", async client_websocket => {
    console.log('Connection!');
    try {
      console.log('Connection!');
      let session_id = client_websocket.handshake.query.session_id;
      let plot = await plots.findOne({ password: session_id });
      let bukkit_websocket = await get_bukkit_socket(client_websocket, session_id);

      // ;(async () => {
      //   await client.
      // })

      client_websocket.emit("verified");

      bukkit_websocket.on("message", async _message => {
        let message = JSON.parse(_message);
        if (message.type === "log") {
          client_websocket.emit("log", message);
          return;
        }
        if (message.type === "execution_error") {
          client_websocket.emit("execution_error", message);
        }
        console.log(`message:`, message);
      });

      client_websocket.on("files", async (message, onFullfill) => {
        try {
          await plots.update({ _id: plot._id }, {
            $set: { files: message.files },
          })

          let compiled_code = await compile({
            entry_file: `index.js`,
            files: message.files
          });
          bukkit_websocket.send(
            JSON.stringify({
              type: "script",
              script: compiled_code
            })
          );
          onFullfill(null, { success: true });
        } catch (error) {
          onFullfill({ message: error.message, stack: error.stack }, null);
        }
      });
    } catch (error) {
      console.log("Websocket error:", error);
      client_websocket.emit("error", error);
    }
  });

  app.use(cors());

  // app.post('*', express.json(), async (request, response) => {
  //   let { files, key } = request.body;
  //
  //   try {
  //     // Incremental compilation?
  //     let compiled_code = await compile({
  //       entry_file: `index.js`,
  //       files: files,
  //     })
  //
  //     let executed_response = await fetch('http://localhost:8001', {
  //       method: 'post',
  //       body: JSON.stringify({
  //         key: key,
  //         script: compiled_code,
  //       }),
  //     });
  //     let json = await executed_response.json();
  //
  //     if (json.error) {
  //       response.send({
  //         success: false,
  //         ...json,
  //       })
  //     } else {
  //       response.send({
  //         success: true,
  //         ...json,
  //       })
  //     }
  //   } catch (error) {
  //     console.log(`error:`, error);
  //     response.send({
  //       success: false,
  //       error: { message: error.message,
  //       stack: error.stack, }
  //     });
  //   }
  // })

  http.listen(8080, () => {
    console.log("Listening on port 8080");
  });
};

main();
