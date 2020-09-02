/** @typedef {{ type: 'constructor', name: string, argumenttypes: string[] } | { type: 'field', name: string, typedef: string, isStatic: boolean } | { type: 'method', name: string, returntype: string, argumenttypes: string[], isStatic: boolean }} Property */
/** @typedef {{}} JavaType */
/** @typedef {{
 *   getFields(): { isPublic(): boolean, isStatic(): boolean, getName(): string, getType(): any }[]
 *   getMethods(): { isPublic(): boolean, isStatic(): boolean, getName(): string, getReturnType(): JavaType, getArgumentTypes(): JavaType[] }[]
 * }} JavaClass */

let Java = /** @type {{ from<T>(array: T[]): T[] }} */ (global.Java);

/**
 * @param {JavaClass} javaclass
 * @return {Array<Property>}
 * */

let { uniq } = require("lodash");

let get_all_properties = (javaclass) => {
  let fields = Java.from(javaclass.getFields())
    .filter((x) => x.getName() !== "constructor" && x.isPublic())
    .map((field) => {
      return /** @type {Property} */ ({
        type: "field",
        isStatic: field.isStatic(),
        name: field.getName(),
        typedef: parseType(field.getType()).name,
      });
    });

  let methods = Java.from(javaclass.getMethods())
    .filter((method) => !skipMethod(method))
    .map((method) => {
      if (method.getName() === "<init>") {
        return /** @type {Property} */ ({
          type: "constructor",
          name: method.getName(),
          argumenttypes: parseArguments(method.getArgumentTypes()),
        });
      } else {
        return /** @type {Property} */ ({
          type: "method",
          isStatic: method.isStatic(),
          name: method.getName(),
          argumenttypes: parseArguments(method.getArgumentTypes()),
          returntype: parseType(method.getReturnType()).name,
        });
      }
    });

  return /** @type {Property[]} */ ([...fields, ...methods]);
};

// public static boolean skipMethod(Method method) {
let skipMethod = (method) => {
  if (method.isPrivate()) {
    return true;
  }
  if (method.getName() === "<clinit>") {
    return true;
  }
  // if (method.getName() === "<init>") {
  //   return true;
  // }
  return false;
};

let get_JavaClass_name = (java_class_name) => {
  return java_class_name.replace(/\./g, "$");
};

class ParsedClass {
  constructor(classname) {
    this.clazz = repository.loadClass(classname);
    let clazz = this.clazz;

    classes.set(classname, this);

    for (var java_interface of clazz.getAllInterfaces()) {
      parseClass(java_interface.getClassName());
      // System.out.println("  INTERFACE: " + java_interface.getClassName());
    }
    for (var method of clazz.getMethods()) {
      if (skipMethod(method)) {
        continue;
      }
      parseType(method.getReturnType());
      for (var argument of method.getArgumentTypes()) {
        parseType(argument);
      }
    }
    for (var field of clazz.getFields()) {
      // parseClass(field.getType().getClassName());
      // System.out.println("  FIELD: " + field.getName());
      parseType(field.getType());
    }
  }

  getName() {
    return get_JavaClass_name(this.clazz.getClassName());
  }

  toString() {
    let clazz = this.clazz;

    let interfaces = Array.from(clazz.getInterfaceNames())
      .map((interface_name) => parseClass(interface_name).name)
      .filter((type) => !type.startsWith("any"))
      .map((x) => `$${x}`);

    /** @type {{ [key: Property['type']]: string }} */
    let interface_property_mapper = {
      constructor: (constructor) => {
        return ``;
      },
      field: (field) => {
        // prettier-ignore
        return `${field.isStatic ? "static" : ""} ${field.name}: ${field.typedef}`;
      },
      method: (method) => {
        // prettier-ignore
        return `${method.isStatic ? "static" : ""} ${method.name} (${method.argumenttypes}): ${method.returntype};`;
      },
    };

    /** @type {{ [key: Property['type']]: string }} */
    let class_property_mapper = {
      constructor: (constructor) => {
        // prettier-ignore
        return `constructor(${constructor.argumenttypes});`;
      },
      field: (field) => {
        // prettier-ignore
        return `${field.isStatic ? "static" : ""} ${field.name}: ${field.typedef}`;
      },
      method: (method) => {
        // prettier-ignore
        return `${method.isStatic ? "static" : ""} ${method.name} (${method.argumenttypes}): ${method.returntype};`;
      },
    };

    let properties = get_all_properties(clazz);
    let interface_or_abstract_class =
      interfaces.length === 0 ? "abstract class" : "interface";

    let all_properties;

    try {
      let interfaces_properties = Array.from(clazz.getAllInterfaces())
        .filter((x) => classes.has(x.getClassName()))
        .flatMap(
          (interface_clazz) => get_all_properties(interface_clazz) || []
        );
      all_properties = [
        ...get_all_properties(clazz),
        ...interfaces_properties,
      ].filter(Boolean);
    } catch (error) {
      all_properties = get_all_properties(clazz);
    }

    // prettier-ignore
    return `
      declare interface $${this.getName()} ${interfaces.length > 0 ? `extends ${interfaces.join(', ')}` : ''}  {
        ${properties.filter(x => !x.isStatic).map(property => interface_property_mapper[property.type](property)).join("\n")}
      }

      declare class ${this.getName()} implements $${this.getName()}  {
        ${uniq(all_properties.map(property => class_property_mapper[property.type](property))).join("\n") || ""}
      }
    `;
  }
}

