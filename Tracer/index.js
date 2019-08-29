const WebSocket = require('ws');
let chalk = require('chalk');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (client_ws) => {
  const server_ws = new WebSocket('ws://127.0.0.1:8228/session');

  let custom_id_counter = 10000;

  let from_client_buffer = [];
  let server_ws_open = false;
  server_ws.on('open', () => {
    console.log('Open!');
    server_ws_open = true;
    console.log(`from_client_buffer.length:`, from_client_buffer.length)
    for (let client_message of from_client_buffer) {
      server_ws.send(client_message);
    }
  })

  let wait_for_response = (waiting_for_id) => {
    return new Promise((resolve) => {
      server_ws.on('message', (message) => {
        if (message.id === waiting_for_id) {
          resolve(message);
        }
      });
    })
  }

  server_ws.on('message', (message) => {
    let message_parsed = JSON.parse(message);
    console.log(chalk.red('from_server'), message_parsed);
    if (message_parsed.error && message_parsed.error.code === -32601) {
      return;
    }
    client_ws.send(message)
  });

  let client_send_or_buffer = (message) => {
    if (server_ws_open) {
      server_ws.send(message);
    } else {
      from_client_buffer.push(message);
    }
  }
  client_ws.on('message', async (message) => {
    try {
      let json_message = JSON.parse(message);
      console.log(chalk.blue('from_client'), json_message);

      if (json_message.method === 'Runtime.getHeapUsage') {
        return;
      }

      // if (json_message.method === 'Runtime.evaluate') {
      //   // console.log('Runtime.evaluate');
      //   // let { expression, contextId, throwOnSideEffect } = json_message.params
      //   //
      //   // console.log(`expression:`, expression);
      //   // console.log(`contextId:`, contextId);
      //   // console.log(`throwOnSideEffect:`, throwOnSideEffect);
      //   // client_send_or_buffer(JSON.stringify({
      //   //
      //   // }))
      // } else
      if (json_message.method === 'Runtime.compileScript') {
        console.log(`json_message.id:`, json_message.id)
        client_send_or_buffer(message);
        // client_send_or_buffer(JSON.stringify({ result: {}, id: json_message.id }));
      } else
      if (json_message.method === 'Debugger.evaluateOnCallFrame' || json_message.method === 'Runtime.evaluate') {
        console.log(`json_message:`, json_message);

        client_send_or_buffer(JSON.stringify({
          id: custom_id_counter++,
          method: 'Debugger.setBreakpointsActive',
          params: { active: true }
        }));

        let set_breakpoint_url_id = custom_id_counter++;
        client_send_or_buffer(JSON.stringify({
          id: set_breakpoint_url_id,
          method: 'Debugger.setBreakpointByUrl',
          params: {
            lineNumber: 2,
            urlRegex: '/Users/michiel/Projects/Minecraft/spigot\\-example/plugins/Unchained/debugger_loop\\.js|file:///Users/michiel/Projects/Minecraft/spigot\\-example/plugins/Unchained/debugger_loop\\.js',
            columnNumber: 0,
            condition: ''
          }
        }));

        let response = await wait_for_response(set_breakpoint_url_id);

        console.log(`response:`, response)
        client_send_or_buffer(JSON.stringify(json_message));

      // } else if (json_message.method === 'Debugger.paused') {
      //   let { reason, hitBreakpoints } = json_message.params;
      //   console.log(`hitBreakpoints:`, hitBreakpoints)
      } else {
        client_send_or_buffer(message);
      }
    } catch (err) {
      console.log(`chalk.red(err.stack):`, chalk.red(err.stack))
    }
  });

  client_ws.on('close', () => {
    console.log(chalk.green('Client close'))
    server_ws.close();
  });
  server_ws.on('close', () => {
    console.log(chalk.green('Server close'))
    client_ws.close();
  });

  client_ws.on('error', (error) => {
    console.log(`client_ws error:`, error);
  })
  server_ws.on('error', (error) => {
    console.log(`server_ws error:`, error);
  })
});
