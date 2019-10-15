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
    public static RecursiveContext javascript_bridge;

    @Override
    public void onEnable() {
      Unchained.self = this;
      this.javascript_bridge = new RecursiveContext();

      this.pluginBridge("onEnable");
    }

    @Override
    public void onDisable() {
        this.javascript_bridge.close();
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
      this.pluginBridge("onCommand", sender, command, label, args);
      return true;
    }

    private Value pluginBridge(String method, Object ... args) {
      try {
        return this.javascript_bridge.invokeJavascriptBridge(method, args);
      } catch (Exception e) {
        e.printStackTrace();
        return null;
      }
    }
}
