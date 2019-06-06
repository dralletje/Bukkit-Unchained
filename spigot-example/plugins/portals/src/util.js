// Simple way to add timeout to an async function:
// - await delay(1000); // Waits for 1 second before continueing
let delay = ms => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

class PreconditionError extends Error {
  constructor(...args) {
    super(...args);
    this.name = "PreconditionError";
  }
}
let precondition = (condition, message) => {
  if (!condition) {
    throw new PreconditionError(message);
  }
};

let queue_function = fn => {
  let IS_RUNNING = Symbol(
    "function is running, with no next function scheduled"
  );
  let next = null;
  let exeute_next = async (...args) => {
    try {
      // console.log(`START: ${typeof next}`);
      if (next == null) {
        next = IS_RUNNING;

        await fn(...args);
        await delay(10);

        let current = next;
        next = null;
        if (current !== IS_RUNNING && current != null) {
          // console.log("executing next");
          exeute_next(...current);
        }
        // console.log(`END: ${typeof next}`);
      } else {
        // console.log("Schedule next");
        next = args;
      }
    } catch (err) {
      if (err.printStackTrace) {
        err.printStackTrace();
        console.log(`err.getCause():`, err.getCause())
      }
      console.log(`err:`, err);
      throw err;
    }
  };

  return exeute_next;
};


module.exports = { delay, precondition, queue_function };
