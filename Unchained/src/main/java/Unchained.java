package eu.dral.unchained;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.Engine;

import org.reflections.*;
import org.reflections.util.*;
import  org.reflections.scanners.*;

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
    public static Reflections reflections;

    private Context context;

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
        this.getContext().close();
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
      // NOTE Use this to move entry.js and PluginBridge.js inside the .jar
      // Reader stream = new InputStreamReader(this.getResource("boot.js"));
      // Source source = Source.newBuilder("js", stream, "boot.js").build();
      if (this.javascript_bridge == null) {
        this.javascript_bridge = new RecursiveContext();
      }
      return this.javascript_bridge;
    }

    private Context getContext() {
        return this.javascript_bridge.getContext();
    }
}
