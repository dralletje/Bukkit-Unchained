let ChatColor = Java.type('net.md_5.bungee.api.ChatColor');
let ClickEvent = Java.type('net.md_5.bungee.api.chat.ClickEvent');
let ComponentBuilder = Java.type('net.md_5.bungee.api.chat.ComponentBuilder');
let HoverEvent = Java.type('net.md_5.bungee.api.chat.HoverEvent');

// NOTE: SHOW_ENTITY is completely useless

export let chat = (strings, ...components) => {
  let builder = new ComponentBuilder("");

  for (let string of strings) {
    console.log(`string:`, string)
    builder.reset().append(string, ComponentBuilder.FormatRetention.NONE);

    let component = components.shift();
    console.log(`component:`, component)
    if (component != null) {
      builder.reset().append(component, ComponentBuilder.FormatRetention.NONE);
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
      builder.reset().append(component, ComponentBuilder.FormatRetention.NONE);
    }
    return builder;
  }
}

chat.open_url = (url, components) => {
  let builder = get_builder(components);
  builder.event(new ClickEvent(ClickEvent.Action.OPEN_URL, url))
  return builder.create();
}

chat.run_command = (url, components) => {
  let builder = get_builder(components);
  builder.event(new ClickEvent(ClickEvent.Action.RUN_COMMAND, url))
  return builder.create();
}

chat.show_text = (text, components) => {
  let builder = get_builder(components);
  builder.event(new HoverEvent(HoverEvent.Action.SHOW_TEXT, get_builder(text).create()))
  return builder.create();
}

chat.flat = (components) => {
  let text = Java.from(components).map(x => x.toLegacyText()).join('');
  return text;
}

for (let color of ChatColor.values()) {
  let color_name = color.getName().toLowerCase();
  chat[color_name] = (components, ...possible_actual_components) => {
    if (Array.isArray(components) && Array.from(components).every(x => typeof x === 'string')) {
      // This should trigger when we use this color as a template function
      return chat[color_name](chat(components, ...possible_actual_components));
    }

    let builder = get_builder(components);
    builder.color(color)
    return builder.create();
  }
}

export default chat;
