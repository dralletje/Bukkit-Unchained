// @ts-ignore
let WeakIdentityHashMap = Java_type("eu.dral.unchained.WeakIdentityHashMap");

// extends WeakMap<
//   Key,
//   Value
// >
export class JavaWeakMap<Key extends object, Value> {
  java_map: any;

  constructor() {
    // super();
    this.java_map = new WeakIdentityHashMap();
  }
  clear() {
    return this.java_map.clear();
  }
  delete(key: Key) {
    return this.java_map.remove(key);
  }
  get(key: Key) {
    return this.java_map.get(key);
  }
  has(key: Key): boolean {
    return this.java_map.containsKey(key);
  }
  set(key: Key, value: Value): this {
    this.java_map.put(key, value);
    return this;
  }
}
