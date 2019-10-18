import { EventEmitter } from 'events';
import path from 'path';

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

export class Worker extends EventEmitter {
  constructor(url_or_script, options = {}) {
    super();
    this.context = null;

    if (options.eval === true) {
      throw new Error("I don't support eval just yet");
    }

    let java_worker_data = htmlLikeClone(options.workerData);
    // console.log(`java_worker_data:`, java_worker_data)
    WorkerContext.static.createAsync(plugin, java_worker_data, url_or_script, (error, result) => {
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
