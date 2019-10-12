let ChatColor = Java.type('net.md_5.bungee.api.ChatColor');
let ClickEvent = Java.type('net.md_5.bungee.api.chat.ClickEvent');
let ComponentBuilder = Java.type('net.md_5.bungee.api.chat.ComponentBuilder');
let HoverEvent = Java.type('net.md_5.bungee.api.chat.HoverEvent');

// NOTE: SHOW_ENTITY is completely useless

export let chat = (strings, ...components) => {
  let builder = new ComponentBuilder("");

  for (let string of strings) {
    builder.append(string);

    let component = components.shift();
    if (component != null) {
      builder.append(component);
    }
  }

  return builder.create();
}

let get_builder = (components) => {
  if (typeof components === 'string') {
    return new ComponentBuilder(components);
  } else {
    let builder = new ComponentBuilder("")
    for (let component of components) {
      builder.append(component);
    }
    return builder;
  }
}

chat.open_url = (url, components) => {
  let builder = get_builder(components);
  builder.event(new ClickEvent(ClickEvent.Action.OPEN_URL, url))
  return builder.create();
}

chat.show_text = (text, components) => {
  let builder = get_builder(components);
  builder.event(new HoverEvent(HoverEvent.Action.SHOW_TEXT, get_builder(text).create()))
  return builder.create();
}

for (let color of ChatColor.values()) {
  chat[color.getName().toLowerCase()] = (components) => {
    let builder = get_builder(components);
    builder.color(color)
    return builder.create();
  }
}
