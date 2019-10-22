let ChatColor = Java.type("org.bukkit.ChatColor");

let start_timer = label => {
  let initial_time = Date.now();
  let last_time = Date.now();

  return {
    log: message => {
      let seconds_spent = (Date.now() - last_time) / 1000;
      let color = seconds_spent < 0.8 ? ChatColor.GREEN : ChatColor.RED;
      last_time = Date.now();
      console.log(label, message, `took ${color}${seconds_spent.toFixed(3)}s`);
    },
    end: () => {
      let seconds_spent = (Date.now() - initial_time) / 1000;
      let color = seconds_spent < 1 ? ChatColor.GREEN : ChatColor.RED;
      // prettier-ignore
      console.log(label, `Completed!, spent ${color}${seconds_spent.toFixed(3)}s ${ChatColor.RESET}in total`);
    }
  };
};
