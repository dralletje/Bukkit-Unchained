let path = require('path');
let fs = require('fs');

let get_plugin_description = (package_json_path) => {
  let package_json_text = fs.readFileSync(package_json_path);
  let package_json = JSON.parse(package_json_text);

  if (package_json.bukkit == null) {
    throw new Error(`No 'bukkit' key in package.json @ '${package_json_path}'`);
  }

  let result =  {
    name: package_json.name,
    version: package_json.version,
    author: package_json.author,
    main: path.join(
      path.relative(process.cwd(), path.dirname(package_json_path)),
      package_json.main || 'index.js'
    ),
    ...package_json.bukkit,
  }
  // console.log(`result:`, result);
  return result;
}

module.exports = { get_plugin_description };
