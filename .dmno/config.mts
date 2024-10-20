import { DmnoBaseTypes, defineDmnoService } from 'dmno';



export default defineDmnoService({
  isRoot: true,
  settings: {
    redactSensitiveLogs: true,
    interceptSensitiveLeakRequests: true,
    preventClientLeaks: true,
  },
  name: 'root',
  schema: {
    GH_TOKEN: { required: true },
    WALLET_ADDRESS: { required: true },
    WALLET_PRIVATE_KEY: { required: true }
  },
});
