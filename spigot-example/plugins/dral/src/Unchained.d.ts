declare let Java_type: (path: string) => any;

declare module "bukkit/Packet" {
  type FromClient = { FROM_CLIENT: true }
  type FromServer = { FROM_SERVER: true }

  export let fromClient:{ [key: string]: FromClient };
  export let fromServer: { [key: string]: FromClient };
  
  export let send_packet: (
    player: org$bukkit$entity$Player,
    packet: {
      debug?: boolean;
      name: string;
      params: object;
    }
  ) => void;

  export let addIncomingPacketListener: (packet: FromClient, cb: (packet: any) => void);

  export let get_entity_count: () => {
    incrementAndGet(): number;
  };

  let Packet: {
    send_packet(
      player: org$bukkit$entity$Player,
      packet: {
        name: string;
        params: object;
      }
    ): void;

    get_entity_count(): {
      incrementAndGet(): number;
    };
  };

  export default Packet;
}
