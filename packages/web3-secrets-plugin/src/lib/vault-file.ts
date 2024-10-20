import { PkpInfo } from "./pkp";

export type VaultFile = {
  version: string,
  pkpInfo: PkpInfo,
  githubOrg: string,
  items: Record<string, {
    encryptedValue: string,
    updatedAt: string,
  }>
};
