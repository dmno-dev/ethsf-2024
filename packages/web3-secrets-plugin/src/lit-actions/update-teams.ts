import { ethers } from "ethers";
import { SIGN_ABI } from '../lib/sign-abi';

async function addTeamAction() {
  // txnToSign
  // pkpAddress
  // pkpPublicKey

  const RPC_URL = 'https://sepolia.optimism.io';
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

  const nonce = await provider.getTransactionCount(pkpAddress);
  

  const sigName = "sig1";
  const txn = {
    ...txnToSign,
    nonce,
    gasPrice: 20000000000,
  }

  // using ether's serializeTransaction
  // https://docs.ethers.org/v5/api/utils/transactions/#transactions--functions
  const serializedTx = ethers.utils.serializeTransaction(txn);
  let hash = utils.keccak256(ethers.utils.toUtf8Bytes(serializedTx));
  // encode the message into an uint8array for signing
  const toSign = await new TextEncoder().encode(hash);
  const signature = await Lit.Actions.signAndCombineEcdsa({
    toSign,
    pkpPublicKey,
    sigName,
  });

  // the code in the function given to runOnce below will only be run by one node
  let response = await Lit.Actions.runOnce({ waitForResponse: true, name: "txnSender" }, async () => {

    // get the node operator's rpc url for the 'ethereum' chain
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const tx = await provider.sendTransaction(signature);
    return tx.blockHash; // return the tx to be broadcast to all other nodes
  });

  Lit.Actions.setResponse({ response });
}

export const addTeamActionCode = `(${addTeamAction.toString()})();`;
