package eu.dral.unchained;

import org.graalvm.polyglot.Value;

import java.util.*;

import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.event.Event;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.plugin.EventExecutor;
import org.bukkit.plugin.java.JavaPlugin;

public class Unchained extends JavaPlugin implements Listener {
    public static Unchained self;
    public static WorkerContext javascript_context;

    @Override
    public void onEnable() {
      Unchained.self = this;
      this.javascript_context = new WorkerContext("./" + getDataFolder().toString() + "/dist/UnchainedMain.js", this);
      this.javascript_context.getExports().execute("onEnable");
    }

    @Override
    public void onDisable() {
        this.javascript_context.close();
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
      this.javascript_context.getExports().execute("onCommand", sender, command, label, args);
      return true;
    }
}
