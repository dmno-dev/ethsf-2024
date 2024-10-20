import * as LitSdk from '@lit-protocol/lit-node-client-nodejs';
import kleur from 'kleur';
import { LitNetwork, LIT_RPC } from "@lit-protocol/constants";
import { AuthMethodScope, AuthMethodType } from '@lit-protocol/constants';
// @ts-ignore
import IpfsHash from "ipfs-only-hash";
import { LitContracts } from '@lit-protocol/contracts-sdk';
import * as ethers from "ethers";
import {
  LitAbility,
  LitAccessControlConditionResource,
  LitActionResource,
  LitPKPResource,
} from "@lit-protocol/auth-helpers";

import { checkGithubAccessCode, decryptLitActionCode } from './lit-actions';
import { SIGN_ABI } from './sign-abi';



const LIT_DEBUG = false;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type EncryptedData = {
  ciphertext: string,
  dataToEncryptHash: string
}

// const WALLET_ADDRESS = process.env.WALLET_ADDRESS!;
// const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;


const LIT_NETWORK = LitNetwork.DatilDev;

const OP_SEPOLIA_RPC_URL = 'https://sepolia.optimism.io';
const OP_SEPOLIA_CHAIN_ID = 11155420;

const SIGN_ADDRESS = '0x4e4af2a21ebf62850fD99Eb6253E1eFBb56098cD';

const SIGN_SCHEMA_FULL_ID = 'onchain_evm_11155420_0x47';
const SIGN_SCHEMA_ID = SIGN_SCHEMA_FULL_ID.split('_').pop();

// const PKP_PUBLIC_KEY = '0x04d5c63b6917b98fe5cdad013a95a5ecd611e739de930c2a83d52f6f108db0d734197779e16e1c2ce3ac3ae8711762b1873e2583455347d49cf6407a065b3a199c';

export type PkpInfo = {
  tokenId: string,
  publicKey: string,
  ethAddress: string,
}

const PKP_ACCESS_CODE = checkGithubAccessCode;

export async function createNewVaultPkp(
  githubTeamId: string,
  walletPrivateKey: string,
) {
  const wallet = new ethers.Wallet(
    walletPrivateKey,
    new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
  );

  const opProvider = new ethers.providers.JsonRpcProvider(OP_SEPOLIA_RPC_URL);

  const opWallet = new ethers.Wallet(
    walletPrivateKey,
    opProvider,
  );

  const litNodeClient = new LitSdk.LitNodeClientNodeJs({
    litNetwork: LIT_NETWORK,
    debug: LIT_DEBUG,
    alertWhenUnauthorized: false, // not sure about this
  });
  await litNodeClient.connect();
  // console.log('lit node client connected');


  // const pkpInfo = EXISTING_PKP;
  console.log(kleur.bgBlue('> Minting PKP'));
  // const pkpInfo = EXISTING_PKP || await mintPkp(wallet);
  const pkpInfo = await mintPlainPkp(wallet);

  console.log(kleur.bgBlue('> Encrypting github team id'));
  const encryptedTeamId = await encryptDataWithPkp(litNodeClient, githubTeamId, pkpInfo);

  console.log(kleur.bgBlue('Creating team access attestation'));
  await createTeamsAuthAttestation(opWallet, pkpInfo, encryptedTeamId);

  console.log(kleur.bgBlue('Restricting PKP access'));
  await restrictPkp(wallet, pkpInfo)

  // console.log('session sigs', sessionSigs);
  return pkpInfo;
}


export async function encryptData(pkpInfo: PkpInfo, dataToEncrypt: string) {
  const litNodeClient = new LitSdk.LitNodeClientNodeJs({
    litNetwork: LIT_NETWORK,
    debug: LIT_DEBUG,
    alertWhenUnauthorized: false, // not sure about this
  });
  //! maybe dont need this...? 
  await litNodeClient.connect();

  console.log(kleur.bgBlue('Encrypting data...'));
  const encrypted = await encryptDataWithPkp(litNodeClient, dataToEncrypt, pkpInfo);
  return `${encrypted.ciphertext}:::${encrypted.dataToEncryptHash}`;
}


export async function decryptData(pkpInfo: PkpInfo, githubOrg: string, githubToken: string, dataToDecrypt: string) {
  const litNodeClient = new LitSdk.LitNodeClientNodeJs({
    litNetwork: LIT_NETWORK,
    debug: LIT_DEBUG,
    alertWhenUnauthorized: false, // not sure about this
  });
  await litNodeClient.connect();

  console.log(kleur.bgBlue('Authorizing PKP via github'));
  try {
    const sessionSigs = await getPkpSessionSigs(litNodeClient, pkpInfo, githubOrg, githubToken);
    console.log('got sessions sigs!');

    const response = await litNodeClient.executeJs({
      sessionSigs,
      code: decryptLitActionCode,
      jsParams: {
        encryptedCombined: dataToDecrypt
      }
    });
    return JSON.parse(response.response.toString());
  } catch (err) {
    console.log('ERROR!', err);
    throw new Error('Problem while decrypting your data :(');
  }
}

//! ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

async function restrictPkp(wallet: ethers.Wallet, pkpInfo: PkpInfo) {
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


async function getPkpSessionSigs(
  litNodeClient: LitSdk.LitNodeClientNodeJs,
  pkpInfo: PkpInfo,
  githubOrg: string,
  githubAccessToken: string
) {
  const sessionSignatures = await litNodeClient.getPkpSessionSigs({
    pkpPublicKey: pkpInfo.publicKey,
    // capabilityAuthSigs: [capacityDelegationAuthSig],
    litActionCode: Buffer.from(PKP_ACCESS_CODE).toString("base64"),
    jsParams: {
      githubAccessToken,
      githubOrg,
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


export async function createTeamsAuthAttestation(opWallet: ethers.Wallet, pkpInfo: PkpInfo, encryptedGithubTeamId: EncryptedData, isAdmin = true) {
  const contract = new ethers.Contract(SIGN_ADDRESS, SIGN_ABI, opWallet.provider);
  const instance = contract.connect(opWallet) as ethers.Contract

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
