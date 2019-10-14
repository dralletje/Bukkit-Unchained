let express = require('express');
let cors = require('cors');
let fetch = require('node-fetch');

let { compile } = require('./compile.js');

let app = express();

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
