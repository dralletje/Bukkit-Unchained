let { once } = require('lodash');

let Packet = {
  packet_manager: once(() => {
    let minecraft_types = require("./minecraft-types.js");
    let minecraft_data_protocol = require("minecraft-data/minecraft-data/data/pc/1.13.2/protocol.json");
    // let minecraft_data = minecraft_data_factory('1.13.2');
    let ProtoDef = require("protodef").ProtoDef;

    let proto = new ProtoDef(false);
    proto.addTypes(minecraft_types);
    // proto.addProtocol(minecraft_data.protocol, ['play', 'toClient'])
    proto.addProtocol(minecraft_data_protocol, ["play", "toClient"]);

    return proto;
  }),

  send_packet: (player, { name, params }) => {
    let proto = Packet.packet_manager();

    if (name == null) {
      throw new Error(`Should set a .name prop with the packet name`);
    }

    let packet_raw = proto.createPacketBuffer("packet", {
      name: name,
      params: params
    });

    let WirePacket = Java_type(
      "com.comphenix.protocol.injector.netty.WirePacket"
    );
    let protocol_manager = Java_type(
      "com.comphenix.protocol.ProtocolLibrary"
    ).static.getProtocolManager();

    let packet_id = packet_raw[0];
    let packet_data = new Int8Array(packet_raw.slice(1));
    let wirepacket = new WirePacket(packet_id, packet_data);
    protocol_manager.sendWirePacket(player, wirepacket);
  },

  combined_id: (blockdata) => {
    // Most hacky stuff pfff
    let BLOCK = Java.type("net.minecraft.server.v1_13_R2.Block").class.static;
    let iblockdata = Java_type("com.comphenix.protocol.wrappers.WrappedBlockData")
      .static.createData(blockdata)
      .getHandle();
    let combined_id = BLOCK.getCombinedId(iblockdata);
    return combined_id;
  },

  multiblock_entry: ({ in_chunk: [x, z], y, blockId }) => {
    return {
      horizontalPos: (Math.floor(x) << 4) + Math.floor(z),
      y: y,
      blockId: blockId
    };
  },
};

module.exports = Packet;
