let Material = Java.type('org.bukkit.Material');
let EquipmentSlot = Java.type('org.bukkit.inventory.EquipmentSlot');

let Minecart = Java.type('org.bukkit.entity.Minecart');

module.exports = (plugin) => {
  plugin.events.PlayerInteract(async event => {
    let player = event.getPlayer();
    let block = event.getClickedBlock()
    let item = event.getItem()

    if (item != null) {
      return;
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
    event.getVehicle().remove()
  })
}
