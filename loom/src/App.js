import React from "react";
import logo from "./logo.svg";
import "./App.css";
import JsonTree from "react-json-tree";

function App() {
  let [code, set_code] = React.useState("");
  let [last_result, set_last_result] = React.useState();

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
      <div
        style={{
          padding: 30,
          borderRadius: 5,
          backgroundColor: "rgba(0,0,0,.3)",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <textarea
          style={{
            fontSize: 18,
            color: "white",
            backgroundColor: "transparent",
            border: "none",
            fontFamily: '"Operator Mono"',
            borderRadius: 3,
            width: "50vw",
            height: "50vh"
          }}
          value={code}
          onChange={e => set_code(e.target.value)}
        />
        <button
          style={{ fontSize: 18 }}
          onClick={async () => {
            try {
              let response = await fetch("http://localhost:8001", {
                method: "post",
                body: JSON.stringify({
                  script: code
                })
              });
              let json = await response.json();
              set_last_result(json);
            } catch (err) {
              console.log(`err:`, err);
            }
          }}
        >
          Run
        </button>

        <div>
          {last_result && last_result.result && (
            <JsonTree data={last_result.result} />
          )}
          {last_result && last_result.stack && <pre>{last_result.stack}</pre>}
        </div>
      </div>
    </div>
  );
}

export default App;
