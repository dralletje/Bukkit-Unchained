// let URLClassLoader = Java.type('java.net.URLClassLoader');
// let URL = Java.type('java.net.URL');
// let Class = Java.type('java.lang.Class');
// let String = Java.type('java.lang.String');
//
// let child = new URLClassLoader([
//     new URL(`file://${process.cwd()}/minecraft-server.jar`)
// ]);
// let classToLoad = Class.forName("com.destroystokyo.paperclip.Main", true, child);
// let methods = classToLoad.getMethods();
// console.log(`classToLoad:`, classToLoad);
// console.log(`methods:`, Java.from(methods).map(x => x.toString()))
// let result = classToLoad.static.main([])
// console.log(`results:`, result)

Java.addToClasspath(process.cwd() + '/minecraft-server.jar');
let PaperMain = Java.type('com.destroystokyo.paperclip.Main');

console.log(`PaperMain:`, PaperMain)
console.log(`PaperMain.main():`, PaperMain.main([]));

let keep_in_the_loop = () => {
  setTimeout(() => {
    keep_in_the_loop();
  }, 10 * 1000);
}
keep_in_the_loop();
