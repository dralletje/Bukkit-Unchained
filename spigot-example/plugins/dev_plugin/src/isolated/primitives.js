let PlayerEntity = Java.type("org.bukkit.entity.Player");
let ChatColor = Java.type('org.bukkit.ChatColor')

let WeakHashMap = Java.type('java.util.WeakHashMap');

let start_timer = (label) => {
  let initial_time = Date.now();
  let last_time = Date.now();

  return {
    log: (message) => {
      let seconds_spent = (Date.now() - last_time) / 1000;
      let color = seconds_spent < 0.8 ? ChatColor.GREEN : ChatColor.RED
      last_time = Date.now();
      console.log(label, message, `took ${color}${(seconds_spent.toFixed(3))}s`);
    },
    end: () => {
      let seconds_spent = (Date.now() - initial_time) / 1000;
      let color = seconds_spent < 1 ? ChatColor.GREEN : ChatColor.RED
      console.log(label, `Completed!, spent ${color}${seconds_spent.toFixed(3)}s ${ChatColor.RESET}in total`);
    }
  }
}

let java_get_prototype_chain = function*(java_class) {
  let current_class = java_class.class || java_class;
  while (current_class != null) {
    yield current_class;
    if (current_class.isEnum && current_class.isEnum()) return;

    // for (let implementing_class of current_class.getInterfaces()) {
    //   yield* java_get_prototype_chain(implementing_class);
    // }
    if (current_class.getGenericSuperclass == null) {
      console.warn(`current_class:`, current_class.getClass().getName())
    }
    current_class = current_class.getGenericSuperclass();
  }
};

let get_all_interfaces = function*(java_class) {
  for (let java_interface of java_class.getInterfaces()) {
    yield java_interface;
    yield* get_all_interfaces(java_interface);
  }
};

let get_all_constructors = function*(object) {
  let constructor = object.constructor;
  while (constructor !== Function.prototype) {
    yield constructor;
    constructor = Object.getPrototypeOf(constructor)
  }
}

let get_class = c => c.class || c;

let return_if_player = possible_player => {
  return possible_player instanceof PlayerEntity ? [possible_player] : [];
};

let AllowedClasses = [
  // REMOVE
  {
    java_class: Java.type("org.bukkit.Server")
  },

  { java_class: Java.type("org.bukkit.inventory.Merchant") },
  {
    java_class: Java.type("org.bukkit.inventory.Inventory"),
    get_location: inventory => [inventory.getLocation()],
    get_players: inventory => return_if_player(inventory.getHolder())
  },
  {
    java_class: Java.type('org.bukkit.inventory.InventoryHolder'),
    get_players: (holder) => return_if_player(holder),
  },
  { java_class: Java.type('org.bukkit.attribute.AttributeModifier') },
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
    java_class: Java.type("org.bukkit.entity.HumanEntity"),
    get_locations: () => [],
    get_players: () => []
  },
  {
    java_class: Java.type("org.bukkit.entity.Entity"),
    get_locations: entity => [entity.getLocation()]
  },
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
    get_locations: event => [event.getTo(), event.getFrom()],
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
    get_locations: location => [location],
    get_players: () => []
  },
  { java_class: Java.type("org.bukkit.World") },
  { java_class: Java.type("org.bukkit.block.Block") },
  { java_class: Java.type("org.bukkit.Material") },
  { java_class: Java.type("org.bukkit.GameMode") },
  { java_class: Java.type("org.bukkit.block.BlockFace") },
  { java_class: Java.type("org.bukkit.Particle") },
  { java_class: Java.type("org.bukkit.entity.EntityType") },
  { java_class: Java.type("org.bukkit.block.Biome") },
  { java_class: Java.type("org.bukkit.Color") },
  { java_class: Java.type("org.bukkit.DyeColor") },
  { java_class: Java.type("org.bukkit.block.banner.PatternType") },
  // { java_class: Java.type("org.bukkit.Tag") },
  { java_class: Java.type("org.bukkit.block.banner.Pattern") },
  { java_class: Java.type('org.bukkit.WeatherType') },
  { java_class: Java.type('org.bukkit.ChatColor') },
  { java_class: Java.type('org.bukkit.inventory.EquipmentSlot') },
  { java_class: Java.type('org.bukkit.event.block.Action') },

  { java_class: Java.type('org.bukkit.NamespacedKey') },
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

