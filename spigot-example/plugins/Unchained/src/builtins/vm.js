let fs = require('./fs.js');

let contexts = new WeakMap();

export class Script {
  constructor(code, options) {
    this.code = code;
    this.options = options;
  }

  runInContext(context, options) {
    let run = contexts.get(context);
    return run(this.code);
  }
}

export let createContext = (parent_context, options) => {
  let init_global = loadWithNewGlobal({
    name: '/plot-plugin.js',
    script: `
      ((parent_context) => {
        for (let [key, value] of Object.entries(parent_context)) {
          global[key] = value;
        }
        
        let run = (source) => {
          let module = { exports: {} };
          let exports = module.exports;
          let require = () => null;
          let result = eval(source);
          return result;
        }
        return { run, global }
      })
    `,
  });

  let plugin = Polyglot.import('plugin');
  let { run, global } = init_global(parent_context || {});

  // console.log(`global:`, global)

  // let source = fs.readFileSync('./plugins/Unchained/dist/entry.js').toString();
  // console.log(`source:`, source)
  // try {
  //   run(source);
  // } catch (err) {
  //   console.log(`err.stack:`, err.stack)
  // }

  contexts.set(global, run);
  return global;
}
