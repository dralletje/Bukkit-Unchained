let std_stream = () => {
  return {
    write: () => {},
    isTTY: false,
  }
}

module.exports = {
  versions: {
    node: '12.3.0',
  },
  umask: () => 0x777,
  browser: true,
  version: 'v10.8.0',
  platform: "darwin",
  env: {
    true: false,
  },
  cwd: () => Polyglot.import("cwd"),
  nextTick: setImmediate,
  // TODO Remove this? See where it being used?
  binding: (name) => {
    return Polyglot.import(name);
  },

  // Make these proper streams? Not yet found any place where it's needed though.
  stderr: std_stream(),
  stdout: std_stream(),
}
