import { DmnoBaseTypes, defineDmnoService, switchBy } from 'dmno';
import { Web3VaultDmnoPlugin, Web3VaultTypes } from '@dmno/web3-secrets-plugin';

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
