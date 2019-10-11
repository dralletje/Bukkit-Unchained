let eslint_browser = require('eslint-browser');
console.log(`eslint_browser:`, eslint_browser)

var oop = require("ace/lib/oop");
var Mirror = require("ace/worker/mirror").Mirror;

var WorkerModule = exports.WorkerModule = function(sender) {
 Mirror.call(this, sender);
 this.setTimeout(500);
 this.setOptions();
};

// Mirror is a simple class which keeps main and webWorker versions of the document in sync
oop.inherits(WorkerModule, Mirror);

WorkerModule.prototype.onUpdate = function() {
     var value = this.doc.getValue();
     var errors = [];
     var results = eslint_browser(value);

     console.log(`results:`, results)

     for (var i = 0; i < results.length; i++) {
         var error = results[i];
         // convert to ace gutter annotation
         errors.push({
             row: error.line-1, // must be 0 based
             column: error.character,  // must be 0 based
             text: error.message,  // text to show in tooltip
             type: "error"|"warning"|"info"
         });
     }
     this.sender.emit("lint", errors);
 };

 module.exports = WorkerModule;
