let Material = Java.type('org.bukkit.Material');
let EquipmentSlot = Java.type('org.bukkit.inventory.EquipmentSlot');

let Minecart = Java.type('org.bukkit.entity.Minecart');
let BlockAction = Java.type("org.bukkit.event.block.Action");

module.exports = (plugin) => {
  plugin.events.PlayerInteract(async event => {
    let player = event.getPlayer();
    let block = event.getClickedBlock()
    let item = event.getItem()

    if (item != null || block == null) {
      return;
    }


    if (event.getAction() !== BlockAction.RIGHT_CLICK_BLOCK) {
      return
    }
    if (event.getHand() !== EquipmentSlot.HAND) {
      return;
    }
    if (block.getType() !== Material.RAIL && block.getType() !== Material.POWERED_RAIL) {
      return;
    }

    let speed = player.isSprinting() ? 1 : 0.5;
    let direction = player.getLocation().getDirection();

    let minecart = block.getLocation().getWorld().spawn(block.getLocation(), Minecart.class);
    minecart.setPassenger(player);
    minecart.setVelocity(direction.clone().multiply(speed))
  });

  plugin.events.VehicleExit(async event => {
    if (event.getVehicle() instanceof Minecart) {
      event.getVehicle().remove()
    }
  })
}
