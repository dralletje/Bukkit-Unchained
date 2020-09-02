declare interface Parent1Interface {
  // [Symbol.hasInstance]: () => boolean
  parent1(): boolean;
}
declare interface Parent2Interface {
  // [Symbol.hasInstance]: () => boolean
  parent2(): boolean;
}

declare class Parent2Class implements Parent2Interface {
  parent2(): boolean;
}

declare interface Child1Interface extends Parent1Interface, Parent2Interface {}

declare class Child1 implements Child1Interface {
  parent1(): boolean;
  parent2(): boolean;
}

declare namespace org {
  namespace bukkit {
    class Bukkit {}
  }
}

let fn = (test: Parent2Class) => {};

let child1 = new Parent2Class();
child1;
if (child1 instanceof Child1) {
  fn(child1);
  child1;
}
