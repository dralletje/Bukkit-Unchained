const fs = require('../builtins/fs');
const vm = require('../builtins/vm');
const path = require('path');
const {EventEmitter} = require('events');
const {INSPECT_MAX_BYTES} = require('buffer');

/**
 * Class Script
 *
 * @class
 */

class VMScript {
	/**
	 * Create VMScript instance.
	 *
	 * @param {String} code Code to run.
	 * @param {String} [filename] Filename that shows up in any stack traces produced from this script.
	 * @param {{ lineOffset: number, columnOffset: number }} [options] Options that define vm.Script options.
	 * @return {VMScript}
	 */

	constructor(code, filename, options) {
		this._code = String(code);
		this.options = options || {};
		this.filename = filename || this.options.filename || 'vm.js';
		this._prefix = '';
		this._suffix = '';
		this._compiledVM = null;
		this._unresolvedFilename = this.options.filename || this.filename;
	}

	/**
	 * Wraps the code.
	 * Will invalidate the code cache.
	 *
	 * @return {VMScript}
	 */

	wrap(prefix, suffix) {
		const strPrefix = String(prefix);
		const strSuffix = String(suffix);
		if (this._prefix === strPrefix && this._suffix === strSuffix) return this;
		this._prefix = strPrefix;
		this._suffix = strSuffix;
		this._compiledVM = null;
		return this;
	}

	/**
	 * This code will be compiled to VM code.
	 *
	 * @return {VMScript}
	 */

	compile() {
		return this._compileVM();
	}

	/**
	 * For backwards compatibility.
	 *
	 * @return {String} The wrapped code
	 */
	get code() {
		return this._prefix + this._code + this._suffix;
	}

	/**
	 * For backwards compatibility.
	 * Will invalidate the code cache.
	 *
	 * @param {String} newCode The new code to run.
	 */
	set code(newCode) {
		const strNewCode = String(newCode);
		if (strNewCode === this._prefix + this._code + this._suffix) return;
		this._code = strNewCode;
		this._prefix = '';
		this._suffix = '';
		this._compiledVM = null;
	}

	/**
	 * Will compile the code for VM and cache it
	 *
	 * @return {VMScript}
	 */
	_compileVM() {
		if (this._compiledVM) return this;

		const code = this._prefix + this._code + this._suffix;
		this._compiledVM = new vm.Script(code, {
			filename: this.filename,
			displayErrors: false,
			lineOffset: this.options.lineOffset || 0,
			columnOffset: this.options.columnOffset || 0
		});

		return this;
	}

	_runInVM(context) {
		return this._compiledVM.runInContext(context, {
			filename: this.filename,
			displayErrors: false
		});
	}
}

function loadScript(filename) {
	const data = fs.readFileSync(filename, 'utf8');
	return new VMScript(data, filename);
}

let VM2_NODE_MODULE = './plugins/Unchained/node_modules/vm2/lib';
let VM2_LOCAL = './plugins/Unchained/vm2';

const SCRIPT_CACHE = {
	cf: loadScript(`${VM2_NODE_MODULE}/contextify.js`).wrap('(function(require, host) { ', '\n})')._compileVM(),
	sb: loadScript(`${VM2_NODE_MODULE}/sandbox.js`).wrap('(function (vm, host, Contextify, Decontextify, Buffer) { ', '\n})')._compileVM(),
	exp: new VMScript('({exports: {}})')._compileVM(),
	runTimeout: new VMScript('fn()', 'timeout_bridge.js')._compileVM()
};

const TIMEOUT_CONTEXT = {context: null};

function doWithTimeout(fn, timeout) {
	if (!TIMEOUT_CONTEXT.context) {
		TIMEOUT_CONTEXT.context = vm.createContext();
	}
	TIMEOUT_CONTEXT.context.fn = fn;
	try {
		return SCRIPT_CACHE.runTimeout._compiledVM.runInContext(TIMEOUT_CONTEXT.context, {
			filename: SCRIPT_CACHE.runTimeout.filename,
			displayErrors: false,
			timeout
		});
	} finally {
		TIMEOUT_CONTEXT.context.fn = null;
	}
}

