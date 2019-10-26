let ChatColor = Java.type('net.md_5.bungee.api.ChatColor');
// let ComponentBuilder = Java.type('net.md_5.bungee.api.chat.ComponentBuilder');
// let ClickEvent = Java.type('net.md_5.bungee.api.chat.ClickEvent');
// let HoverEvent = Java.type('net.md_5.bungee.api.chat.HoverEvent');

// NOTE: SHOW_ENTITY is completely useless


let componentize = (value) => {
  if (typeof value === 'string') {
    return {text: value };
  } else {
    return value;
  }
}

let chat = (strings, ...components) => {
  if (!Array.isArray(strings)) {
    return componentize(strings);
  }

  let extra = []

  for (let string of strings) {
    extra.push(componentize(string));

    let component = components.shift();
    if (component != null) {
      extra.push(componentize(component));
    }
  }

  return {
    text: '',
    extra: extra,
  }
}

chat.open_url = (url, component) => {
  return {
    text: '',
    clickEvent: { action: 'open_url', value: url },
    extra: [component],
  };
}

chat.run_command = (command, component) => {
  return {
    text: '',
    clickEvent: { action: 'run_command', value: command },
    extra: [component],
  };
}

chat.show_text = (text, component) => {
  return {
    text: '',
    hoverEvent: { action: 'show_text', value: text },
    extra: [component],
  };
}

let text_styles = [ChatColor.BOLD, ChatColor.UNDERLINE, ChatColor.STRIKETHROUGH, ChatColor.ITALIC, ChatColor.OBFUSCATED]

for (let color of ChatColor.values()) {
  let color_name = color.getName().toLowerCase();
  chat[color_name] = (component, ...possible_actual_components) => {
    if (Array.isArray(component) && Array.from(component).every(x => typeof x === 'string')) {
      // This should trigger when we use this color as a template function
      return chat[color_name](chat(component, ...possible_actual_components));
    }

    if (text_styles.includes(color)) {
      return {
        text: '',
        [color.getName()]: true,
        extra: [component],
      };
    }

    return {
      text: '',
      color: color.getName(),
      extra: [component],
    };
  }
}

export default chat;
