import chat from "./chatchatchat.js";

export { chat };

export let command_success = (command, message) => {
  return chat`${chat.dark_green(`${command}:`)} ${chat.gray(message)}`;
};
export let command_info = (command, message) => {
  return chat`${chat.aqua(`${command}:`)} ${chat.gray(message)}`;
};
export let command_error = (command, message) => {
  return chat`${chat.red(`${command}:`)} ${chat.gray(message)}`;
};

export let broadcast_action = (plugin, sender, message) => {
  let players = plugin.java.getServer().getOnlinePlayers();
  for (let player of players) {
    // if (player !== sender) {

      player.sendMessage(chat.flat(chat.gray(`* ${sender.getDisplayName()} ${message}`)));
    // }
  }
}
