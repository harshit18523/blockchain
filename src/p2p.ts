import ws, { WebSocketServer } from "ws";
import { Blockchain } from "./blockchain.js";

export class P2PServer {
  private sockets: ws[] = [];
  private blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.blockchain = blockchain;
  }

  public listen(port: number): void {
    const server = new WebSocketServer({ port });
    server.on("connection", (socket: ws) => {
      console.log("ws on connection");
      this.connectSocket(socket);
    });
    console.log(`Listening for peer-to-peer connections on port: ${port}`);
  }

  public connectToPeers(peers: string[]): void {
    peers.forEach((peer) => {
      const socket = new ws(peer);
      socket.on("open", () => {
        console.log("ws on open");
        this.connectSocket(socket);
      });
      socket.on("error", () => {
        console.log(`Failed to connect to peer: ${peer}`);
      });
    });
  }

  private connectSocket(socket: ws): void {
    this.sockets.push(socket);
    console.log("A new node has connected to the network.");

    this.messageHandler(socket);
    this.sendChain(socket);
  }

  private messageHandler(socket: ws): void {
    socket.on("message", (message: string) => {
      const data = JSON.parse(message);
      console.log("Received an updated chain from the network.");

      if (data.length > this.blockchain.chain.length && this.blockchain.isChainValid()) {
        this.blockchain.replaceChain(data);
        this.broadcastChain();
      }
    });
  }

  private sendChain(socket: ws): void {
    socket.send(JSON.stringify(this.blockchain.chain));
  }

  public broadcastChain(): void {
    this.sockets.forEach((socket) => {
      this.sendChain(socket);
    });
  }

  public getPeers(): string[] {
    return this.sockets.map((socket: any) => {
      const address = socket.url ||
      `${socket._socket.remoteAddress}:${socket._socket.remotePort}`;
      return address;
    });
  }
}
