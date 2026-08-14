import express from "express";
import cors from "cors";
import elliptic from "elliptic";
import { Blockchain, Transaction } from "./blockchain.js";
import { P2PServer } from "./p2p.js";

const ec = new elliptic.ec("secp256k1");
const myCoin = new Blockchain();
const p2pServer = new P2PServer(myCoin);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/blocks", (req, res) => {
  res.json(myCoin.chain);
});

app.get("/transactions", (req, res) => {
  res.json(myCoin.pendingTransactions);
});

app.get("/wallet/new", (req, res) => {
  const key = ec.genKeyPair();
  const publicKey = key.getPublic("hex");
  const privateKey = key.getPrivate("hex");
  res.json({ publicKey, privateKey });
});

app.post("/transactions/send", (req, res) => {
  const { privateKey, toAddress, amount } = req.body;
  try {
    const senderKey = ec.keyFromPrivate(privateKey);
    const fromAddress = senderKey.getPublic("hex");

    const tx = new Transaction(fromAddress, toAddress, amount);
    tx.signTransaction(senderKey);
    myCoin.createTransaction(tx);

    res.json({ message: "Transaction signed and added to the mempool." });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/mine", (req, res) => {
  const { rewardAddress } = req.body;
  if (!rewardAddress) {
    return res.status(400).json({ error: "Reward address is required to mine a block." });
  }
  myCoin.minePendingTransactions(rewardAddress);
  p2pServer.broadcastChain();
  res.json({
    message: "Block successfully mined and broadcasted.",
    block: myCoin.getLatestBlock(),
  });
});

app.get("/balance/:address", (req, res) => {
  const balance = myCoin.getBalanceOfAddress(req.params.address);
  res.json({
    address: req.params.address,
    balance
  });
});

app.get("/peers", (req, res) => {
  console.log(p2pServer.getPeers());
  res.json(p2pServer.getPeers());
});

export { app, p2pServer };