let parseArguments = (argumentTypes) => {
  return Java.from(argumentTypes)
    .map((argument, index) => `arg${index}: ${parseType(argument).name}`)
    .join(", ");
};

let classes = new Map(); // new Map<String,ParsedClass>();
let pre_existing = {
  byte: "Buffer",
  int: "number",
  long: "number",
  float: "number",
  double: "number",
  boolean: "boolean",
  void: "void",
  char: "string",
  "java.lang.String": "string",

  "java.lang.Object": "any",
};

let ReferenceType = Java.type("org.apache.bcel.generic.ReferenceType");
let BasicType = Java.type("org.apache.bcel.generic.BasicType");
let ArrayType = Java.type("org.apache.bcel.generic.ArrayType");

let parseType = (type) => {
  if (type instanceof ArrayType) {
    return {
      name: `JavaArray<${parseClass(type.getBasicType().toString()).name}>`,
    };
  }
  if (type instanceof ReferenceType) {
    return parseClass(type.toString());
  } else if (type instanceof BasicType) {
    return parseClass(type.toString());
  } else {
    return { name: `any /* parseType: ${type.toString()} */` };
  }
};

let parseClass = (classname) => {
  if (classname.endsWith("[]")) {
    throw new Error("Array");
    // return parseArray(classname);
  }

  if (pre_existing[classname]) {
    return { name: pre_existing[classname] };
  }
  let allowed_java_classes = ["java.util.Collection"];
  if (
    classname.startsWith("java.") &&
    !allowed_java_classes.includes(classname)
  ) {
    return { name: `any /* ${classname} */` };
  }

  if (classes.has(classname)) {
    return {
      name: get_JavaClass_name(classname),
    };
  }

  try {
    var newclazz = new ParsedClass(classname);
    return {
      name: get_JavaClass_name(newclazz.getClassName()),
    };
  } catch (error) {
    return { name: "unknown" };
  }
};

let ClassPath = Java.type("org.apache.bcel.util.ClassPath");
let ClassPathRepository = Java.type("org.apache.bcel.util.ClassPathRepository");

let folder =
  "/Users/michieldral/.m2/repository/com/destroystokyo/paper/paper-api/1.15.2-R0.1-SNAPSHOT/paper-api-1.15.2-R0.1-SNAPSHOT/";
let classpath = new ClassPath(folder);
let repository = new ClassPathRepository(classpath);

let glob = require("glob");

for (let file of glob.sync("**/*.class", {
  cwd: folder,
})) {
  let classname_maybe = file.replace(/\//g, ".").replace(/\.class$/, "");
  parseClass(classname_maybe);
}

// parseClass("org.bukkit.Bukkit");

let prettier = require("prettier");
let { highlight } = require("cli-highlight");
const { types } = require("util");

let pretty = (code) => {
  let prettified = prettier.format(code, {
    parser: "typescript",
  });
  return prettified;
  // return highlight(prettified, { language: "typescript", ignoreIllegals: true });
  // return code;
};

for (let clazz of classes.values()) {
  console.log(pretty(clazz.toString()));
  console.log();
}

console.log(
  pretty(`
declare type JavaArray<Element> = {
  isJavaArray: true,
}

declare let Java: {
  from<T>(array: JavaArray<T>): T[];

  ${[...classes.entries()]
    .map(
      ([classname, clazz]) =>
        // prettier-ignore
        `type(classname: "${classname}"): typeof ${get_JavaClass_name(clazz.clazz.getClassName())};\n`
    )
    .join("")}
}
`)
);
