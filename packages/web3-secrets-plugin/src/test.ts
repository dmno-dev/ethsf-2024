import * as LitSdk from '@lit-protocol/lit-node-client-nodejs';
import kleur from 'kleur';
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import { AuthMethodScope, AuthMethodType } from '@lit-protocol/constants';
// @ts-ignore
import IpfsHash from "ipfs-only-hash";

import { convertRequestsPerDayToPerSecond, LitContracts } from '@lit-protocol/contracts-sdk';
import * as ethers from "ethers";
import {
  LitAbility,
  LitAccessControlConditionResource,
  LitActionResource,
  LitPKPResource,
} from "@lit-protocol/auth-helpers";

import { checkGithubAccessCode, decryptLitActionCode } from './lit-actions';
import { SIGN_ABI } from './sign-abi';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type EncryptedData = {
  ciphertext: string,
  dataToEncryptHash: string
}

const GITHUB_ORG = 'dmno-dev';
const GITHUB_TOKEN = process.env.GH_TOKEN!;
const GITHUB_TEAM_ID = 'T_kwDOCNTAN84ArKW3';

const WALLET_ADDRESS = process.env.WALLET_ADDRESS!;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;


const LIT_NETWORK = LitNetwork.DatilDev;

const OP_SEPOLIA_RPC_URL = 'https://sepolia.optimism.io';
const OP_SEPOLIA_CHAIN_ID = 11155420;

const SIGN_ADDRESS = '0x4e4af2a21ebf62850fD99Eb6253E1eFBb56098cD';
const SIGN_SCHEMA_ID = '0x47';
const SIGN_SCHEMA_FULL_ID = 'onchain_evm_11155420_0x47';

// const PKP_PUBLIC_KEY = '0x04d5c63b6917b98fe5cdad013a95a5ecd611e739de930c2a83d52f6f108db0d734197779e16e1c2ce3ac3ae8711762b1873e2583455347d49cf6407a065b3a199c';

type PkpInfo = {
  tokenId: string,
  publicKey: string,
  ethAddress: string,
}

let EXISTING_PKP: PkpInfo | undefined;

const PKP_ACCESS_CODE = checkGithubAccessCode;

EXISTING_PKP = {
  tokenId: '0xafe7b525af5d8127868c1b6773a320421aafbad895ad9a6f697bc6882b6be72f',
  publicKey: '046d6c6cf3418b4eba183c5579c4be785778976391323a7e1cb6cedcadc39c0da4318b2c464b254b9cc6198accdfd0c0a9f47e27bda47301b53de4191cf85da18b',
  ethAddress: '0xe9044c1a1Bd3b00Accc8a886EA3703Ed6A170B1d'
};

const wallet = new ethers.Wallet(
  WALLET_PRIVATE_KEY,
  new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
);

const opProvider = new ethers.providers.JsonRpcProvider(OP_SEPOLIA_RPC_URL);

const opWallet = new ethers.Wallet(
  WALLET_PRIVATE_KEY,
  opProvider,
);

const litNodeClient = new LitSdk.LitNodeClientNodeJs({
  litNetwork: LIT_NETWORK,
  debug: true,
  alertWhenUnauthorized: false, // not sure about this
});
await litNodeClient.connect();
console.log('lit node client connected');


// const pkpInfo = EXISTING_PKP;
console.log(kleur.bgBlue('Minting PKP'));
// const pkpInfo = EXISTING_PKP || await mintPkp(wallet);
const pkpInfo = await mintPlainPkp(wallet);

console.log(kleur.bgBlue('Encrypting github team id'));
const encryptedTeamId = await encryptDataWithPkp(litNodeClient, GITHUB_TEAM_ID, pkpInfo);

console.log(kleur.bgBlue('Creating team access attestation'));
await createTeamsAuthAttestation(opWallet, pkpInfo, encryptedTeamId);

console.log(kleur.bgBlue('Restricting PKP'));
await restrictPkp(litNodeClient, pkpInfo)

// // fund the pkp with some eth for gas
// await opWallet.sendTransaction({
//   to: pkpInfo.ethAddress,
//   value: ethers.utils.parseUnits('0.0000001', 'ether'),
// });

console.log(kleur.bgBlue('Getting PKP session sigs'));
const sessionSigs = await getPkpSessionSigs(litNodeClient, pkpInfo, GITHUB_TOKEN);
console.log('session sigs', sessionSigs);

console.log(kleur.bgBlue('Encrypting data'));
const encrypted = await encryptDataWithPkp(litNodeClient, 'im-a-secret', pkpInfo);
const encryptedCombined = `${encrypted.ciphertext}:::${encrypted.dataToEncryptHash}`;

await delay(2000);

console.log(kleur.bgBlue('Decrypting'));
const response = await litNodeClient.executeJs({
  sessionSigs,
  code: decryptLitActionCode,
  jsParams: {
    encryptedCombined
  }
});

console.log('decrypted value =', response.response);



