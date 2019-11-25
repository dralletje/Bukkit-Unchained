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

let apply_styles = (styles, component, ...possible_actual_components) => {
  if (Array.isArray(component) && Array.from(component).every(x => typeof x === 'string')) {
    // This should trigger when we use this color as a template function
    return apply_styles(styles, chat(component, ...possible_actual_components));
  }

  let result = {
    text: '',
    extra: [component],
  };

  // Actually apply the styles after this
  for (let style of styles) {
    if (text_styles.includes(style)) {
      result[style.getName()] = true;
    } else {
      result.color = style.getName();
    }
  }
  return result;
}

let add_style_selectors = (receiver, styles = []) => {
  for (let style of ChatColor.values()) {
    let style_name = style.getName().toLowerCase();

    Object.defineProperty(receiver, style_name, {
      get: () => {
        let apply = (...components) => apply_styles([...styles, style], ...components);
        add_style_selectors(apply, [...styles, style]);
        return apply;
      },
    })
  }
}

add_style_selectors(chat);

export default chat;
