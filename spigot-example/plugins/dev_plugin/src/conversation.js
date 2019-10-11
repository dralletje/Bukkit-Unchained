// Java.type('org.bukkit.ChatColor');
// Java.type('org.bukkit.World');
// Java.type('org.bukkit.command.Command');
// Java.type('org.bukkit.command.CommandSender');
let ConversationAbandonedListener = Java.type('org.bukkit.conversations.ConversationAbandonedListener');
let ConversationFactory = Java.type('org.bukkit.conversations.ConversationFactory');
let FixedSetPrompt = Java.type('org.bukkit.conversations.FixedSetPrompt');
// Java.type('org.bukkit.entity.EntityType');
// Java.type('org.bukkit.entity.Player');
// Java.type('org.bukkit.plugin.Plugin');
// Java.type('org.bukkit.plugin.java.JavaPlugin');

let Material = Java.type('org.bukkit.Material');
let ItemStack = Java.type('org.bukkit.inventory.ItemStack');
let ShapedRecipe = Java.type('org.bukkit.inventory.ShapedRecipe');
let NamespacedKey = Java.type('org.bukkit.NamespacedKey');

let make_prompt = ({
  options = [],
  getPromptText,
  acceptValidatedInput,
}) => {
  let MyPrompt = Java.extend(FixedSetPrompt, {
      getPromptText: getPromptText,
      acceptValidatedInput: acceptValidatedInput,
  });
  return new MyPrompt(...options);
}

export let create_conversation = (plugin) => {
  console.log(`Material.EXP_BOTTLE:`, Material.ENDERMAN_SPAWN_EGG)
  let bottle = new ItemStack(Material.ENDERMAN_SPAWN_EGG);
  let expBottle = new ShapedRecipe(new NamespacedKey(plugin.java, 'end'), bottle);
  expBottle.shape("%%%","%%%","%%%");
  console.log(`Material.SUGAR:`, Material.SUGAR)
  expBottle.setIngredient('%', Material.SUGAR);
  Polyglot.import('server').addRecipe(expBottle);

}

export let create_conversation2 = (plugin) => {
  plugin.command('conversation', {
    onCommand: (player) => {
      conversationFactory.buildConversation(player).begin();

    }
  })

  console.log('Tab is complete')
  plugin.events.TabComplete((event) => {
    console.log(`event:`, event)
  })

  let conversationFactory = new ConversationFactory(plugin.java)
          .withModality(true)
          .withPrefix(() => {
            // String what = (String)context.getSessionData("type");
            // Integer count = (Integer)context.getSessionData("count");
            // Player who = (Player)context.getSessionData("who");
            //
            // if (what != null && count == null && who == null) {
            //     return ChatColor.GREEN + "Summon " + what + ": " + ChatColor.WHITE;
            // }
            // if (what != null && count != null && who == null) {
            //     return ChatColor.GREEN + "Summon " + count + " " + what + ": " + ChatColor.WHITE;
            // }
            // if (what != null && count != null && who != null) {
            //     return ChatColor.GREEN + "Summon " + count + " " + what + " to " + who.getName() + ": " + ChatColor.WHITE;
            // }
            // return ChatColor.GREEN + "Summon: " + ChatColor.WHITE;
            return 'Cool: ';
          })
          .withFirstPrompt(make_prompt({
            options: ['good', 'okay', 'decent'],
            getPromptText: function(context) {
              console.log(`this:`, this)
              return "What would you like to summon?";
            },
            acceptValidatedInput: function(context, string) {
              console.log(`string:`, string)
            }
          }))
          .withEscapeSequence("/quit")
          .withTimeout(10)
          .thatExcludesNonPlayersWithMessage("Go away evil console!")

}