// const decrypted = await LitSdk.decryptToString({
//   chain: 'ethereum',
//   sessionSigs,
//   ciphertext: encrypted.ciphertext,
//   dataToEncryptHash: encrypted.dataToEncryptHash,
//   accessControlConditions: [{
//     contractAddress: '',
//     standardContractType: '',
//     chain: "ethereum",
//     method: '',
//     parameters: [
//       ':userAddress',
//     ],
//     returnValueTest: {
//       comparator: '=',
//       value: pkpInfo.ethAddress,
//     }
//   }]
// }, litNodeClient);

// console.log(decrypted);

//! ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// async function mintPkp(wallet: ethers.Wallet) {
//   console.log("Minting new PKP...");
//   const litContractsClient = new LitContracts({
//     signer: wallet,
//     network: LIT_NETWORK,
//   });

//   await litContractsClient.connect();

//   // get mint cost
//   const mintCost = await litContractsClient.pkpNftContract.read.mintCost();
//   console.log("Mint cost:", mintCost);

  
//   // const ipfsHash = await IpfsHash.of(ghAccessLitActionCode);
//   const ipfsHash = await IpfsHash.of(PKP_ACCESS_CODE);
//   // const ipfsHash = await IpfsHash.of(decryptLitActionCode);

//   const txn =
//     await litContractsClient.pkpHelperContract.write.mintNextAndAddAuthMethods(
//       2, // uint256 keyType,
//       [AuthMethodType.LitAction], // uint256[] memory permittedAuthMethodTypes,
//       [ethers.utils.base58.decode(ipfsHash)],
//       ["0x"], // bytes[] memory permittedAuthMethodPubkeys,
//       [[AuthMethodScope.SignAnything]], // uint256[][] memory permittedAuthMethodScopes,
//       false, // bool addPkpEthAddressAsPermittedAddress,
//       true, // bool sendPkpToItself
//       { value: mintCost, /* gasLimit: 4000000000 */ }
//     );
//   const receipt = await txn.wait();
//   console.log("Minted!", receipt);

//   const pkpInfo = await getPkpInfoFromMintReceipt(receipt, litContractsClient);
//   console.log('PKP INFO: ', pkpInfo);
//   return pkpInfo;
// }


async function mintPlainPkp(wallet: ethers.Wallet) {
  console.log("Minting new PKP...");
  const litContractsClient = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK,
  });

  await litContractsClient.connect();

  // get mint cost
  const mintCost = await litContractsClient.pkpNftContract.read.mintCost();
  console.log("Mint cost:", mintCost);

  const pkp = (await litContractsClient.pkpNftContractUtils.write.mint()).pkp;

  return pkp;
}

async function restrictPkp(litNodeClient: LitSdk.LitNodeClientNodeJs, pkpInfo: PkpInfo) {
  const litContractsClient = new LitContracts({
    signer: wallet,
    network: LIT_NETWORK,
  });

  await litContractsClient.connect();

  const ipfsHash = await IpfsHash.of(PKP_ACCESS_CODE);

  const addResult = await litContractsClient.addPermittedAuthMethod({
    pkpTokenId: pkpInfo.tokenId,
    authMethodType: AuthMethodType.LitAction,
    authMethodId: ethers.utils.base58.decode(ipfsHash),
    authMethodScopes: [AuthMethodScope.SignAnything],
  });

  console.log(addResult);
}




async function encryptDataWithPkp(litNodeClient: LitSdk.LitNodeClientNodeJs, dataToEncrypt: string, pkpInfo: PkpInfo) {
  const encrypted = await LitSdk.encryptString({
    dataToEncrypt,
    accessControlConditions: [{
      contractAddress: '',
      standardContractType: '',
      chain: "ethereum",
      method: '',
      parameters: [
        ':userAddress',
      ],
      returnValueTest: {
        comparator: '=',
        value: pkpInfo.ethAddress,
      }
    }]
  }, litNodeClient);

  return encrypted;
}


async function getPkpSessionSigs(litNodeClient: LitSdk.LitNodeClientNodeJs, pkpInfo: PkpInfo, githubAccessToken: string) {
  const sessionSignatures = await litNodeClient.getPkpSessionSigs({
    pkpPublicKey: pkpInfo.publicKey,
    // capabilityAuthSigs: [capacityDelegationAuthSig],
    litActionCode: Buffer.from(PKP_ACCESS_CODE).toString("base64"),
    jsParams: {
      githubAccessToken,
      githubOrg: GITHUB_ORG,
      signSchemaFullId: SIGN_SCHEMA_FULL_ID,
      pkpEthAddress: pkpInfo.ethAddress,
    },
    resourceAbilityRequests: [
      {
        resource: new LitPKPResource("*"),
        ability: LitAbility.PKPSigning,
      },
      {
        resource: new LitActionResource("*"),
        ability: LitAbility.LitActionExecution,
      },
      {
        resource: new LitAccessControlConditionResource('*'),
        ability: LitAbility.AccessControlConditionDecryption,
      },
    ],
    expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
  });
  return sessionSignatures;
}


