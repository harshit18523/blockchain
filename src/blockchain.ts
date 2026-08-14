import * as crypto from "crypto";
import elliptic from "elliptic";

const ec = new elliptic.ec("secp256k1");

class Transaction {
  public fromAddress: string | null;
  public toAddress: string;
  public amount: number;
  public signature?: string;

  constructor(fromAddress: string | null, toAddress: string, amount: number) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
  }

  calculateHash(): string {
    return crypto
      .createHash("sha256")
      .update(this.fromAddress + this.toAddress + this.amount)
      .digest("hex");
  }

  signTransaction(signingKey: elliptic.ec.KeyPair): void {
    if (signingKey.getPublic("hex") !== this.fromAddress) {
      throw new Error("You cannot sign transactions for other wallets!");
    }
    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, "base64");
    this.signature = sig.toDER("hex");
  }

  isValid(): boolean {
    if (this.fromAddress === null) {
      return true; // Mining reward or system-generated transaction
    } else if (!this.signature || this.signature.length === 0) {
      throw new Error("No signature in this transaction");
    }
    const publicKey = ec.keyFromPublic(this.fromAddress, "hex");
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

class Block {
  public index: number;
  public timestamp: string;
  // public data: any;
  public transactions: Transaction[];
  public previousHash: string;
  public hash: string;
  public nonce: number;

  constructor(index: number, timestamp: string, transactions: Transaction[], previousHash: string = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash(): string {
    return crypto
      .createHash("sha256")
      .update(this.index + this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce)
      .digest("hex");
  }

  mineBlock(difficulty: number): void {
    const target = Array(difficulty + 1).join("0");
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`Block mined: ${this.hash} (Nonce: ${this.nonce})`);
  }

  hasValidTransactions(): boolean {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }
    return true;
  }
}

class Blockchain {
  public chain: Block[];
  public difficulty: number;
  public pendingTransactions: Transaction[];
  public miningReward: number;

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 3;
    this.pendingTransactions = [];
    this.miningReward = 10;
  }

  private createGenesisBlock(): Block {
    return new Block(0, "01/01/2026", [], "0");
  }

  public getLatestBlock(): Block {
    if (this.chain.length === 0) console.log("Warning: Blockchain is empty. Returning genesis block.");
    return this.chain[this.chain.length - 1] || this.createGenesisBlock();
  }

  // public addBlock(newBlock: Block): void {
  //   newBlock.previousHash = this.getLatestBlock().hash;
  //   // mine the block instead of just calculating hash once
  //   newBlock.mineBlock(this.difficulty);
  //   this.chain.push(newBlock);
  // }

  public createTransaction(transaction: Transaction): void {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error("Transaction must include from and to address");
    } else if (!transaction.isValid()) {
      throw new Error("Cannot add invalid transaction to chain");
    }

    this.pendingTransactions.push(transaction);
  }

  public minePendingTransactions(miningRewardAddress: string): void {
    let block = new Block(
      this.chain.length,
      new Date().toISOString(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    block.mineBlock(this.difficulty);
    console.log("Block successfully mined!");

    this.chain.push(block);
    this.pendingTransactions = [new Transaction(null, miningRewardAddress, this.miningReward)];
  }

  public getBalanceOfAddress(address: string): number {
    let balance = 0;
    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) {
          balance -= trans.amount;
        } else if (trans.toAddress === address) {
          balance += trans.amount;
        }
      }
    }
    return balance;
  }

  public isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Check if the current block's hash is valid and current block points to the correct previous block
      if (!currentBlock?.hasValidTransactions() ||
        currentBlock?.hash !== currentBlock?.calculateHash() ||
        currentBlock?.previousHash !== previousBlock?.hash) {
        console.log(`Block ${i} is invalid.`);
        return false;
      }
    }
    return true;

  }

  public replaceChain(newChain: Block[]): void {
    // the longest chain rule
    if (newChain.length <= this.chain.length || !this.isChainValid()) {
      console.log("Received chain is not longer than the current chain. Or the chain is invalid.");
      return;
    }
    console.log("Replacing current chain with a longer network chain.");
    this.chain = newChain;
  }
}

export { Transaction, Block, Blockchain };
