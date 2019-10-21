import React from "react";
import JsonTree from "react-json-tree";

import "./App.css";
import { Codeblock } from "./Code.js";
import { Flex, SubtleButton } from "./Elements.js";
import { Router, Link } from "@reach/router"


let WindowEvent = ({ event_name, handler }) => {
  let current_handler = React.useRef(handler);

  React.useEffect(() => {
    let listener = event => {
      current_handler.current(event);
    };
    window.addEventListener(event_name, listener);
    return () => {
      window.removeEventListener(event_name, listener);
    };
  }, [event_name]);

  React.useEffect(() => {
    current_handler.current = handler;
  }, [handler]);

  return null;
};

let useAction = () => {
  let [loading, set_loading] = React.useState(false);
  let [result, set_result] = React.useState(null);
  let [error, set_error] = React.useState(null);

  let do_action = async action => {
    set_loading(true);
    try {
      let result = await action();
      console.log(`result:`, result)
      set_loading(false);
      set_error(null);
      set_result(result);
    } catch (err) {
      set_loading(false);
      set_error(err);
      set_result(null);
    }
  };

  return [do_action, { result, loading, error }];
};

let scoped_storage = key => {
  return {
    set: value => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    get: () => {
      try {
        return JSON.parse(localStorage.getItem(key) || "null");
      } catch (error) {
        localStorage.removeItem(key);
        throw error;
      }
    }
  };
};

let FileTab = ({ name, onChangeName, isActive, onClick, onRemove }) => {
  let [is_updating_name, set_is_updating_name] = React.useState(false);
  let [updated_name, set_updated_name] = React.useState(name);

  if (is_updating_name) {
    return (
      <input
        type="text"
        style={{
          padding: 16,
          color: 'white',
          backgroundColor: 'transparent',
          fontSize: 'inherit',
          border: 'none',
        }}
        spellCheck={false}
        autoFocus
        onBlur={() => {
          set_is_updating_name(false);
          set_updated_name("");
        }}
        onKeyDown={event => {
          if (event.key === "Enter") {
            set_is_updating_name(false);
            onChangeName(updated_name);
          }
        }}
        value={updated_name}
        onChange={e => set_updated_name(e.target.value)}
      />
    );
  } else {
    return (
      <SubtleButton
        style={{ padding: 16, color: isActive ? "white" : undefined }}
        onClick={isActive ? null : onClick}
        onDoubleClick={
          isActive
            ? event => {
                event.preventDefault();
                set_updated_name(name);
                set_is_updating_name(true);
              }
            : null
        }
      >
        {name}
        <div style={{ width: 10 }} />
        <div className="show-on-button-hover" onClick={() => {
          if (window.confirm('You want to REMOVE this file??')) {
            onRemove()
          }
        }}>x</div>
      </SubtleButton>
    );
  }
};

let FilesEditor = ({ value: files, onChange }) => {
  let files_array = Object.entries(files).filter(([key, value]) => value != null);
  let [current_file, set_current_file] = React.useState(
    files["index.js"] ? "index.js" : files_array[0][0]
  );

  current_file = files[current_file] ? current_file : files_array[0][0];

  return (
    <Flex column style={{ overflow: 'hidden', flex: 1 }}>
      <Flex row style={{ color: "white" }}>
        {files_array.map(([name, content]) => (
          <FileTab
            key={name}
            name={name}
            isActive={name === current_file}
            onClick={() => {
              set_current_file(name);
            }}
            onChangeName={new_name => {
              onChange({
                ...files,
                [name]: null,
                [new_name]: content
              });
              set_current_file(new_name);
            }}
            onRemove={() => {
              onChange({
                ...files,
                [name]: null,
              });
            }}
          />
        ))}
        <SubtleButton
          style={{ padding: 16 }}
          onClick={() => {
            onChange({
              ...files,
              "new_file.js": "// A whole new woooooorld"
            });
            set_current_file("new_file.js");
          }}
        >
          +
        </SubtleButton>
      </Flex>
      <Flex style={{ padding: 16, paddingTop: 0, overflow: 'scroll', flex: 1 }}>
        {files[current_file] != null ?
          <Codeblock
          editting={true}
          value={files[current_file]}
          onChange={value => {
            onChange({
              ...files,
              [current_file]: value
            });
          }}
        /> : <div></div>}
      </Flex>
    </Flex>
  );
};

