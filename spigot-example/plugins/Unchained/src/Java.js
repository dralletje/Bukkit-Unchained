export let Reflection = {
  get_private_field: (instance, field_name) => {
    let field = instance.getClass().getDeclaredField(field_name);
    field.setAccessible(true);
    return field.get(instance);
  },
  get_private_method: (instance, method_name, ...args) => {
    let method = instance.getClass().getDeclaredMethod(method_name, ...args);
    method.setAccessible(true);
    return (...args) => method.invoke(instance, ...args);
  }
}
