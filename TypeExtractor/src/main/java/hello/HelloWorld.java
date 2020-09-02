package hello;

import org.joda.time.LocalTime;

import java.util.HashMap;

import org.apache.bcel.*;
import org.apache.bcel.classfile.ClassParser;
import org.apache.bcel.classfile.JavaClass;
import org.apache.bcel.util.*;
import org.apache.bcel.util.ClassPathRepository;
import org.apache.bcel.generic.*;
import org.apache.bcel.classfile.*;

public class HelloWorld {
	static class ParsedClass {
		public static boolean skipMethod(Method method) {
			if (method.isPrivate()) {
				return true;
			} 
			// if (method.getName().equals("new")) {
			// 	return true;
			// }
			if (method.getName().equals("<clinit>")) {
				return true;
			}
			return false;
		}

		JavaClass clazz;
		public ParsedClass(String classname) throws Exception {
			this.clazz = repository.loadClass(classname);

			HelloWorld.classes.put(classname, this);
			
			for (var java_interface : clazz.getAllInterfaces()) {
				HelloWorld.parseClass(java_interface.getClassName());
				// System.out.println("  INTERFACE: " + java_interface.getClassName());
			}
			for (var method : clazz.getMethods()) {
				if (ParsedClass.skipMethod(method)) {
					continue;
				}
				HelloWorld.parseType(method.getReturnType());
				for (var argument : method.getArgumentTypes()) {
					HelloWorld.parseType(argument);
				}
			}
			for (var field : clazz.getFields()) {
				// HelloWorld.parseClass(field.getType().getClassName());
				// System.out.println("  FIELD: " + field.getName());
				HelloWorld.parseType(field.getType());
			}
		}

		public String getName() {
			return clazz.getClassName().replace('.', '$');
		}

		public String toString() {
			var result = new StringBuilder();
			result.append("interface " + this.getName() + " {\n");
			for (var field : clazz.getFields()) {
				result.append("  " + field.getName() + ": " + HelloWorld.parseType(field.getType()) + ";\n");
			}
			for (var method : clazz.getMethods()) {
				if (ParsedClass.skipMethod(method)) {
					continue;
				}
				result.append("  " + method.getName() + "(");

				var index = 1;
				for (var argument : method.getArgumentTypes()) {
					result.append("arg" + index + ": " + HelloWorld.parseType(argument));
					if (index < method.getArgumentTypes().length) {
						result.append(", ");
					}
					index++;
				}
				result.append(") => " + HelloWorld.parseType(method.getReturnType())+";\n");
			}
			result.append("}");
			return result.toString();
		}
	}

	public static ClassPath classpath = new ClassPath("/Users/michieldral/.m2/repository/com/destroystokyo/paper/paper-api/1.15.2-R0.1-SNAPSHOT/paper-api-1.15.2-R0.1-SNAPSHOT/");
	public static ClassPathRepository repository = new ClassPathRepository(classpath);
	
	public static HashMap<String,ParsedClass> classes = new HashMap<String,ParsedClass>();
	public static HashMap<String,String> pre_existing = new HashMap<String,String>();
	static {
		pre_existing.put("byte", "Buffer");
		pre_existing.put("int", "number");
		pre_existing.put("long", "number");
		pre_existing.put("float", "number");
		pre_existing.put("double", "number");
		pre_existing.put("boolean", "boolean");
		pre_existing.put("void", "void");
		pre_existing.put("char", "string");
		pre_existing.put("java.lang.String", "string");
	}

	public static String parseType(Type type) {
		if (type instanceof ReferenceType) {
			return HelloWorld.parseClass(type.toString());
		} else if (type instanceof BasicType) {
			// System.out.println("  TYPE: " + (field.getType() instanceof BasicType));
			return HelloWorld.parseClass(type.toString());
		} else {
			return "any";
			// throw new Exception("Type unknown");
		}
	}

	public static String parseArray(String classwitharrayname) {
		if (!classwitharrayname.endsWith("[]")) {
			return "any";
		}
		var classname = classwitharrayname.substring(0, classwitharrayname.length()-2);
		var typescriptClassname = HelloWorld.parseClass(classname);
		return typescriptClassname + "[]";
	}
	public static String parseClass(String classname) {
		
		if (classname.endsWith("[]")) {
			classname = classname.substring(0, classname.length()-2);
		}
		
		if (HelloWorld.pre_existing.containsKey(classname)) {
			return HelloWorld.pre_existing.get(classname);
		}
		if (classname.startsWith("java.")) {
			return "any";
		}
			
		if (HelloWorld.classes.containsKey(classname)) {
			return classname;
		}
		var clazz = HelloWorld.classes.get(classname);
		if (clazz != null) {
			return classname;
		}

		try {
			var newclazz = new ParsedClass(classname);
			return newclazz.getName();
		} catch (Exception error) {
			return "unknown";
		}
	}
	
	public static void main(String[] args) {
		try {
			HelloWorld.parseClass("org.bukkit.Bukkit");
			// var parser = new ClassParser("/Users/michieldral/.m2/repository/com/destroystokyo/paper/paper-api/1.15.2-R0.1-SNAPSHOT/paper-api-1.15.2-R0.1-SNAPSHOT/org/bukkit/entity/Entity.class").parse();
			// System.out.println("The current local time is: " + parser.getAllInterfaces());
			for (var clazz : HelloWorld.classes.values()) {
				System.out.println(clazz.toString());
			}
		} catch (Exception error) {
			error.printStackTrace();
		}
  }
}