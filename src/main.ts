import dotenv from "dotenv";
dotenv.config();
import { app, p2pServer } from "./server.js";

const httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3001;
const p2pPort = process.env.P2P_PORT ? parseInt(process.env.P2P_PORT) : 6001;
const peers = process.env.PEERS ? process.env.PEERS.split(",") : [];

app.listen(httpPort, () => {
  console.log(`HTTP API server listening on port: ${httpPort}`);
});

p2pServer.listen(p2pPort);
p2pServer.connectToPeers(peers);
