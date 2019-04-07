// import org.bukkit.enchantments.EnchantmentTarget;
// import org.bukkit.inventory.ItemStack;

let Enchantment = Java.type('org.bukkit.enchantments.Enchantment');

let registerGlow = () => {
        try {
            let f = Enchantment.class.getDeclaredField("acceptingNew");
            f.setAccessible(true);
            f.set(null, true);
        }
        catch (e) {
            console.log(`e:`, e)
        }

        try {
            let glow = new Glow(70);
            Enchantment.registerEnchantment(glow);
        }
        catch(e) {
            console.log(`e:`, e)
        }
    }

let Glow = Java.extend(Enchantment, {
  canEnchantItem(arg0) {
      return false;
  },

  conflictsWith(arg0) {
      return false;
  },

  getItemTarget() {
      return null;
  },

  getMaxLevel() {
      return 0;
  },

  getName() {
      return null;
  },

  getStartLevel() {
      return 0;
  },
});

registerGlow();

module.exports = Glow;
