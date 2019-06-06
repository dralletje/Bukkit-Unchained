package eu.dral.unchained;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Reader;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.Arrays;

import org.apache.commons.lang.Validate;
import org.bukkit.Server;
import org.bukkit.Warning.WarningState;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.PluginCommand;
import org.bukkit.configuration.InvalidConfigurationException;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.generator.ChunkGenerator;
import org.bukkit.plugin.AuthorNagException;
import org.bukkit.plugin.PluginAwareness;
import org.bukkit.plugin.PluginBase;
import org.bukkit.plugin.PluginDescriptionFile;
import org.bukkit.plugin.PluginLoader;
import org.bukkit.plugin.PluginLogger;

import com.google.common.base.Charsets;
import com.google.common.io.ByteStreams;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;

import org.reflections.*;

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
    private File configFile = null;
    private PluginLogger logger = null;

    private Context context = null;
    private Value executor = null;

    public JsPlugin() {}

    @Deprecated
    public JsPlugin(final PluginLoader loader, final Server server, final PluginDescriptionFile description, final File dataFolder, final File file) {
        init(loader, server, description, dataFolder, file);
    }

    public JsPlugin(final JsPluginLoader loader, final PluginDescriptionFile description, final File dataFolder, final File file) {
        init(loader, loader.server, description, dataFolder, file);
    }

    public void setExecutor(Value executor) {
      // this.executor = executor;
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

    @SuppressWarnings("deprecation")
    @Override
    public void reloadConfig() {
        // newConfig = YamlConfiguration.loadConfiguration(configFile);
        //
        // final InputStream defConfigStream = getResource("config.yml");
        // if (defConfigStream == null) {
        //     return;
        // }
        //
        // final YamlConfiguration defConfig;
        // if (isStrictlyUTF8() || FileConfiguration.UTF8_OVERRIDE) {
        //     defConfig = YamlConfiguration.loadConfiguration(new InputStreamReader(defConfigStream, Charsets.UTF_8));
        // } else {
        //     final byte[] contents;
        //     defConfig = new YamlConfiguration();
        //     try {
        //         contents = ByteStreams.toByteArray(defConfigStream);
        //     } catch (final IOException e) {
        //         getLogger().log(Level.SEVERE, "Unexpected failure reading config.yml", e);
        //         return;
        //     }
        //
        //     final String text = new String(contents, Charset.defaultCharset());
        //     if (!text.equals(new String(contents, Charsets.UTF_8))) {
        //         getLogger().warning("Default system encoding may have misread config.yml from plugin jar");
        //     }
        //
        //     try {
        //         defConfig.loadFromString(text);
        //     } catch (final InvalidConfigurationException e) {
        //         getLogger().log(Level.SEVERE, "Cannot load configuration from jar", e);
        //     }
        // }
        //
        // newConfig.setDefaults(defConfig);
    }

    @Override
    public void saveConfig() {
        try {
            getConfig().save(configFile);
        } catch (IOException ex) {
            logger.log(Level.SEVERE, "Could not save config to " + configFile, ex);
        }
    }

    @Override
    public void saveDefaultConfig() {
        if (!configFile.exists()) {
            saveResource("config.yml", false);
        }
    }

    @Override
    public void saveResource(String resourcePath, boolean replace) {
        if (resourcePath == null || resourcePath.equals("")) {
            throw new IllegalArgumentException("ResourcePath cannot be null or empty");
        }

        resourcePath = resourcePath.replace('\\', '/');
        InputStream in = getResource(resourcePath);
        if (in == null) {
            throw new IllegalArgumentException("The embedded resource '" + resourcePath + "' cannot be found in " + file);
        }

        File outFile = new File(dataFolder, resourcePath);
        int lastIndex = resourcePath.lastIndexOf('/');
        File outDir = new File(dataFolder, resourcePath.substring(0, lastIndex >= 0 ? lastIndex : 0));

        if (!outDir.exists()) {
            outDir.mkdirs();
        }

        try {
            if (!outFile.exists() || replace) {
                OutputStream out = new FileOutputStream(outFile);
                byte[] buf = new byte[1024];
                int len;
                while ((len = in.read(buf)) > 0) {
                    out.write(buf, 0, len);
                }
                out.close();
                in.close();
            } else {
                logger.log(Level.WARNING, "Could not save " + outFile.getName() + " to " + outFile + " because " + outFile.getName() + " already exists.");
            }
        } catch (IOException ex) {
            logger.log(Level.SEVERE, "Could not save " + outFile.getName() + " to " + outFile, ex);
        }
    }

    @Override
    public InputStream getResource(String filename) {
        // if (filename == null) {
        //     throw new IllegalArgumentException("Filename cannot be null");
        // }
        //
        // try {
        //     URL url = getClassLoader().getResource(filename);
        //
        //     if (url == null) {
        //         return null;
        //     }
        //
        //     URLConnection connection = url.openConnection();
        //     connection.setUseCaches(false);
        //     return connection.getInputStream();
        // } catch (IOException ex) {
        //     return null;
        // }
        return null;
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

    /**
     * @deprecated This method is legacy and will be removed - it must be
     *     replaced by the specially provided constructor(s).
     */
    @Deprecated
    protected final void initialize(PluginLoader loader, Server server, PluginDescriptionFile description, File dataFolder, File file) {
        if (server.getWarningState() == WarningState.OFF) {
            return;
        }
        getLogger().log(Level.WARNING, getClass().getName() + " is already initialized", server.getWarningState() == WarningState.DEFAULT ? null : new AuthorNagException("Explicit initialization"));
    }

    final void init(PluginLoader loader, Server server, PluginDescriptionFile description, File dataFolder, File file) {
        this.loader = loader;
        this.server = server;
        this.file = file;
        this.description = description;
        this.dataFolder = dataFolder;
        // this.classLoader = classLoader;
        this.configFile = new File(dataFolder, "config.yml");
        this.logger = new PluginLogger(this);

        this.getExecutor();
    }

    Value getExecutor() {
      if (this.executor != null) {
        return this.executor;
      }
      if (this.context == null) {
        // OutputStream plugin_out = new BufferedOutputStream()
        Context context = Context.newBuilder("js")
          // .out(plugin_out)
          .allowHostAccess(true)
          .allowAllAccess(true)
          .allowHostAccess(true)
          // .allowPolyglotAccess(true)
          // .allowExperimentalOptions(true)
          .option("js.polyglot-builtin", "true")
          .build();

        Reflections reflections = Unchained.reflections;
        context.getPolyglotBindings().putMember("reflections", reflections);

        context.getPolyglotBindings().putMember("plugin", this);
        context.getPolyglotBindings().putMember("server", this.getServer());
        context.getPolyglotBindings().putMember("cwd", System.getProperty("user.dir"));

        this.context = context;
      }

      try {
        Context polyglot = this.context;
        File file = new File(Unchained.self.getDataFolder(), "entry.js");
        Value entry_fn = polyglot.eval(Source.newBuilder("js", file).build());
        Value executor = entry_fn.execute("load_plugin_from_javaplugin", Arrays.asList(this));
        this.executor = executor;
        return executor;
      } catch (Exception e) {
        // sender.sendMessage(e.getMessage());
        e.printStackTrace();
        return null;
      }


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
      if (this.getExecutor() != null) {
        return this.getExecutor().execute("onCommand", sender, command, label, args).as(Boolean.class);
      }
      return false;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
      if (this.getExecutor() != null) {
        return this.getExecutor().execute("onTabComplete", sender, command, alias, args).as(List.class);
      } else {
        return null;
      }
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

    @Override
    public void onDisable() {
      if (this.getExecutor() != null) {
        this.getExecutor().execute("onDisable");
      }
      this.context.close();
    }

    @Override
    public void onEnable() {
      if (this.getExecutor() != null) {
        this.getExecutor().execute("onEnable");
      }
    }

    @Override
    public ChunkGenerator getDefaultWorldGenerator(String worldName, String id) {
        return null;
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