export async function createTeamsAuthAttestation(wallet: ethers.Wallet, pkpInfo: PkpInfo, encryptedGithubTeamId: EncryptedData, isAdmin = true) {
  const contract = new ethers.Contract(SIGN_ADDRESS, SIGN_ABI, opWallet.provider);
  const instance = contract.connect(wallet) as ethers.Contract

  const encryptedCombined = `${encryptedGithubTeamId.ciphertext}:::${encryptedGithubTeamId.dataToEncryptHash}`;

  const schemaData = ethers.utils.defaultAbiCoder.encode(
    ["address", "string", "bool"],
    [pkpInfo.ethAddress, encryptedCombined, isAdmin]
  );

  const attestTxn = await instance[
    "attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),string,bytes,bytes)"
  ]({
      schemaId: ethers.BigNumber.from(SIGN_SCHEMA_ID), // The final number from our schema's ID.
      linkedAttestationId: 0, // We are not linking an attestation.
      attestTimestamp: 0, // Will be generated for us.
      revokeTimestamp: 0, // Attestation is not revoked.
      attester: opWallet.address, // Alice's address.
      validUntil: 0, // We are not setting an expiry date.
      dataLocation: 0, // We are placing data on-chain.
      revoked: false, // The attestation is not revoked.
      recipients: [], // Bob is our recipient.
      data: schemaData // The encoded schema data.
    },
    pkpInfo.ethAddress, // indexing key.
    "0x", // No delegate signature.
    "0x00" // No extra data.
  );

  
  const receipt = await attestTxn.wait(1);
  console.log(receipt);
  console.log('Created attestation!');
}

export async function createAttestationTxn(pkpInfo: PkpInfo, githubTeamId: string, isAdmin = true) {
  const contract = new ethers.Contract(SIGN_ADDRESS, SIGN_ABI, opWallet.provider);
  
  const schemaData = ethers.utils.defaultAbiCoder.encode(
    ["address", "string", "bool"],
    [pkpInfo.ethAddress, githubTeamId, isAdmin]
  );

  const attestTxn = await contract.populateTransaction[
    "attest((uint64,uint64,uint64,uint64,address,uint64,uint8,bool,bytes[],bytes),string,bytes,bytes)"
  ]({
      schemaId: ethers.BigNumber.from(SIGN_SCHEMA_ID), // The final number from our schema's ID.
      linkedAttestationId: 0, // We are not linking an attestation.
      attestTimestamp: 0, // Will be generated for us.
      revokeTimestamp: 0, // Attestation is not revoked.
      attester: opWallet.address, // Alice's address.
      validUntil: 0, // We are not setting an expiry date.
      dataLocation: 0, // We are placing data on-chain.
      revoked: false, // The attestation is not revoked.
      recipients: [], // Bob is our recipient.
      data: schemaData // The encoded schema data.
    },
    pkpInfo.ethAddress, // indexing key.
    "0x", // No delegate signature.
    "0x00" // No extra data.
  );

  console.log(attestTxn);

  const nonce = await opProvider.getTransactionCount(pkpInfo.ethAddress);
  
  const gasPrice = await opProvider.getGasPrice();

  return {
    ...attestTxn,
    chainId: OP_SEPOLIA_CHAIN_ID,
    nonce,
    gasPrice,
    gasLimit: ethers.utils.hexlify(40000)
  }
}

export async function grantTeamAccess(litNodeClient: LitSdk.LitNodeClientNodeJs, pkpInfo: PkpInfo, githubTeamId: string) {

  let rawTxnToSign = await createAttestationTxn(pkpInfo, githubTeamId);

  rawTxnToSign = await ethers.utils.resolveProperties(rawTxnToSign);


  const serializedTx = ethers.utils.serializeTransaction(rawTxnToSign);
  console.log("serializedTx", serializedTx);

  const txnHash = ethers.utils.keccak256(serializedTx);

  // const rlpEncodedTxn = ethers.utils.arrayify(serializedTx);
  // console.log("rlpEncodedTxn: ", rlpEncodedTxn);

  // const unsignedTxn = ethers.utils.keccak256(rlpEncodedTxn);
  // console.log("unsignedTxn: ", unsignedTxn);

  const pkpSig = await litNodeClient.pkpSign({
    toSign: ethers.utils.arrayify(txnHash),
    pubKey: pkpInfo.publicKey,
    sessionSigs,
  });

  const txnSig = {
    // chain id might be 1?
    v: pkpSig.recid + (OP_SEPOLIA_CHAIN_ID*2) + 35,
    r: `0x${pkpSig.r}`,
    s: `0x${pkpSig.s}`,
  };
  
  const signedTxn = ethers.utils.serializeTransaction(rawTxnToSign, txnSig);

  const txnResult = await opProvider.sendTransaction(signedTxn);
  console.log(txnResult);
  
  const receipt = await txnResult.wait();
  console.log(receipt);


}
