let express = require('express');
let cors = require('cors');
let fetch = require('node-fetch');
let WebSocket = require('ws');

let { compile } = require('./compile.js');

let app = express();

var expressWs = require('express-ws')(app);

app.ws('/', function(client_websocket, req) {
  let bukkit_websocket = null

  let create_bukkit_socket = (open_message) => {
    bukkit_websocket = new WebSocket("ws://localhost:8000");

    bukkit_websocket.on('open', () => {
      bukkit_websocket.send(open_message);

      bukkit_websocket.on('message', async (_message) => {
        let message = JSON.parse(_message);
        if (message.type === 'open') {
          client_websocket.send(_message);
          return
        }
        if (message.type === 'log') {
          console.log(`message:`, message)
          console.log(`_message:`, _message)
          client_websocket.send(_message);
          return
        }
        console.log(`message:`, message)
      });
    });
  }

  client_websocket.on('message', async (_message) => {
    let message = JSON.parse(_message);

    if (bukkit_websocket == null) {
      if (message.type === 'open') {
        create_bukkit_socket(_message);
      } else {
        console.log(`Unknown message type '${message.type}'`);
      }
    }

    if (message.type === 'files') {
      let compiled_code = await compile({
        entry_file: `index.js`,
        files: message.files,
      });
      bukkit_websocket.send(JSON.stringify({
        type: 'script',
        script: compiled_code,
      }));
    }
  });
});

app.use(cors());
app.post('*', express.json(), async (request, response) => {
  let { files, key } = request.body;

  try {
    // Incremental compilation?
    let compiled_code = await compile({
      entry_file: `index.js`,
      files: files,
    })

    let executed_response = await fetch('http://localhost:8001', {
      method: 'post',
      body: JSON.stringify({
        key: key,
        script: compiled_code,
      }),
    });
    let json = await executed_response.json();

    if (json.error) {
      response.send({
        success: false,
        ...json,
      })
    } else {
      response.send({
        success: true,
        ...json,
      })
    }
  } catch (error) {
    console.log(`error:`, error);
    response.send({
      success: false,
      error: { message: error.message,
      stack: error.stack, }
    });
  }
})



app.listen(8080, () => {
  console.log('Listening on port 8080');
})
