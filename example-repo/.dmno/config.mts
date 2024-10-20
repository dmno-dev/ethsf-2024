import { DmnoBaseTypes, defineDmnoService } from 'dmno';
import { Web3VaultDmnoPlugin, Web3VaultTypes } from '@dmno/web3-secrets-plugin';

const vault = new Web3VaultDmnoPlugin('vault');

// const prodVault = new Web3VaultDmnoPlugin('vault/prod', { fileName: 'prod' });
// const devVault = new Web3VaultDmnoPlugin('vault/dev', { fileName: 'dev' })

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

    SOME_SECRET: {
      extends: DmnoBaseTypes.string({ startsWith: 'abc_' }),
      value: vault.item(),
    },
  },
});
