let express = require('express');
let cors = require('cors');

let { compile } = require('./compile.js');

let app = express();

var http = require('http').createServer(app);
var io = require('socket.io')(http);
let WebSocket = require('ws');

io.use((socket, next) => {
  let token = socket.handshake.query.token;
  console.log(`socket.handshake.query:`, socket.handshake.query)

  let bukkit_websocket = new WebSocket("ws://localhost:8000");
  socket.bukkit_websocket = bukkit_websocket;
  bukkit_websocket.on('open', () => {
    bukkit_websocket.send(JSON.stringify({ type: 'open', session_id: token }));
  });

  let the_chamber_of_secrets_has_been_opened = false;
  bukkit_websocket.on('message', async (_message) => {
    if (the_chamber_of_secrets_has_been_opened) {
      return;
    }

    let message = JSON.parse(_message);
    if (message.type === 'open') {
      the_chamber_of_secrets_has_been_opened = true;
      next();
      return
    } else {
      return next(new Error('authentication error'));
    }
  });

  bukkit_websocket.on('close', async () => {
    try {
      socket.disconnect(true);
    } catch (err) {
      console.log(`err:`, err)
    }
  });
});


io.on('connection', (client_websocket) => {
  console.log('Connection');
  let bukkit_websocket = client_websocket.bukkit_websocket;

  console.log('Open!');
  client_websocket.emit('verified');

  bukkit_websocket.on('message', async (_message) => {
    let message = JSON.parse(_message);
    if (message.type === 'log') {
      client_websocket.emit('log', message);
      return
    }
    if (message.type === 'execution_error') {
      client_websocket.emit('execution_error', message);
    }
    console.log(`message:`, message)
  });

  client_websocket.on('files', async (message, onFullfill) => {
    try {
      let compiled_code = await compile({
        entry_file: `index.js`,
        files: message.files,
      });
      bukkit_websocket.send(JSON.stringify({
        type: 'script',
        script: compiled_code,
      }));
      onFullfill(null, { success: true });
    } catch (error) {
      onFullfill({ message: error.message, stack: error.stack }, null);
    }
  });
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
  console.log('Listening on port 8080');
})
