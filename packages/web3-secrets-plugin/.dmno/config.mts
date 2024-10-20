import { DmnoBaseTypes, defineDmnoService } from 'dmno';

export default defineDmnoService({
  pick: ['GH_TOKEN', 'WALLET_ADDRESS', 'WALLET_PRIVATE_KEY'],
  schema: {},
});
