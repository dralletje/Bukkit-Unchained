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
  let index = 0;
  let execute_next = async (...args) => {
    try {
      // console.log(`START: ${typeof next}`);
      if (next == null) {
        next = IS_RUNNING;

        try {
          await fn(...args);
          await delay(10);
        } finally {
          let current = next;
          next = null;
          if (current !== IS_RUNNING && current != null) {
            // console.log("executing next");
            execute_next(...current);
          }
        }

        // console.log(`END: ${typeof next}`);
      } else {
        next = args;
      }
    } catch (err) {
      if (err.printStackTrace) {
        err.printStackTrace();
        console.log(`queue_function getCause():`, err.getCause())
      }
      console.log(`Error in queue_function:`, err.stack);
      throw err;
    }
  };

  return execute_next;
};

let ChatColor = Java.type("org.bukkit.ChatColor");

let start_timer = label => {
  let initial_time = Date.now();
  let last_time = Date.now();

  return {
    log: message => {
      let seconds_spent = (Date.now() - last_time) / 1000;
      let color = seconds_spent < 0.8 ? ChatColor.GREEN : ChatColor.RED;
      last_time = Date.now();
      console.log(label, message, `took ${color}${seconds_spent.toFixed(3)}s`);
    },
    end: () => {
      let seconds_spent = (Date.now() - initial_time) / 1000;
      let color = seconds_spent < 1 ? ChatColor.GREEN : ChatColor.RED;
      // prettier-ignore
      console.log(label, `Completed!, spent ${color}${seconds_spent.toFixed(3)}s ${ChatColor.RESET}in total`);
    },
    disabled: () => {
        return { log: () => {}, end: () => {} };
    }
  };
};


module.exports = { delay, precondition, queue_function, start_timer };
