let PlayerEntity = Java.type("org.bukkit.entity.Player");
let ChatColor = Java.type("org.bukkit.ChatColor");

let Map = Java.type("java.util.Map");
let HashMap = Java.type("java.util.HashMap");
let WeakIdentityHashMap = Java_type("eu.dral.unchained.WeakIdentityHashMap");

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
    }
  };
};

let java_get_prototype_chain = function*(java_class) {
  let current_class = java_class.class || java_class;
  while (current_class != null) {
    if (current_class.isEnum && current_class.isEnum()) {
      yield current_class;
      yield Java.type("java.lang.Enum").class;
      return;
    }

    if (current_class.getGenericSuperclass == null) {
      // https://docs.oracle.com/javase/9/docs/api/java/lang/reflect/ParameterizedType.html
      console.warn(
        `class without getGenericSuperclass:`,
        current_class.getTypeName()
      );
      return;
    }

    yield current_class;

    // for (let implementing_class of current_class.getInterfaces()) {
    //   yield* java_get_prototype_chain(implementing_class);
    // }

    current_class = current_class.getGenericSuperclass();
  }
};

let get_all_interfaces = function*(java_class) {
  for (let java_interface of java_class.getInterfaces()) {
    yield java_interface;
    yield* get_all_interfaces(java_interface);
  }
};

let get_all_constructors = function(object) {
  let constructors = [];
  let constructor = object.constructor;
  while (constructor !== Function.prototype) {
    constructors.push(constructor);
    // yield constructor;
    constructor = Object.getPrototypeOf(constructor);
    // constructor = constructor.__proto__
  }
  return constructors
};

let get_class = c => c.class || c;

let return_if_player = possible_player => {
  return possible_player instanceof PlayerEntity ? [possible_player] : [];
};

