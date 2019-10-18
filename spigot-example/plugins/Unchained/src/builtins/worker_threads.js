import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

let WorkerContext = Java_type('eu.dral.unchained.WorkerContext');
// let InterContextValue = WorkerContext.static.InterContextValue;
let htmlLikeClone = WorkerContext.static.htmlLikeClone;

let Java_to_js = (object) => {
  if (object == null) {
    return null;
  }
  if (object instanceof Java.type('java.util.Map')) {
    let result = {};
    let entries = Array.from(object.entrySet());
    for (let entry of entries) {
      result[entry.getKey()] = entry.getValue();
    }
    return result;
  } else {
    throw new Error(`Unknown '${object}'`);
  }
}

let context = process.binding('context');
let plugin = process.binding('plugin');
export let workerData = Java_to_js(process.binding('workerData'));

// TODO Add listener of some sort to keep updated
export let isMainThread = plugin.getServer().isPrimaryThread();

export let ref = (closable) => {
  if (Java.isJavaObject(closable)) {
    context.addClosable(closable);
  } else {
    context.addClosable({ close: () => closable.close() });
  }

  return closable.close;
}

let StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
let JavaString = Java.type("java.lang.String");
class JavaBuffer {
  constructor(java_bytes) {
    this.java_bytes = java_bytes;
  }

  toString() {
    return new JavaString(this.java_bytes, StandardCharsets.UTF_8);
  }
}

let OutputStream = Java.type('java.io.OutputStream');
let create_outputstream = () => {
  let js_stream = new PassThrough();

  let StdOut = Java.extend(OutputStream, {
    write: (bytes) => {
      if (bytes.getClass().equals(Java.type('byte[]').class)) {
        js_stream.write((new JavaBuffer(bytes)).toString(), 'utf8')
      } else {
        js_stream.write(new Buffer([bytes]))
      }
    }
  });
  return {
    java: new StdOut(),
    javascript: js_stream,
  }
}

export class Worker extends EventEmitter {
  constructor(url_or_script, { stdout = false, stderr = false, workerData } = {}) {
    super();
    this.context = null;



    let stdout_stream = Java.type('java.lang.System').out;
    if (stdout === true) {
      let outputstream = create_outputstream();
      stdout_stream = outputstream.java;
      this.stdout = outputstream.javascript;
    }

    let stderr_stream = Java.type('java.lang.System').err;
    if (stderr === true) {
      let outputstream = create_outputstream();
      stderr_stream = outputstream.java;
      this.stderr = outputstream.javascript;
    }

    let java_worker_data = htmlLikeClone(workerData);
    // console.log(`java_worker_data:`, java_worker_data)
    WorkerContext.static.createAsync(plugin, java_worker_data, url_or_script, stdout_stream, stderr_stream, (error, result) => {
      if (error != null) {
        console.log(`createAsync error:`, error)
        this.emit('error', error);
      } else {
        console.log('ONLINE!');
        this.emit('online');
        this.context = result;
      }
    });
  }

  postMessage(message) {
    if (this.context == null) {
      throw new Error('Worker not yet online');
    }
    this.context.postMessage(htmlLikeClone(message));
  }

  terminate() {
    if (this.context == null) {
      throw new Error('Context already terminated');
    }
    this.context.close();
    this.context = null;
  }
}

let html_unclone = (java_clone) => {
  if (java_clone instanceof Java.type('java.util.Map')) {
    let result = {};
    for (let entry of Array.from(java_clone.entrySet())) {
      result[entry.getKey()] = entry.getValue();
    }
    return result;
  }
  if (java_clone instanceof Java.type('java.util.List')) {
    return Array.from(java_clone);
  }
  if (Java.isJavaObject(java_clone)) {
    console.log(`isJavaObject java_clone:`, java_clone);
  }
  return java_clone;
}

class MessagePort extends EventEmitter {
  constructor(context) {
    super();
    this.context = context;

    this.context.onMessage((message) => {
      this.emit('message', html_unclone(message));
    })
  }
  postMessage(message) {
    throw new Error('postMessage on parentPort not yet well defined');
    this.context.postMessage(htmlLikeClone(message));
  }
}

export let parentPort = new MessagePort(context);