/**
 * Class VM.
 *
 * @property {Object} options VM options.
 */

class VM extends EventEmitter {
	/**
	 * Create VM instance.
	 *
	 * @param {Object} [options] VM options.
	 * @return {VM}
	 */

	constructor(options = {}) {
		super();

		// defaults
		this.options = {
			timeout: options.timeout,
			sandbox: options.sandbox,
			eval: options.eval === false ? false : true,
			wasm: options.wasm === false ? false : true
		};

		const host = {
			version: parseInt(process.versions.node.split('.')[0]),
			console,
			String,
			Number,
			Buffer,
			Boolean,
			Array,
			Date,
			Error,
			EvalError,
			RangeError,
			ReferenceError,
			SyntaxError,
			TypeError,
			URIError,
			RegExp,
			Function,
			Object,
			VMError,
			Proxy,
			Reflect,
			Map,
			WeakMap,
			Set,
			WeakSet,
			Promise,
			Symbol,
			INSPECT_MAX_BYTES
		};

		this._context = vm.createContext(undefined, {
			codeGeneration: {
				strings: this.options.eval,
				wasm: this.options.wasm
			}
		});

		Reflect.defineProperty(this, '_internal', {
			value: SCRIPT_CACHE.cf._runInVM(this._context).call(this._context, require, host)
		});

		// prepare global sandbox
		if (this.options.sandbox) {
			if ('object' !== typeof this.options.sandbox) {
				throw new VMError('Sandbox must be object.');
			}

			for (const name in this.options.sandbox) {
				if (Object.prototype.hasOwnProperty.call(this.options.sandbox, name)) {
					this._internal.Contextify.globalValue(this.options.sandbox[name], name);
				}
			}
		}
	}

	/**
	 * Freezes the object inside VM making it read-only. Not available for primitive values.
	 *
	 * @static
	 * @param {*} object Object to freeze.
	 * @param {String} [globalName] Whether to add the object to global.
	 * @return {*} Object to freeze.
	 */

	freeze(value, globalName) {
		this._internal.Contextify.readonly(value);
		if (globalName) this._internal.Contextify.globalValue(value, globalName);
		return value;
	}

	/**
	 * Protects the object inside VM making impossible to set functions as it's properties. Not available for primitive values.
	 *
	 * @static
	 * @param {*} object Object to protect.
	 * @param {String} [globalName] Whether to add the object to global.
	 * @return {*} Object to protect.
	 */

	protect(value, globalName) {
		this._internal.Contextify.protected(value);
		if (globalName) this._internal.Contextify.globalValue(value, globalName);
		return value;
	}

	/**
	 * Run the code in VM.
	 *
	 * @param {String} code Code to run.
	 * @param {String} [filename] Filename that shows up in any stack traces produced from this script.
	 * @return {*} Result of executed code.
	 */

	run(code, filename) {
		const script = code instanceof VMScript ? code : new VMScript(code, filename);
		script._compileVM();

		if (!this.options.timeout) {
			try {
				return this._internal.Decontextify.value(script._runInVM(this._context));
			} catch (e) {
				throw this._internal.Decontextify.value(e);
			}
		}

		return doWithTimeout(()=>{
			try {
				return this._internal.Decontextify.value(script._runInVM(this._context));
			} catch (e) {
				throw this._internal.Decontextify.value(e);
			}
		}, this.options.timeout);
	}
}

/**
 * VMError.
 *
 * @class
 * @extends {Error}
 * @property {String} stack Call stack.
 * @property {String} message Error message.
 */

class VMError extends Error {
	/**
	 * Create VMError instance.
	 *
	 * @param {String} message Error message.
	 * @return {VMError}
	 */

	constructor(message) {
		super(message);

		this.name = 'VMError';

		Error.captureStackTrace(this, this.constructor);
	}
}

exports.VMError = VMError;
// exports.NodeVM = NodeVM;
exports.VM = VM;
exports.VMScript = VMScript