for (let event_class of event_classes) {
  let name = event_class.getName();
  let match = name.match(/org\.bukkit\.event\.(.*)\.(.*)Event/);
  if (match == null) {
    continue;
  }

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

  let java_to_js_identity = new WeakHashMap();
  let js_to_java_object = new WeakMap();
  let js_to_java_class = new WeakMap();

  class JavaObject {
    static java_name = "java.lang.Object";
    constructor(java_object) {
      js_to_java_object.set(this, java_object);
    }
  }
  js_to_java_class.set(JavaObject, { get_locations: () => [], get_players: () => [], java_class: null });


  let adapted_classes = {};
  let adapt = {
    classes: adapted_classes,
    validate: value => {
      let java_value = js_to_java_object.get(value);
      for (let constructor of get_all_constructors(value)) {
        let class_description = js_to_java_class.get(constructor);
        if (class_description == null) {
          console.error(`constructor:`, constructor.name);
          throw new Error('No class description found');
        }
        let { get_locations, get_players, java_class } = class_description;

        for (let location of get_locations(java_value)) {
          if (!filters.location(location)) {
            // prettier-ignore
            throw new Error(`Object not in range of your plot`);
          }
        }
        for (let player of get_players(java_value)) {
          if (!filters.player(player)) {
            // prettier-ignore
            throw new Error(`Object contains a player not currently on your plot`);
          }
        }
      }
    },
    get_class: (class_name) => {
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
      if (java_to_js_identity.get(value)) {
        return java_to_js_identity.get(value);
      }

      if (value instanceof Java.type("java.util.List")) {
        return Array.from(value)
          .map(x => {
            try {
              return adapt.from_java(x);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
      }
      if (Java.isJavaObject(value)) {
        if (value.getClass().isEnum()) {
          let EnumClass = adapt.get_class(value.getClass().getName());
          let enum_value = EnumClass[value.name()] || new EnumClass(value);
          return enum_value;
        }

        let java_class = value.getClass();
        let java_class_names = [
          ...(java_class.getInterfaces().length === 1
            ? Array.from(
                java_get_prototype_chain(java_class.getInterfaces()[0])
              )
            : []),
          ...Array.from(java_get_prototype_chain(java_class))
        ].map(x => x.getName());

        let JavaAdapter = java_class_names
          .map(x => {
            try {
              return adapt.get_class(x);
            } catch (err) {
              return null;
            }
          })
          .find(Boolean);

        if (JavaAdapter == null) {
          // prettier-ignore
          throw new Error(`No adapter found for java class "${java_class_names.join('", "')}"`);
        }

        let js_value = new JavaAdapter(value);
        java_to_js_identity.put(value, js_value);
        return js_value;
      } else {
        return value;
      }
    },
    to_java: value => {
      if (typeof value === "object" && value != null) {
        if (value.type === "$enum") {
          return Java.type(value.class).valueOf(value.value);
        } else {
          if (js_to_java_object.get(value)) {
            adapt.validate(value);
            return js_to_java_object.get(value)
          } else {
            return value;
          }
        }
      } else {
        return value;
      }
    }
  };

  let adapt_class = ({
    java_class,
    get_locations = () => [],
    get_players = () => [],
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
      static java_name = java_class_name;

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
    }

    Object.defineProperty (JavaAdapter, 'name', { value: java_class_name });
    js_to_java_class.set(JavaAdapter, { get_locations, get_players, java_class });
    adapted_classes[java_class_name] = JavaAdapter;

    let create_java_method = (name) => {
      return function(...args) {
        let java_args = args.map(arg => adapt.to_java(arg));
        let java_return = js_to_java_object.get(this)[name](...java_args);
        return adapt.from_java(java_return);
      };
    };

    let create_java_getter = (name) => {
      return function() {
        let java_return = js_to_java_object.get(this)[name];
        return adapt.from_java(java_return);
      };
    };

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
        let is_static = Modifier.isStatic(
          field.getModifiers()
        );
        let is_final = Modifier.isFinal(field.getModifiers());
        let field_holder = is_static ? static_properties : instance_properties;

        let name = field.getName();
        if (is_static && is_final) {
          let enum_value = adapt.from_java(java_class[name]);
          field_holder[name] = {
            value: enum_value,
            writable: false,
            configurable: false
          };
        } else if (!field_holder.hasOwnProperty(name)) {
          field_holder[name] = {
            get: create_java_getter(name),
            configurable: false
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