let AllowedClasses = [
  {java_class: { class: Java_type('com.comphenix.protocol.wrappers.WrappedBlockData'), static: Java_type('com.comphenix.protocol.wrappers.WrappedBlockData').static }},
  {java_class: Java.type('net.minecraft.server.v1_15_R1.Block') },
  { java_class: Java.type('net.minecraft.server.v1_15_R1.RegistryBlockID')},
  { java_class: Java.type('net.minecraft.server.v1_15_R1.IBlockData')},

  { java_class: Java.type("java.lang.Class") },
  { java_class: Java.type("java.lang.Enum") },
  { java_class: Java.type("java.util.UUID") },
  { java_class: Java.type("java.util.regex.Pattern") },

  { java_class: Java.type("net.md_5.bungee.api.ChatColor") },
  { java_class: Java.type("net.md_5.bungee.api.chat.ClickEvent") },
  { java_class: Java.type("net.md_5.bungee.api.chat.ComponentBuilder") },
  { java_class: Java.type("net.md_5.bungee.api.chat.HoverEvent") },
  { java_class: Java.type("net.md_5.bungee.api.chat.TextComponent") },
  { java_class: Java.type("net.md_5.bungee.api.ChatMessageType") },
  { java_class: Java.type("org.bukkit.inventory.Merchant") },
  { java_class: Java.type("org.bukkit.entity.minecart.PoweredMinecart") },
  {
    java_class: Java.type("org.bukkit.inventory.PlayerInventory"),
    get_location: inventory => [inventory.getLocation()],
    get_players: inventory => [inventory.getHolder()]
  },
  {
    java_class: Java.type("org.bukkit.inventory.Inventory"),
    get_location: inventory => [inventory.getLocation()]
  },
  { java_class: Java.type("org.bukkit.enchantments.Enchantment") },
  {
    java_class: Java.type("org.bukkit.inventory.InventoryHolder"),
    get_players: holder => return_if_player(holder)
  },
  { java_class: Java.type("org.bukkit.attribute.AttributeModifier") },
  // { java_class: Java.type('org.bukkit.attribute.AttributeModifier.Operation') },
  { java_class: Java.type("org.bukkit.inventory.ItemStack") },
  {
    java_class: Java.type("org.bukkit.event.block.BlockEvent"),
    get_locations: event => [event.getBlock().getLocation()]
  },
  {
    java_class: Java.type("org.bukkit.entity.Player"),
    get_locations: player => [player.getLocation()],
    get_players: player => [player]
  },
  {
    java_class: Java.type("org.bukkit.entity.LivingEntity"),
    get_locations: entity => [entity.getLocation()],
    get_players: return_if_player
  },
  {
    java_class: Java.type("org.bukkit.entity.HumanEntity"),
    get_locations: () => [],
    get_players: () => []
  },
  {
    java_class: Java.type("org.bukkit.entity.Entity"),
    get_locations: entity => [entity.getLocation()]
  },

  // BukkitScheduler
  { java_class: Java.type("org.bukkit.scheduler.BukkitScheduler") },
  { java_class: Java.type("org.bukkit.scheduler.BukkitTask") },

  // TODO These things stick around, so need something to auto-cleanup
  // {
  //   java_class: Java.type("org.bukkit.boss.BossBar"),
  //   get_players: bossbar => Array.from(bossbar.getPlayers())
  // },
  // {
  //   java_class: Java.type("org.bukkit.boss.KeyedBossBar"),
  //   get_players: bossbar => Array.from(bossbar.getPlayers())
  // },
  // { java_class: Java.type("org.bukkit.boss.BarFlag") },
  // { java_class: Java.type("org.bukkit.boss.BarColor") },
  // { java_class: Java.type("org.bukkit.boss.BarStyle") },
  {
    java_class: Java.type("org.bukkit.event.entity.EntityEvent"),
    get_locations: event => [event.getEntity().getLocation()],
    get_players: event => return_if_player(event.getEntity())
  },
  {
    java_class: Java.type("org.bukkit.event.hanging.HangingEvent"),
    get_locations: event => [event.getHanging().getLocation()],
    get_players: () => []
  },
  // 'org.bukkit.event.inventory.InventoryEvent': {},
  {
    java_class: Java.type("org.bukkit.event.player.PlayerEvent"),
    get_locations: event => [event.getPlayer().getLocation()],
    get_players: event => [event.getPlayer()]
  },
  {
    java_class: Java.type("org.bukkit.event.player.PlayerMoveEvent"),
    get_locations: event => [event.getTo(), event.getFrom()]
  },
  {
    java_class: Java.type("org.bukkit.event.entity.PlayerLeashEntityEvent"),
    get_location: event => [
      event.getPlayer().getLocation(),
      event.getEntity().getLocation()
    ],
    get_players: event => [event.getPlayer()]
  },
  // 'org.bukkit.event.server.ServerEvent': {},
  {
    java_class: Java.type("org.bukkit.event.vehicle.VehicleEvent"),
    get_locations: event => [event.getVehicle().getLocation()],
    get_players: () => []
  },
  {
    java_class: Java.type("org.bukkit.util.Vector"),
    get_locations: () => [],
    get_players: () => []
  },
  {
    java_class: Java.type("org.bukkit.Location"),
    // get_locations: location => [location],
    get_players: () => []
  },
  { java_class: Java.type("org.bukkit.World") }, // TODO Check location
  { java_class: Java.type("org.bukkit.Chunk") }, // TODO Check location
  { java_class: Java.type("org.bukkit.block.Block"), get_locations: (block) => [block.getLocation()] }, // TODO Check location
  { java_class: Java.type("org.bukkit.Material") },
  { java_class: Java.type("org.bukkit.GameMode") },
  { java_class: Java.type("org.bukkit.block.data.Directional") },
  { java_class: Java.type("org.bukkit.block.data.Rotatable") },
  { java_class: Java.type("org.bukkit.block.data.Bisected") },
  { java_class: Java.type("org.bukkit.block.data.BlockData") },

  { java_class: Java.type("org.bukkit.inventory.ItemFlag") },
  { java_class: Java.type("org.bukkit.inventory.meta.ItemMeta") },

  { java_class: Java.type("org.bukkit.block.BlockFace") },
  { java_class: Java.type("org.bukkit.Particle") },
  { java_class: Java.type("org.bukkit.entity.EntityType") },
  { java_class: Java.type("org.bukkit.block.Biome") },
  { java_class: Java.type("org.bukkit.Color") },
  { java_class: Java.type("org.bukkit.DyeColor") },
  { java_class: Java.type("org.bukkit.block.banner.PatternType") },
  // { java_class: Java.type("org.bukkit.Tag") },
  { java_class: Java.type("org.bukkit.block.banner.Pattern") },
  { java_class: Java.type("org.bukkit.WeatherType") },
  { java_class: Java.type("org.bukkit.ChatColor") },
  { java_class: Java.type("org.bukkit.inventory.EquipmentSlot") },
  { java_class: Java.type("org.bukkit.event.block.Action") },

  { java_class: Java.type("org.bukkit.NamespacedKey") }
];

