import fs from "fs";
let Location = Java.type("org.bukkit.Location");

let server = Polyglot.import('server');

class Region {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }

  contains(location) {
    let from_x_higher = this.from.getX() > location.getX();
    let to_x_higher = this.to.getX() > location.getX();
    let from_y_higher = this.from.getY() > location.getY();
    let to_y_higher = this.to.getY() > location.getY();
    let from_z_higher = this.from.getZ() > location.getZ();
    let to_z_higher = this.to.getZ() > location.getZ();

    if (
      from_x_higher !== to_x_higher &&
      from_y_higher !== to_y_higher &&
      from_z_higher !== to_z_higher
    ) {
      return true;
    } else {
      return false;
    }
  }
}
Region.from_worldedit = WorldeditRegion => {
  let BlockVector3 = Java_type("com.sk89q.worldedit.math.BlockVector3");
  return new Region(
    WorldeditRegion.getMinimumPoint(),
    WorldeditRegion.getMaximumPoint().add(BlockVector3.static.at(1, 1, 1))
  );
};

let worldedit_session_for_player = player => {
  return Java_type("com.sk89q.worldedit.WorldEdit")
    .static.getInstance()
    .getSessionManager()
    .findByName(player.getName());
};

export let create_isolated_buildconfig = ({ plugin, plot_id }) => {
  let world = server.getWorlds()[0];

  let BuildConfigTypes = {
    location: {
      get_from_player: player => {
        return player.getLocation();
      },
      to_plain: location => {
        return {
          x: location.getX(),
          y: location.getY(),
          z: location.getZ(),
          yaw: location.getYaw ? location.getYaw() : 0,
          pitch: location.getPitch ? location.getPitch() : 0
        };
      },
      from_plain: plain => {
        if (plain == null) {
          throw new Error("Given null error to convert to Location");
        }
        return new Location(
          world,
          plain.x,
          plain.y,
          plain.z,
          plain.yaw,
          plain.pitch
        );
      }
    },
    region: {
      get_from_player: player => {
        let session = worldedit_session_for_player(player);
        let selection = session.getSelection(world);
        let region = Region.from_worldedit(selection);
        return region;
      },
      to_plain: region => {
        return {
          from: BuildConfigTypes.location.to_plain(region.from),
          to: BuildConfigTypes.location.to_plain(region.to)
        };
      },
      from_plain: plain => {
        if (plain == null) {
          throw new Error("Given null error to convert to Region");
        }
        return new Region(
          BuildConfigTypes.location.from_plain(plain.from),
          BuildConfigTypes.location.from_plain(plain.to)
        );
      }
    }
  };

  // build_keys :: Map<string, BuildConfigType>
  let build_keys = new Map();

  let build_storage_cache = new Map();
  let dev_plugin_data_path = plugin.java
    .getDataFolder()
    .toPath()
    .toString();

  let js_plugin_data_path = `${dev_plugin_data_path}/data/${plot_id}.json`;

  let storage = {
    set_from_player: (key, player) => {
      if (!build_keys.has(key)) {
        throw new Error(`No build key found called '${key}'`);
      }

      let type = build_keys.get(key);
      let build_config = BuildConfigTypes[type];

      let value = build_config.get_from_player(player);
      let plain_value = build_config.to_plain(value);
      storage.set({
        [key]: plain_value,
      });
      return plain_value;
    },
    get_build_keys: () => {
      let data = storage.get();
      return Array.from(build_keys.entries()).map(([key, type]) => {
        if (data[key] != null) {
          return {
            name: key,
            type: type,
            complete: true,
          }
        } else {
          return {
            name: key,
            type: type,
            complete: false,
          }
        }
      })
    },

    define_key: (key, type) => {
      if (BuildConfigTypes[type] == null) {
        throw new Error(`Build config type '${type}' does not exist`);
      }
      if (build_keys.has(key)) {
        throw new Error(`Build config already contains key '${key}'`);
      }
      build_keys.set(key, type);

      return {
        get: () => {
          let data = storage.get();
          let value = data[key];
          if (value == null) {
            throw new Error(`Key '${key}' has not been set yet`)
          }
          return BuildConfigTypes[type].from_plain(value);
        },
        set: (value) => {
          storage.set({
            [key]: BuildConfigTypes[type].to_plain(value),
          });
        },
      };
    },

    set: change => {
      let value = {
        ...storage.get(),
        ...change
      };
      build_storage_cache.set(plot_id, value);
      fs.writeFileSync(js_plugin_data_path, JSON.stringify(value, null, 2));
    },
    get: () => {
      try {
        if (!build_storage_cache.has(plot_id)) {
          let value = JSON.parse(
            fs.readFileSync(js_plugin_data_path).toString()
          );
          build_storage_cache.set(plot_id, value);
        }
        return build_storage_cache.get(plot_id);
      } catch (error) {
        console.log(`Build storage get error:`, error);
        return {};
      }
    },
    reload: () => {
      build_storage_cache.delete(plot_id);
      return storage.get();
    }
  };
  return storage;
};
