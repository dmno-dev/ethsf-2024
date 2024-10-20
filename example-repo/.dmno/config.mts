import { DmnoBaseTypes, defineDmnoService, switchBy } from 'dmno';
import { Web3VaultDmnoPlugin, Web3VaultTypes } from '@dmno/web3-secrets-plugin';
import { Web3Types } from '@dmno/web3-data-types';

const vault = new Web3VaultDmnoPlugin('vault');

export default defineDmnoService({
  isRoot: true,
  settings: {
    redactSensitiveLogs: true,
    interceptSensitiveLeakRequests: true,
    preventClientLeaks: true,
  },
  name: 'root',
  schema: {
    GH_TOKEN: {
      extends: Web3VaultTypes.githubPersonalAccessToken,
    },
    DMNO_ENV: {
      value: 'development',
    },
    WALLET_ADDRESS: {
      value: '0x7f448FA8cc5db07E8e4eF382B6453b91Bd9B05a6',
      extends: Web3Types.address,
      required: true,
    },
    WALLET_PRIVATE_KEY: {
      extends: Web3Types.privateKey,
    },

    NOUNS_CONTRACT: {
      extends: Web3Types.address({ isNounsTokenContract: true }),
      summary: 'special NOUNS easter egg!',
      value: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
    },

    SOME_SECRET: {
      extends: DmnoBaseTypes.string({ startsWith: 'abc_' }),
      value: vault.item(),
      sensitive: {
        redactMode: 'show_last_2',
      }
    },

    SWITCHED_VAL: {
      sensitive: true,
      value: switchBy('DMNO_ENV', {
        _default: 'not-sensitive',
        production: vault.item(),
      })
    },
  },
});