// AllowedClasses = [
//   { java_class: Java.type('org.bukkit.attribute.AttributeModifier') },
// ]

let get_allowed_class = java_class => {
  return AllowedClasses.find(x => x.java_class === java_class);
};

// https://github.com/ronmamo/reflections#integrating-into-your-build-lifecycle
let reflections = Polyglot.import("reflections");
let event_classes = reflections.getSubTypesOf(
  Java.type("org.bukkit.event.Event").class
);
let blockdata_classes = reflections.getSubTypesOf(
  Java.type("org.bukkit.block.data.BlockData").class
);

// console.log(`blockdata_classes:`, [...blockdata_classes])
// console.log(`[...event_classes]:`, [...event_classes])

for (let event_class of [...blockdata_classes, ...event_classes]) {
  let name = event_class.getName();
  // let match =
  //   name.match(/org\.bukkit\.event\.(.*)\.(.*)Event/) ||
  //   name.match(/org\.bukkit\.block\.data\.type\.(.*)/);
  // if (match == null) {
  //   console.log(`name:`, name)
  //   continue;
  // }

  for (let superclass of java_get_prototype_chain(event_class)) {
    let matching_event_superclass = AllowedClasses.find(
      ({ java_class }) => java_class === superclass
    );
    if (matching_event_superclass) {
      AllowedClasses.push({
        java_class: { class: event_class },
        get_players: matching_event_superclass.get_players,
        get_locations: matching_event_superclass.get_locations
      });
    }
  }
}

