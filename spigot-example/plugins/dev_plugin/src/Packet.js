let { ref } = require('worker_threads');
let { once } = require('lodash');

// prettier-ignore
let Accessors = Java_type("com.comphenix.protocol.reflect.accessors.Accessors");
// prettier-ignore
let MinecraftReflection = Java_type("com.comphenix.protocol.utility.MinecraftReflection");
// prettier-ignore
let PacketType = Java_type("com.comphenix.protocol.PacketType").static;
// prettier-ignore
let ProtocolLibrary = Java_type("com.comphenix.protocol.ProtocolLibrary");
// prettier-ignore
let PacketAdapter = Java_type("com.comphenix.protocol.events.PacketAdapter");
// prettier-ignore
let WirePacket = Java_type('com.comphenix.protocol.injector.netty.WirePacket');

global.crypto = {
  getRandomValues: buf => {
    // console.log(`buf.length:`, buf.length);
    return buf;
  }
};

let minecraft_types = require("./minecraft-types.js");
// prettier-ignore
let minecraft_data_protocol = require("minecraft-data/minecraft-data/data/pc/1.14.4/protocol.json");
let ProtoDef = require("protodef").ProtoDef;

let Packet = {
  to_client_protocol: once(() => {
    // let minecraft_data = minecraft_data_factory('1.13.2');

    let proto = new ProtoDef(false);
    proto.addTypes(minecraft_types);
    // proto.addProtocol(minecraft_data.protocol, ['play', 'toClient'])
    proto.addProtocol(minecraft_data_protocol, ["play", "toClient"]);

    return proto;
  }),

  to_server_protocol: once(() => {
    let minecraft_types = require("./minecraft-types.js");
    let minecraft_data_protocol = require("minecraft-data/minecraft-data/data/pc/1.14.1/protocol.json");
    // let minecraft_data = minecraft_data_factory('1.13.2');
    let ProtoDef = require("protodef").ProtoDef;

    let proto = new ProtoDef(false);
    proto.addTypes(minecraft_types);
    proto.addProtocol(minecraft_data_protocol, ["play", "toServer"]);

    return proto;
  }),

  send_packet: (player, { name, params }) => {
    let proto = Packet.to_client_protocol();
    let protocol_manager = ProtocolLibrary.static.getProtocolManager();

    if (name == null) {
      throw new Error(`Should set a .name prop with the packet name`);
    }

    let packet_raw = proto.createPacketBuffer("packet", {
      name: name,
      params: params
    });
    let packet_id = packet_raw[0];
    let packet_data = new Int8Array(packet_raw.slice(1));
    let wirepacket = new WirePacket(packet_id, packet_data);
    protocol_manager.sendWirePacket(player, wirepacket);
  },

  fromServer: PacketType.Play.Server,
  fromClient: PacketType.Play.Client,

  addIncomingPacketListener: (packet, handler) => {
    let protocolManager = ProtocolLibrary.static.getProtocolManager();

    let MyPacketAdapter = Java.extend(PacketAdapter, {
      onPacketReceiving(event) {
        handler({
          getData() {
            let wirepacket = WirePacket.static.fromPacket(event.getPacket());
            let bytes = Array.from(wirepacket.getBytes());
            let buffer = new Buffer([wirepacket.getId(), ...bytes]);
            let { data } = Packet.to_server_protocol().parsePacketBuffer('packet', buffer);
            return data;
          },
          getPacket: event.getPacket,
          setCancelled: event.setCancelled,
          getPlayer: event.getPlayer,
        });
      }
    });
    let packet_adapter = new MyPacketAdapter(
      Polyglot.import('plugin'),
      Java.to([packet])
    );
    protocolManager.addPacketListener(packet_adapter);

    let dispose = ref(packet_adapter);

    return { dispose: dispose };
  },

  // Mainly useful for debugging packets sent by bukkit
  addOutgoingPacketListener: (packet, handler) => {
    let protocolManager = ProtocolLibrary.static.getProtocolManager();

    let MyPacketAdapter = Java.extend(PacketAdapter, {
      onPacketSending(event) {
        handler({
          getData() {
            let wirepacket = WirePacket.static.fromPacket(event.getPacket());
            let bytes = Array.from(wirepacket.getBytes());
            let buffer = new Buffer([wirepacket.getId(), ...bytes]);
            let { data } = Packet.to_client_protocol().parsePacketBuffer('packet', buffer);
            return data;
          },
          getPacket: event.getPacket,
          setCancelled: event.setCancelled,
          getPlayer: event.getPlayer,
        });
      }
    });
    let packet_adapter = new MyPacketAdapter(
      Polyglot.import('plugin'),
      Java.to([packet])
    );
    protocolManager.addPacketListener(packet_adapter);

    let dispose = ref(packet_adapter);
    return { dispose: dispose };
  },

  combined_id: (blockdata) => {
    // Most hacky stuff pfff
    let BLOCK = Java.type("net.minecraft.server.v1_14_R1.Block").class.static;
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

  // Uses ProtocolLib !
  get_entity_count: () => {
    let accessor = Accessors.static.getFieldAccessor(
      MinecraftReflection.static.getEntityClass(),
      "entityCount",
      true
    );

    return accessor.get(null);

    // return {
    //   set: value => {
    //     return accessor.set(null, value);
    //   },
    //   get: ({ default: default_value = null } = {}) => {
    //     let value = accessor.get(null);
    //     return value == null ? default_value : value;
    //   }
    // };
  },
};

module.exports = Packet;
