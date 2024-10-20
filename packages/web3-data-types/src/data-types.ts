import { DmnoBaseTypes, ValidationError, createDmnoDataType } from 'dmno';
import { ethers } from 'ethers';
import Web3 from 'web3';

const Web3WalletAddress = createDmnoDataType<{
  isNounsTokenContract?: boolean,
}>({
  typeLabel: 'web3/address',
  extends: DmnoBaseTypes.string({
    startsWith: '0x',
  }),
  typeDescription: 'Web3 wallet address',
  externalDocs: {
    description: 'understanding web3 wallets',
    url: 'https://algorand.co/learn/what-is-a-web3-wallet#:~:text=At%20its%20core%2C%20a%20Web3,Bitcoin%2C%20Algorand%2C%20and%20NFTs.',
  },
  ui: {
    icon: 'zondicons:wallet',
  },
  validate(val) {
    const settings = this.typeInstanceOptions;
    if (!val.startsWith('0x')) {
      throw new ValidationError('Address must start with 0x');
    }
    try {
      const web3 = new Web3()
      web3.utils.toChecksumAddress(val)
    } catch (e) {
      throw new ValidationError('Invalid web3 address - checksum failed');
    }

    // 😎 special easter-egg for NounsDAO 🔥🔥🔥
    if (settings?.isNounsTokenContract && val !== '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03') {
      throw new ValidationError('Address must be "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03"');
    }
  },
});

const Web3WalletPrivateKey = createDmnoDataType({
  typeLabel: 'web3/privateKey',
  typeDescription: 'Web3 private key',
  sensitive: true,
  externalDocs: {
    description: 'understanding web3 wallets',
    url: 'https://algorand.co/learn/what-is-a-web3-wallet#:~:text=At%20its%20core%2C%20a%20Web3,Bitcoin%2C%20Algorand%2C%20and%20NFTs.',
  },
  ui: {
    icon: 'hugeicons:money-safe',
  },
  validate(val) {
    const valWithPrefix = `0x${val}`;
    if (ethers.utils.isHexString(valWithPrefix) && valWithPrefix.length === 66) {
      return true;
    }
    throw new ValidationError('Private key should be 64 hex characters');
  }
});


export const Web3Types = {
  address: Web3WalletAddress,
  privateKey: Web3WalletPrivateKey,
};
