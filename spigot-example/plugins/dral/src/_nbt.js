let { chat } = require("./chat.js");
let _ = require("lodash");

let unpack_nbt = (data) => {
  if (data == null) return null;
  let { type, value } = data;
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value;
  }
  if (type === "compound") {
    return _.mapValues(value, unpack_nbt);
  }
  if (type === "list") {
    return value.value.map((x) => unpack_nbt({ type: value.type, value: x }));
  }
  throw new Error(`Type = ${type}`);
};

let nbt = {
  root: (obj) => ({ type: "compound", name: "", value: obj }),
  compound: (obj) => ({ type: "compound", value: obj }),
  string: (value) => ({ type: "string", value }),
  integer: (value) => ({ type: "int", value }),
  long: (value) => ({ type: "long", value }),
  boolean: (value) => ({ type: "boolean", value }),
  list: (container, value) => ({
    type: "list",
    value: container(value),
  }),
  chat: (...args) => nbt.string(JSON.stringify(chat(...args))),
};

module.exports = { unpack_nbt, nbt };
