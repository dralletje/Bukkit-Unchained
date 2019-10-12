module.exports = plugin => {
  try {
    require("./dev_http.js")(plugin);
  } catch (err) {
    console.log("Could't load dev http plugin");
    console.log(err);
  }

  try {
    require("./jsrepl.js")(plugin);
  } catch (err) {
    console.log("Could't load jsrepl plugin");
    console.log(err);
  }

  try {
    let chunk_generator = require("./PlotGenerator.js")(plugin);
    plugin.setDefaultChunkGenerator(chunk_generator)
  } catch (err) {
    console.log("Could't load plot generator plugin");
    console.log(err);
  }


  // try {
  //   require('./conversation.js').create_conversation(plugin);
  // } catch (err) {
  //   console.log('Could\'t load conversation plugin');
  //   console.log(err);
  // }
};

module.exports.worker = (plugin, source, config) => {
  let { create_isolated_plugin } = require("./isolated_plugin.js");
  return create_isolated_plugin({ plugin, source, config })
};