function Editor({ session_id, files, set_files, log }) {
  let [do_action, { loading, result, error }] = useAction();

  let execute_code = async () => {
    do_action(async () => {
      let response = await fetch("http://localhost:8080", {
        method: "post",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          key: session_id,
          files: files
        })
      });
      let json = await response.json();
      console.log(`json:`, json)
      return json;
    });
  };

  return (
    <div
      style={{
        width: "100vw",
        backgroundColor: `#282c34`,
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <WindowEvent
        event_name="keydown"
        handler={event => {
          if (event.metaKey === true && event.key === "s") {
            event.preventDefault();
            execute_code();
          }
        }}
      />
      <Flex
        row
        style={{
          borderRadius: 5,
          backgroundColor: "rgba(0,0,0,.3)",
          height: "80vh",
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "60vw"
          }}
        >
          <FilesEditor value={files} onChange={set_files} />
        </div>

        <div
          style={{
            width: "30vw",
            overflow: "hidden",
            backgroundColor: "rgb(0, 43, 54)",
            position: 'relative',
          }}
        >
          {loading &&
            <Flex column style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center' }}>
              <div style={{ fontSize: 24, padding: 30, color: 'white' }}>Loading...</div>
            </Flex>
          }
          <div
            style={{
              overflow: "scroll",
              height: "100%",
              paddingTop: 20,
              paddingLeft: 20,
              paddingBottom: 20,
              filter: loading ? `blur(20px)` : ``,
            }}
          >
            {result && result.result && (
              <React.Fragment>
                <div style={{ color: "rgb(38, 139, 210)", fontWeight: "bold" }}>
                  Result:
                </div>
                <JsonTree
                  style={{ backgroundColor: "transparent" }}
                  hideRoot
                  data={result.result}
                />
              </React.Fragment>
            )}
            {result && result.error && (
              <div style={{ color: "rgb(210, 38, 38)" }}>
                <div style={{ color: "rgb(210, 38, 38)", fontWeight: "bold" }}>Got an error:</div>
                <div style={{ fontWeight: 'bold' }}>{result.error.message}</div>
                <pre style={{ color: 'white', width: '100%', overflow: 'scroll' }}>{result.error.stack}</pre>
              </div>
            )}

            {log.map(message =>
                <pre style={{ color: 'white', fontSize: 16, fontFamily: '"Operator Mono"' }}>
                  {message.body}
                </pre>
            )}
          </div>
        </div>
      </Flex>
    </div>
  );
}

let colors = {
  '0': '#000000',
  '1': '#0000AA',
  '2': '#00AA00',
  '3': '#00AAAA',
  '4': '#AA0000',
  '5': '#AA00AA',
  '6': '#FFAA00',
  '7': '#AAAAAA',
  '8': '#555555',
  '9': '#5555FF',
  'a': '#55FF55',
  'b': '#55FFFF',
  'c': '#FF5555',
  'd': '#FF55FF',
  'e': '#FFFF55',
  'f': '#FFFFFF',
}
let colorize = (x) => {
  let match = x.match(/([^§]*)§([0-9a-fA-F])((?:.|\n)*)/);
  if (match == null) {
    return x;
  }

  let [_, before, color, after] = match;
  return [<span key="before">{before}</span>, <span style={{ color: colors[color] }} key="after">{colorize(after)}</span>]
}

let files_storage = scoped_storage("files");
let LoadEditor = ({ session_id, ...props }) => {
  let [is_connecting, set_is_connecting] = React.useState(true);
  let websocket_ref = React.useRef();

  let [files, set_files] = React.useState(
    files_storage.get() || { "index.js": `` }
  );

  let [log, set_log] = React.useState([]);

  React.useEffect(() => {
    set_is_connecting(true);
    let websocket = new WebSocket('ws://localhost:8080');
    websocket_ref.current = websocket;
    websocket.addEventListener('error', error => {
      console.log(`error:`, error);
    });
    websocket.addEventListener('open', () => {
      console.log('Open');
      websocket.send(JSON.stringify({ type: 'open', session_id: session_id }));
      console.log('Send');
    })
    websocket.addEventListener('message', _message => {
      let message = JSON.parse(_message.data);
      if (message.type === 'open') {
        set_is_connecting(false);
      }
      if (message.type === 'log') {
        set_log((existing_log) => [
          ...existing_log,
          {
            level: message.level,
            body: colorize(message.body),
          },
        ])
      }
      // websocket.send(JSON.stringify({ type: 'open',   }));
    })
  }, []);

  console.log(`log:`, log)

  React.useEffect(() => {
    if (is_connecting === false) {
      websocket_ref.current.send(JSON.stringify({
        files: files,
        type: 'files',
      }));
    }
  }, [is_connecting, files]);

  React.useEffect(() => {
    files_storage.set(files);
  }, [files]);

  if (is_connecting) {
    return <div>Loading</div>;
  }

  return <Editor log={log} websocket={websocket_ref.current} session_id={session_id} files={files} set_files={set_files} />
}

let App = () => {
  return (
    <Router>
       <LoadEditor path="/editor/:session_id" />
    </Router>
  )
}

export default App;
