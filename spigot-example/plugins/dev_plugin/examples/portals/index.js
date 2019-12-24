require('./Portals.js');
// let { queue_function, delay } = require('./util.js');

// let delayed = queue_function(async (i) => {
//     console.log('START:', i);
//     await delay(2000);
//     console.log('END:', i);
// });

// let index = 0;
// setInterval(() => {
//     console.log('INDEX:', index);
//     delayed(index)
//     index = index + 1;
// }, 1000);

let dev_test = () => {
  try {
    let location = plugin.region.min;
    let vector = location.toVector();

    let start = performance.now();
    for (let i = 0; i < 10000; i++) {
        // if (i % 1000) {
        //     await new Promise(resolve => setTimeout(resolve, 50));
        // }
        // location.clone();
        // location.toVector();
        // plugin.__test_java_clone_performance_single(location);
        // player.getLocation();
        location.getBlock();
        // vector.clone();
    }
    // plugin.__test_java_clone_performance_loop(location);
    let total = performance.now() - start;
    console.log(`TIME: ${total}ms`);
  } catch (error) {
    console.error(error);
  }
}

dev_test();
