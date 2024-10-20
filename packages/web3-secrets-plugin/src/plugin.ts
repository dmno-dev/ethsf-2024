import fs from 'node:fs';
import * as _ from 'lodash-es';
import { parse as parseJSONC } from 'jsonc-parser';
import {
  DmnoPlugin,
  ResolutionError,
  DmnoConfigraphServiceEntity,
  PluginInputValue,
  inject,
} from 'dmno';

import { name as thisPackageName, version as thisPackageVersion } from '../package.json';

import { Web3VaultTypes } from './data-types';
import { decryptData, PkpInfo } from './lib/pkp';
import { VaultFile } from './lib/vault-file';

const __dirname = globalThis.__dirname ?? import.meta.dirname;
const __filename = globalThis.__filename ?? import.meta.filename;

export class EncryptedVaultItem {
  constructor(
    readonly serviceName: string,
    readonly path: string,
    readonly encryptedValue: string,
    readonly updatedAt = new Date(),
  ) {}
}

export class Web3VaultDmnoPlugin extends DmnoPlugin {
  constructor(
    instanceId: string,
    inputValues?: {
      fileName?: string,
      ghAccessToken?: PluginInputValue,
    },
  ) {
    super(instanceId, {
      inputSchema: {
        fileName: {
          description: 'the name of the vault - will be used in the vault filename',
          extends: 'string',
          value: inputValues?.fileName,
        },
        ghAccessToken: {
          description: 'personal github access token used to identify devs during local dev',
          extends: Web3VaultTypes.githubPersonalAccessToken,
          value: inject(),
        },
      },
    });
  }

  static cliPath = `${__dirname}/cli/cli`;
  static pluginPackageName = thisPackageName;
  static pluginPackageVersion = thisPackageVersion;

  icon = 'ri:lock-star-fill'; // lock with a star

  private vaultFilePath?: string;
  private vaultFileLoaded = false;
  private pkpInfo?: PkpInfo;
  private githubOrg?: string;
  private vaultItems: Record<string, EncryptedVaultItem> = {};
  private async loadVaultFile() {
    const parentDmnoService = this.internalEntity?.parentEntity;
    if (!parentDmnoService) {
      throw new Error('plugin must be owned by an entity');
    }
    if (!(parentDmnoService instanceof DmnoConfigraphServiceEntity)) {
      throw new Error('parent must be a DMNO service');
    }
    const servicePath = parentDmnoService.getMetadata('path');

    this.vaultFilePath = `${servicePath}/.dmno/${this.inputValue('fileName') || 'default'}.vault.json`;
    const vaultFileRaw = await fs.promises.readFile(this.vaultFilePath, 'utf-8');
    const vaultFileObj = parseJSONC(vaultFileRaw.toString())  as VaultFile;
    this.pkpInfo = vaultFileObj.pkpInfo;
    this.githubOrg = vaultFileObj.githubOrg;

    for (const key in vaultFileObj.items) {
      const vaultFileItem = vaultFileObj.items[key];
      const [serviceName, path] = key.split('!');
      this.vaultItems[key] = new EncryptedVaultItem(
        serviceName,
        path,
        vaultFileItem.encryptedValue,
        new Date(vaultFileItem.updatedAt),
      );
    }
  }

  item() {
    return this.createResolver({
      label: 'web3 encrypted vault item',
      resolve: async (ctx) => {
        // probably should be triggered by some lifecycle hook rather than here?
        if (!this.vaultFileLoaded) await this.loadVaultFile();


        // console.log(ctx);

        const vaultItem = this.vaultItems[ctx.resolverFullPath];
        if (!vaultItem) throw new ResolutionError(`Item not found - ${ctx.entityId} / ${ctx.resolverFullPath}`);

        const ghToken = this.inputValue('ghAccessToken') as string;
        if (!ghToken) throw new ResolutionError('Missing github token');

        const decrypted = await decryptData(
          this.pkpInfo!,
          this.githubOrg!,
          ghToken,
          vaultItem.encryptedValue
        );
        return decrypted as string;
      },
    });
  }
}
