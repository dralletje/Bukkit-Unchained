let path_module = require("path");

let File = Java.type("java.io.File");
let JavaString = Java.type("java.lang.String");

let StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
let NioFiles = Java.type("java.nio.file.Files");
let { get: path_from_string } = Java.type("java.nio.file.Paths");

// TODO I want to convert as much as possible to the newer `java.nio.file.Files` api
// https://docs.oracle.com/javase/7/docs/api/index.html?java/nio/file/Files.html

class JavaBuffer {
  constructor(java_bytes) {
    this.java_bytes = java_bytes;
  }

  toString() {
    return new JavaString(this.java_bytes, StandardCharsets.UTF_8);
  }
}

// TODO update to NioFiles
class Stats {
  constructor(java_file) {
    if (java_file.exists() === false) {
      throw new IOException(`File '${java_file}' does not exist`, "ENOENT");
    }
    this.java_file = java_file;
  }

  isDirectory() {
    return this.java_file.isDirectory();
  }
  isFile() {
    return this.java_file.isFile();
  }

  // TODO Need to check these, maybe?
  isBlockDevice() {
    return false;
  }
  isCharacterDevice() {
    return false;
  }
  isFIFO() {
    return false;
  }
  isSocket() {
    return false;
  }
  isSymbolicLink() {
    return (
      this.java_file.getAbsolutePath().toString() !==
      this.java_file.getCanonicalPath().toString()
    );
  }

  get dev() {
    return 2114;
  }
  get ino() {
    return 48064969;
  }
  get mode() {
    return 33188;
  }
  get nlink() {
    return 1;
  }
  get uid() {
    return 85;
  }
  get gid() {
    return 100;
  }
  get rdev() {
    return 0;
  }
  get size() {
    return 527;
  }
  get blksize() {
    return 4096;
  }
  get blocks() {
    return 8;
  }

  // https://stackoverflow.com/questions/2723838/determine-file-creation-date-in-java
  // BasicFileAttributes attr = Files.readAttributes(file, BasicFileAttributes.class);
  get atimeMs() {
    return this.java_file.lastModified();
  }
  get mtimeMs() {
    return this.java_file.lastModified();
  }
  get ctimeMs() {
    return this.java_file.lastModified();
  }
  get birthtimeMs() {
    return this.java_file.lastModified();
  }
  get atime() {
    return new Date(this.atimeMs);
  }
  get mtime() {
    return new Date(this.mtime);
  }
  get ctime() {
    return new Date(this.ctime);
  }
  get birthtime() {
    return new Date(this.birthtime);
  }
}

class IOException extends Error {
  constructor(message, code = null) {
    super(message);
    this.code = code;
  }
}

let callbackify = async_fn => {
  return async (...args) => {
    if (typeof args[args.length - 1] === "function") {
      let result = await async_fn(...args.slice(0, -1));
      args[args.length - 1](result);
    }
    await async_fn(...args);
  };
};

let cast_to_bytes = (value) => {
  if (typeof value === 'string') {
    let JavaString = Java.type('java.lang.String');
    let CharSet = Java.type('java.nio.charset.Charset');
    return JavaString.class.getDeclaredMethod('getBytes', CharSet.class).invoke(value, StandardCharsets.UTF_8)
  }
  if (value instanceof Buffer) {
    throw new Error('Alright alright I\'ll unity Buffer and byte[]')
  }
  if (value instanceof Java.type('byte[]')) {
    return value;
  }
  throw new Error("Unknown value type given to a place that expects bytes[] or a string");
}

let fs = (module.exports = {
  existsSync: path => {
    let file = new File(path_module.resolve(path));
    return file.exists();
  },

  readdir: (directory_path, options, callback) => {
    try {
      if (callback == null) {
        callback = options;
        options = {};
      }

      if (options.withFileTypes) {
        throw new Error(`No .withFileTypes just yet`);
      }

      let folder = new File(path_module.resolve(directory_path));

      if (!folder.exists()) {
        // prettier-ignore
        throw new IOException(`Path '${directory_path}' does not exist`, 'ENOENT');
      }

      if (!folder.isDirectory()) {
        // prettier-ignore
        throw new IOException(`Path '${directory_path}' is not a directory`, 'ENOTDIR');
      }

      let files = Java.from(folder.listFiles());
      let simple_filename = files.map(file => file.getName());

      callback(null, simple_filename);
    } catch (err) {
      callback(err, null);
    }
  },
  lstat: (path, callback) => {
    try {
      let file = new File(path_module.resolve(path));
      let result = new Stats(file);
      callback(null, result);
    } catch (err) {
      callback(err, null);
    }
  },

  readFileSync: path => {
    let bytes = NioFiles.readAllBytes(
      path_from_string(path_module.resolve(path))
    );
    return new JavaBuffer(bytes);

    // NOTE This should work as well, but I noticed it being pretty slow.
    // .... Should have a look at the performance of `Java.from` performance.
    // return Buffer.from(Array.from(bytes));
  },
  readFile: callbackify((...args) => fs.readFileSync(...args)),

  statSync: path => {
    let file = new File(path_module.resolve(path));
    return new Stats(file);
  },
  stat: callbackify((...args) => fs.statSync(...args)),

  // TODO
  readlink: () => "/linked/file",
  readlinkSync: () => "/linked/file",

  mkdir: (path, buffer) => {
    console.log("Mkdir file...", path, buffer);
  },
  rmdir: (path, buffer) => {
    console.log("rmdir file...", path, buffer);
  },
  writeFileSync: (path, buffer) => {
    let file = path_from_string(path);
    NioFiles.write(file, cast_to_bytes(buffer));
  },
  writeFile: callbackify((...args) => fs.writeFileSync(...args)),
  appendFile: (file, buffer) => {
    console.log("Appending file...", file, buffer);
  },
  unlink: (file, buffer) => {
    console.log("Appending file...", file, buffer);
  },
  chmod: (file, buffer) => {
    console.log("Appending file...", file, buffer);
  }
});
