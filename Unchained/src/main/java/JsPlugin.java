package eu.dral.unchained;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.Arrays;

import org.bukkit.Server;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.PluginCommand;
// import org.bukkit.configuration.InvalidConfigurationException;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.generator.ChunkGenerator;
import org.bukkit.plugin.PluginBase;
import org.bukkit.plugin.PluginDescriptionFile;
import org.bukkit.plugin.PluginLoader;
import org.bukkit.plugin.PluginLogger;

import org.graalvm.polyglot.Value;

/**
 * Represents a Java plugin
 */
public class JsPlugin extends PluginBase {
    private boolean isEnabled = false;
    private PluginLoader loader = null;
    private Server server = null;
    private File file = null;
    private PluginDescriptionFile description = null;
    private File dataFolder = null;
    private boolean naggable = true;
    private FileConfiguration newConfig = null;
    private PluginLogger logger = null;

    private WorkerContext context = null;

    public JsPlugin() {}

    @Deprecated
    public JsPlugin(final PluginLoader loader, final Server server, final PluginDescriptionFile description, final File dataFolder, final File file) {
        init(loader, server, description, dataFolder, file);
    }

    public JsPlugin(final JsPluginLoader loader, final PluginDescriptionFile description, final File dataFolder, final File file) {
        init(loader, loader.server, description, dataFolder, file);
    }


    /* Some getters */
    @Override
    public final File getDataFolder() {
        return dataFolder;
    }
    @Override
    public final PluginLoader getPluginLoader() {
        return loader;
    }
    @Override
    public final Server getServer() {
        return server;
    }
    @Override
    public final boolean isEnabled() {
        return isEnabled;
    }
    protected File getFile() {
        return file;
    }
    @Override
    public final PluginDescriptionFile getDescription() {
        return description;
    }
    @Override
    public FileConfiguration getConfig() {
        if (newConfig == null) {
            reloadConfig();
        }
        return newConfig;
    }

    /**
     * Provides a reader for a text file located inside the jar. The behavior
     * of this method adheres to {@link PluginAwareness.Flags#UTF8}, or if not
     * defined, uses UTF8 if {@link FileConfiguration#UTF8_OVERRIDE} is
     * specified, or system default otherwise.
     *
     * @param file the filename of the resource to load
     * @return null if {@link #getResource(String)} returns null
     * @throws IllegalArgumentException if file is null
     * @see ClassLoader#getResourceAsStream(String)
     */
    @SuppressWarnings("deprecation")
    protected final Reader getTextResource(String file) {
        // final InputStream in = getResource(file);
        return null;
        // return in == null ? null : new InputStreamReader(in, isStrictlyUTF8() || FileConfiguration.UTF8_OVERRIDE ? Charsets.UTF_8 : Charset.defaultCharset());
    }

    /**
     * Sets the enabled state of this plugin
     *
     * @param enabled true if enabled, otherwise false
     */
    protected final void setEnabled(final boolean enabled) {
        if (isEnabled != enabled) {
            isEnabled = enabled;

            if (isEnabled) {
                onEnable();
            } else {
                onDisable();
            }
        }
    }

    final void init(PluginLoader loader, Server server, PluginDescriptionFile description, File dataFolder, File file) {
        this.loader = loader;
        this.server = server;
        this.file = file;
        this.description = description;
        this.dataFolder = dataFolder;
        // this.classLoader = classLoader;
        this.logger = new PluginLogger(this);

        try {
          this.context = new WorkerContext(description.getMain(), this);
        } catch (Exception error) {}
    }

    /**
     * Gets the initialization status of this plugin
     *
     * @return true if this plugin is initialized, otherwise false
     * @deprecated This method cannot return false, as {@link
     *     JsPlugin} is now initialized in the constructor.
     */
    @Deprecated
    public final boolean isInitialized() {
        return true;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
      return this.context.getExports().getMember("onCommand").execute(sender, command, label, args).as(Boolean.class);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
      return this.context.getExports().getMember("onTabComplete").execute(sender, command, alias, args).as(List.class);
    }

    /**
     * Gets the command with the given name, specific to this plugin. Commands
     * need to be registered in the {@link PluginDescriptionFile#getCommands()
     * PluginDescriptionFile} to exist at runtime.
     *
     * @param name name or alias of the command
     * @return the plugin command if found, otherwise null
     */
    public PluginCommand getCommand(String name) {
        String alias = name.toLowerCase();
        PluginCommand command = getServer().getPluginCommand(alias);

        if (command == null || command.getPlugin() != this) {
            command = getServer().getPluginCommand(description.getName().toLowerCase() + ":" + alias);
        }

        if (command != null && command.getPlugin() == this) {
            return command;
        } else {
            return null;
        }
    }

    @Override
    public void onLoad() {}

    @SuppressWarnings("deprecation")
    @Override
    public void reloadConfig() {}

    @Override
    public void saveResource(String resourcePath, boolean replace) {}

    @Override
    public void saveDefaultConfig() {}

    @Override
    public void saveConfig() {}

    @Override
    public InputStream getResource(String filename) { return null; }

    @Override
    public void onDisable() {
      try {
        this.context.getExports().getMember("onDisable").execute();
      } catch (Exception e) {
        e.printStackTrace();
      }
      this.context.close();
    }

    @Override
    public void onEnable() {
      this.context.getExports().getMember("onEnable").execute();
    }

    @Override
    public ChunkGenerator getDefaultWorldGenerator(String worldName, String id) {
        try {
          WorkerContext context = new WorkerContext(description.getMain(), this);
          ChunkGenerator result = context.getExports().getMember("getDefaultWorldGenerator").execute(worldName, id).as(ChunkGenerator.class);
          if (result == null) {
            context.close();
          }
          return result;
        } catch (Exception error) {
          error.printStackTrace();
          return null;
        }
    }

    @Override
    public final boolean isNaggable() {
        return naggable;
    }

    @Override
    public final void setNaggable(boolean canNag) {
        this.naggable = canNag;
    }

    @Override
    public final Logger getLogger() {
        return logger;
    }

    @Override
    public String toString() {
        return description.getFullName();
    }
}
