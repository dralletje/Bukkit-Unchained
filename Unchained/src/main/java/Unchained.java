package eu.dral.unchained;

import org.graalvm.polyglot.Value;

import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.HashMap;
import java.util.Map;
import java.util.*;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
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
      if (!getDataFolder().exists()) {
        getDataFolder().mkdir();
      }

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
        return this.getJavascriptBridge().invokeJavascriptBridge(method, args);
      } catch (Exception e) {
        e.printStackTrace();
        return null;
      }
    }

    private RecursiveContext getJavascriptBridge() {
      if (this.javascript_bridge == null) {
        this.javascript_bridge = new RecursiveContext();
      }
      return this.javascript_bridge;
    }
}
