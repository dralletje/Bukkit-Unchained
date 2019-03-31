let path_module = require('./path.js');

let File = Java.type('java.io.File');
let FileReader = Java.type('java.io.FileReader');
let BufferedReader = Java.type('java.io.BufferedReader');

class TextBuffer {
  constructor(text_contents) {
    this.text_contents = text_contents;
  }

  toString() {
    return this.text_contents;
  }
}

class Stats {
  constructor(java_file) {
    if (java_file.exists() === false) {
      throw new IOException(`File '${java_file}' does not exist`, 'ENOENT');
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
    return this.java_file.getAbsolutePath().toString() !== this.java_file.getCanonicalPath().toString();
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

module.exports = {
  existsSync: (path) => {
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
  readFileSync: (path) => {
    let file = new File(path_module.resolve(path));
    let buffered = new BufferedReader(new FileReader(file));

    try {
      let text = '';
      while ((line = buffered.readLine()) !== null) {
        text += line + '\n';
      }

      // Act like a buffer, quick
      return new TextBuffer(text);
    } finally {
      buffered.close();
    }
  },
  statSync: (path) => {
    let file = new File(path_module.resolve(path));
    return new Stats(file);
  }
};