export let make_adapters = filters => {
  // let adapt_timer = start_timer(` ${ChatColor.DARK_BLUE}ADAPT:${ChatColor.WHITE}`);

  let java_to_js_identity = new WeakIdentityHashMap();
  let java_to_js_class = new HashMap();
  let js_to_java_object = new WeakMap();
  let js_to_java_class = new WeakMap();
  let js_class_to_filters = new WeakMap();

  let create_java_method = name => {
    return function(...args) {
      let java_args = args.map(arg => adapt.to_java(arg));
      let java_this = js_to_java_object.get(this);
      let java_method = java_this[name] || java_this.static[name];
      let java_return = java_method(...java_args);
      return adapt.from_java(java_return);
    };
  };

  let create_java_getter = name => {
    return function() {
      let java_return = js_to_java_object.get(this)[name];
      return adapt.from_java(java_return);
    };
  };

  class JavaObject {
    constructor(java_object) {
      js_to_java_object.set(this, java_object);
    }
  }
  Object.defineProperty(JavaObject.prototype, "equals", {
    value: create_java_method("equals"),
    writable: true,
    configrable: true
  });
  js_to_java_class.set(JavaObject, {
    get_locations: () => [],
    get_players: () => [],
    java_class: null
  });

  let get_filters = (value) => {
    let cached_filter = js_class_to_filters.get(value.constructor);
    if (cached_filter != null) {
      return cached_filter;
    } else {
      let all_get_locations = [];
      let all_get_players = [];
      for (let constructor of get_all_constructors(value)) {
        let class_description = js_to_java_class.get(constructor);
        if (class_description == null) {
          // prettier-ignore
          throw new Error(`No class description found for "${constructor.name}"`);
        }
        let { get_locations, get_players } = class_description;

        all_get_locations.push(get_locations);
        all_get_players.push(get_players);
      }
      let filters = {
        get_locations: (java_value) => all_get_locations.map(get_locations => get_locations(java_value)).flat(),
        get_players: (java_value) => all_get_players.map(get_players => get_players(java_value)).flat(),
      };
      js_class_to_filters.set(value.constructor, filters);
      return filters;
    }
  }

  let adapted_classes = {};
  let adapt = {
    classes: adapted_classes,
    validate: value => {
      // The value *is* a java class
      // I think the java classes are all fine to return,
      // as there is really no way to get a forbidden java class anyway
      // if (value instanceof JavaObject) {
      //   return;
      // }
      if (js_to_java_class.has(value)) {
        return;
      }

      // let { get_locations, get_players } = get_filters(value);

      let java_value = js_to_java_object.get(value);

      for (let constructor of get_all_constructors(value)) {
        let class_description = js_to_java_class.get(constructor);
        if (class_description == null) {
          console.error(`constructor:`, constructor.name);
          throw new Error("No class description found");
        }
        let { get_locations, get_players, java_class } = class_description;

        let locations = get_locations(java_value);
        if (locations.length !== 0) {
          for (let location of locations) {
            if (!filters.location(location)) {
              // prettier-ignore
              throw new Error(`Object not in range of your plot (${location.toString()})`);
            }
          }
        }
        let players = get_players(java_value);
        if (players.length !== 0) {
          for (let player of players) {
            if (!filters.player(player)) {
              // prettier-ignore
              throw new Error(`Object contains a player not currently on your plot`);
            }
          }
        }
      }
    },
    get_class: class_name => {
      let adapted = adapted_classes[class_name];
      if (adapted) {
        return adapted;
      }

      let allowed_class = AllowedClasses.find(allowed_class => {
        return get_class(allowed_class.java_class).getName() === class_name;
      });

      if (allowed_class == null) {
        throw new Error(`Class '${class_name}' not available`);
      }

      return adapt_class(allowed_class);
    },
    // adapt_class: adapt_class,
    from_java: value => {
      if (!Java.isJavaObject(value)) {
        return value;
      }

      let cached_version = java_to_js_identity.get(value);
      if (cached_version != null) {
        return cached_version;
      }

      let java_class = value.getClass();
      let JavaAdapter_from_cache = java_to_js_class.get(java_class);
      if (JavaAdapter_from_cache != null) {
        let js_value = new JavaAdapter_from_cache(value);
        java_to_js_identity.put(value, js_value);
        return js_value;
      }

      if (value instanceof Map) {
        let object = {};
        for (let entry of value.entrySet()) {
          // TODO Allow only string keys
          object[entry.getKey().toString()] = adapt.to_java(entry.getValue());
        }
        return object;
      }

      if (
        value instanceof Java.type("java.util.List") ||
        java_class.isArray()
      ) {
        return Java.from(value)
          .map(x => {
            try {
              return adapt.from_java(x);
            } catch {
              console.log(`From java failed on:`, x);
              return null;
            }
          })
          .filter(Boolean);
      }

      if (java_class.isEnum()) {
        let EnumClass = adapt.get_class(value.getClass().getName());
        let enum_value = EnumClass[value.name()] || new EnumClass(value);
        return enum_value;
      }

      let concat = function*(arrays) {
        for (let sub_array of arrays) {
          yield* sub_array;
        }
      }

      let java_class_names = concat([
        java_class.getInterfaces().length === 1
          ? java_get_prototype_chain(java_class.getInterfaces()[0])
          : java_class.getInterfaces(),
        java_get_prototype_chain(java_class),
      ]);

      let JavaAdapter = null;
      for (let x of java_class_names) {
        try {
          JavaAdapter = adapt.get_class(x.getName());
          break;
        } catch (err) {}
      }

      if (JavaAdapter == null) {
        console.log(`value:`, value);
        console.log(`java_class:`, java_class);
        // prettier-ignore
        throw new Error(`No adapter found for java class "${Array.from(java_class_names).map(x => x.getName()).join('", "')}"`);
      }

      java_to_js_class.put(java_class, JavaAdapter);

      let js_value = new JavaAdapter(value);
      java_to_js_identity.put(value, js_value);
      return js_value;
    },
    to_java: value => {
      if (Array.isArray(value)) {
        return Java.to(value.map(x => adapt.to_java(x)));
      }
      else if (
        value == null ||
        typeof value === "number" ||
        typeof value === "string" ||
        typeof value === "boolean"
      ) {
        return value;
      }
      else if (value.type === "$enum") {
          return Java.type(value.class).valueOf(value.value);
      } else {
        let cached = js_to_java_object.get(value);
        if (cached != null) {
          adapt.validate(value);
          return cached;
        } else {
          console.log(`value:`, value)
          throw new Error(`No java value found (${JSON.stringify(value)})`);
          return value;
        }
      }
    }
  };

  let adapt_class = ({
    java_class,
    get_locations = () => [],
    get_players = () => []
  }) => {
    let java_class_name = java_class.class.getName();
    if (adapted_classes[java_class_name]) {
      return adapted_classes[java_class_name];
    }

    let SuperClass = JavaObject;
    let superclasses = java_get_prototype_chain(java_class);
    find_super_class: for (let possible_superclass of superclasses) {
      if (possible_superclass === java_class.class) continue;
      for (let allowed_class of AllowedClasses) {
        if (possible_superclass === allowed_class.java_class.class) {
          SuperClass = adapt_class(allowed_class);
          break find_super_class;
        }
      }
    }

    class JavaAdapter extends SuperClass {
      // static java_name = java_class_name;

      constructor(...args) {
        if (Java.isJavaObject(args[0])) {
          let java_object = args[0];
          super(java_object);
        } else {
          let java_args = args.map(arg => adapt.to_java(arg));
          super(new java_class(...java_args));
        }

        adapt.validate(this);
      }

      // TODO Use this if I'm going to make something implement all it's interfaces
      // .... (Currently I only chose one "best matching" interface)
      // [Symbol.hasInstance](value) {
      //
      // }
    }

    Object.defineProperty(JavaAdapter, "name", {
      value: java_class_name,
      configurable: true
    });
    Object.defineProperty(JavaAdapter, "class", {
      value: JavaAdapter,
      configurable: true
    });

    js_to_java_class.set(JavaAdapter, {
      get_locations,
      get_players,
      java_class
    });
    js_to_java_object.set(JavaAdapter, java_class);
    adapted_classes[java_class_name] = JavaAdapter;

    let interfaces = Array.from(get_all_interfaces(java_class.class));
    let valid_interfaces = [
      java_class.class,
      ...interfaces.filter(x => get_allowed_class(x) != null).map(x => x)
    ];

    for (let method of java_class.class.getMethods()) {
      let declared_class = method.getDeclaringClass();
      if (valid_interfaces.includes(declared_class)) {
        let is_static = Java.type("java.lang.reflect.Modifier").isStatic(
          method.getModifiers()
        );
        let method_holder = is_static ? JavaAdapter : JavaAdapter.prototype;

        let name = method.getName();
        if (!method_holder.hasOwnProperty(name)) {
          method_holder[name] = create_java_method(name);
        }
      }
    }

    for (let nested_class of java_class.class.getClasses()) {
      let declared_class = nested_class.getDeclaringClass();
      if (valid_interfaces.includes(declared_class)) {
        let is_static = Java.type("java.lang.reflect.Modifier").isStatic(
          nested_class.getModifiers()
        );
        let method_holder = is_static ? JavaAdapter : JavaAdapter.prototype;
        let simple_name = nested_class.getSimpleName();
        let name = nested_class.getName();

        // TODO Check out non-static nested classes
        if (is_static && !method_holder.hasOwnProperty(simple_name)) {
          // TODO Pass on filters? Idk? Just allow all static classes always?
          let adapted_class = adapt_class({ java_class: Java.type(name) });
          method_holder[simple_name] = adapted_class;
        }
      }
    }

    let static_properties = {};
    let instance_properties = {};
    for (let field of java_class.class.getFields()) {
      let declared_class = field.getDeclaringClass();
      let Modifier = Java.type("java.lang.reflect.Modifier");

      if (valid_interfaces.includes(declared_class)) {
        let is_static = Modifier.isStatic(field.getModifiers());
        let is_final = Modifier.isFinal(field.getModifiers());
        let field_holder = is_static ? static_properties : instance_properties;

        let name = field.getName();
        if (is_static && is_final) {
          let enum_value = adapt.from_java(java_class[name]);
          field_holder[name] = {
            value: enum_value,
            // writable: false,
            configurable: true
          };
        } else if (!field_holder.hasOwnProperty(name)) {
          field_holder[name] = {
            get: create_java_getter(name),
            configurable: true
          };
        }
      }
    }
    Object.defineProperties(JavaAdapter, static_properties);
    Object.defineProperties(JavaAdapter.prototype, instance_properties);

    return JavaAdapter;
  };

  // adapt_timer.log('Init');

  return adapt;
};
