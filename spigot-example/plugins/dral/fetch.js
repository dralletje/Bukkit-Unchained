let { parentPort, workerData } = require("worker_threads");

let URL = Java.type("java.net.URL");

let parse_input_json = body => {
  let Collectors = Java.type("java.util.stream.Collectors");
  let BufferedReader = Java.type("java.io.BufferedReader");
  let InputStreamReader = Java.type("java.io.InputStreamReader");
  let result = new BufferedReader(new InputStreamReader(body))
    .lines()
    .collect(Collectors.joining("\n"));
  return result;
};

let { url, method = "GET", headers = {} } = workerData;

let con = new URL(url).openConnection();
con.setRequestMethod(method);
for (let [key, value] of Object.entries(headers)) {
  con.setRequestProperty(key, value);
}
con.setDoOutput(true);

// let out = new DataOutputStream(con.getOutputStream());
// out.writeBytes(ParameterStringBuilder.getParamsString(parameters));
// out.flush();
// out.close();

let result = parse_input_json(con.getInputStream());
parentPort.postMessage({
  type: 'result_text',
  result: result,
});
