import { create_itemstack, DataKey } from "./_create_itemstack";
import { Reflection } from "./_Java.js";

// prettier-ignore
let CuboidRegionSelector = Java_type("com.sk89q.worldedit.regions.selector.CuboidRegionSelector");
// prettier-ignore
let SkPlayer = Java_type("com.sk89q.worldedit.bukkit.BukkitPlayer");
let bukkit_adapter = Java_type("com.sk89q.worldedit.bukkit.BukkitAdapter")
  .static;
let worldedit = () => Java_type("com.sk89q.worldedit.WorldEdit").static.getInstance();
let Material = Java.type("org.bukkit.Material");

let ChatColor = Java.type('org.bukkit.ChatColor');

let {nbt, unpack_nbt} = require('./_nbt.js');

let worldedit_session_for_player = player => {
  return worldedit().getSessionManager()
    .get(new SkPlayer(player));
};

export default (plugin, { defineCommand }) => {
  let brush_key = DataKey({
    plugin: plugin.java,
    name: "brush",
    type: DataKey.STRING,
    default: 'null',
  });

  plugin.events.PlayerInteract(async event => {
    let player = event.getPlayer();
    let item = event.getItem()
    let sk_player = new SkPlayer(player)

    if (item == null) return;

    let sk_item_type = bukkit_adapter.adapt(item).getType();
    let session = worldedit_session_for_player(player);
    session.setTool(sk_item_type, null);

    let data = item.getItemMeta().getPersistentDataContainer();
    let brush_data = JSON.parse(brush_key.get(data))

    if (brush_data) {
      let brush = json_to_brush(sk_player, brush_data)
      session.setTool(sk_item_type, brush);
    }
  }, { priority: 'LOWEST' });

  plugin.events.PlayerInteract(async event => {
    let player = event.getPlayer();
    let item = event.getItem()
    if (item != null) {
      let sk_item_type = bukkit_adapter.adapt(item).getType();
      let session = worldedit_session_for_player(player);
      session.setTool(sk_item_type, null);
    }
  }, { priority: 'HIGHEST' });

  // defineCommand('brush', {
  //   onCommand: ({
  //     sender,
  //     args: [warp_title],
  //     reply_success,
  //     UserError,
  //     broadcast_action
  //   }) => {
  //     let itemstack = create_itemstack(Material.WOODEN_SWORD, {
  //       // prettier-ignore
  //       name: `${ChatColor.RED}Wood ${ChatColor.GREEN}Sphere ${ChatColor.RESET}brush ${ChatColor.BLUE}(2)`,
  //       lore: [''],
  //       data: [
  //         [brush_key, JSON.stringify({
  //           type: 'sphere',
  //           material: 'OAK_PLANKS',
  //           size: 2,
  //         })],
  //       ]
  //     });
  //     sender.getInventory().addItem(itemstack);
  //     reply_success('hey');
  //   }
  // })

  plugin.events.PlayerCommandPreprocess(async event => {
    let player = event.getPlayer();
    let item = player.getInventory().getItemInMainHand();

    setTimeout(() => {
      let sk_player = new SkPlayer(player)
      // let sk_item_type = bukkit_adapter.adapt(item.getType());
      let sk_item_type = bukkit_adapter.adapt(item).getType();

      console.log(`sk_item_type:`, sk_item_type)

      // console.log(`item.getType():`, sk_item_type);
      let session = worldedit_session_for_player(player);
      let brush_tool = session.getTool(sk_item_type);
      console.log(`brush_tool:`, brush_tool);
      // session.setBrushTool(null);

      let brush_title = brush_to_title(brush_tool);
      let brush_json = brush_to_json(brush_tool);

      console.log(`brush_json:`, brush_json)

          let itemstack = create_itemstack(item.getType(), {
            // prettier-ignore
            name: brush_title,
            lore: [''],
            data: [
              [brush_key, JSON.stringify(brush_json)],
            ]
          });
      player.getInventory().setItemInMainHand(itemstack)
      session.setTool(sk_item_type, null);
    }, 200);
  });
}

let BrushTool = Java_type("com.sk89q.worldedit.command.tool.BrushTool");
let SphereBrush = Java_type("com.sk89q.worldedit.command.tool.brush.SphereBrush");
let HollowSphereBrush = Java_type("com.sk89q.worldedit.command.tool.brush.HollowSphereBrush");
let SmoothBrush = Java_type("com.sk89q.worldedit.command.tool.brush.SmoothBrush");

let brush_to_title = () => {
  return `${ChatColor.RED}Wood ${ChatColor.GREEN}Sphere ${ChatColor.RESET}brush ${ChatColor.BLUE}(2)`
}
let brush_types = [
  { brush_class: SphereBrush, name: 'sphere' },
  { brush_class: HollowSphereBrush, name: 'hollow sphere' },
  { brush_class: SmoothBrush, name: 'smooth', get_args: (brush) => [Reflection.get_private_field(brush, 'iterations')] }
]
let brush_to_json = (tool) => {
  let brush = tool.getBrush();
  console.log(`brush:`, brush)
  let brush_type = brush_types.find(({ brush_class }) => brush instanceof brush_class);
  return {
    type: brush_type.name,
    type_args: brush_type.get_args ? brush_type.get_args(brush) : [],
    material: tool.getMaterial() ? tool.getMaterial().toString() : null,
    size: tool.getSize(),
  }
}
let json_to_brush = (sk_player, brush_data) => {
  let brush = new BrushTool("yes");
  let BrushClass = brush_types.find(({ name }) => name === brush_data.type).brush_class;
  brush.setBrush(new BrushClass(...brush_data.type_args), "yes");
  // bb.setMask();

  // TODO MASK
  // TODO TRACE

  let ParserContext = Java_type("com.sk89q.worldedit.extension.input.ParserContext");
  let context = new ParserContext();
  context.setActor(sk_player);

  if (brush_data.material) {
    let pattern = worldedit().getPatternFactory().parseFromInput(brush_data.material, context);
    brush.setFill(pattern);
  }

  brush.setSize(brush_data.size);
  return brush;
}
