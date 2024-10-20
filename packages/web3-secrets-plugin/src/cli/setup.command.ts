import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { kleur, createDmnoPluginCliCommand } from 'dmno/cli-lib';

import { input, confirm, select, password } from '@inquirer/prompts';
import { getGithubProfile, getGithubTeams } from '../lib/github';
import { createNewVaultPkp } from '../lib/pkp';


export const SetupCommand = createDmnoPluginCliCommand({
  name: 'setup',
  summary: 'set up new web3 encrypted vault',
  description: `
  Sets up a new encrypted vault, along with a web3-managed PKP
`,
  examples: [
    {
      command: 'dmno plugin -p vault -- setup',
      description: 'set up a new encrypted vault',
    },
  ],
  async handler(ctx, opts, command) {

    const vaultName = ctx.plugin.inputNodes.fileName.resolvedValue || 'default';

    const mappedToNodePath = ctx.plugin.inputNodes.ghAccessToken.mappedToNodePath;
    if (!mappedToNodePath) {
      throw new Error('You must configure this plugin to set where your github access token will be stored');
    }

    const [, keyItemPath] = mappedToNodePath.split('!');

    const primaryService = ctx.workspace.services[ctx.plugin.parentEntityId];

    const vaultPath = `${primaryService.path}/.dmno/${vaultName}.vault.json`;
    const vaultFileExists = fs.existsSync(vaultPath);

    // we have a key and a vault
    if (vaultFileExists) {
      // TODO: check if everything actually is working?
      console.log([
        'Looks like this vault is already set up!',
      ].join('\n'));
      process.exit(0);
    }
    
    // new vault case - generate new vault and key
    
    console.log('You are about to create a new DMNO web3 encrypted vault');
    console.log('This will generate a new keypair which lives on the decentralized Lit network');
    console.log('> see https://www.litprotocol.com for more info <');

    console.log('Decrypting the sensitive data in this vault will be gated via your membership in GitHub Org "Teams"');
    console.log('You and your team will use Github "Personal Access Tokens" to identify yourself.');

    console.log('First, please go create yourself a new personal access token')

    const ghAccessToken = await password({ message: 'Please paste your new token here:' });

    const envLocalPath = `${primaryService.path}/.dmno/.env.local`;
    let createdEnvLocal = false;
    if (!fs.existsSync(envLocalPath)) {
      fs.writeFileSync(envLocalPath, [
        '# 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑',
        '# DO NOT COMMIT TO VERSION CONTROL',
        '# This file contains local config overrides, some of which are likely sensitive',
        '# 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑 🛑',
        '',
      ].join('\n'));
      createdEnvLocal = true;
    }

    const envFileContents = fs.readFileSync(envLocalPath, 'utf-8');
    if (!envFileContents.includes(`${keyItemPath}=${ghAccessToken}`)) {

      fs.appendFileSync(envLocalPath, [
        '',
        `# Your personal Github access token`,
        `${keyItemPath}=${ghAccessToken}`,
      ].join('\n'));

      console.log([
        `🔏 Your github access token has been written into your ${createdEnvLocal ? '✨NEW✨ ' : ''}.env.local file at`,
        kleur.green(`> ${envLocalPath}`),
      ].join('\n'));
    }


    const profile = await getGithubProfile(ghAccessToken);
    console.log(`Hi ${profile.login}!`);
    

    const originUrl = execSync('git config --get remote.origin.url').toString();
    const [,,,possibleOrgName] = originUrl.replace(/\.git$/, '').split('/');
    console.log(possibleOrgName);
    
    const githubOrg = await input({
      message: 'What Github org should we link this vault to?',
      default: possibleOrgName,
    });
    
    const teams = await getGithubTeams(githubOrg, profile.login, ghAccessToken);
    
    const ownerTeamId: string = await select({
      message: 'Which of your Teams should initially own this vault?',
      choices: teams,
    });

    console.log('OK! We need a web3 wallet to initially set up your new vault. After this, everything should just work, without having to think about crypto');

    const walletPrivateKey = await password({
      message: 'Please paste your wallet private key - it will not be saved or stored, and costs are extremely minimal',
    });

    const pkpInfo = await createNewVaultPkp(ownerTeamId, walletPrivateKey);

    const emptyVaultContents = {
      version: '0.0.1',
      pkpInfo,
      githubOrg,
      items: {},
    };

    console.log([
      '',
      '🔐 A new encryption keypair has been created on the blockchain!',
      '',
      '- anyone can use the key to encrypt secrets',
      '- decryption using the key is gated by github team membership',
      '- your devs must identify themselves using personal github access tokens',
      '',
    ].join('\n'));

    // create vault file (with no items in it)
    fs.writeFileSync(vaultPath, [
      '// 🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒',
      '// 🔒 This file contains encrypted secrets and is intended to be committed into version control',
      '// 🔒 ',
      '// 🔒 See https://dmno.dev for more details',
      '// 🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒🔒',
      '',
      JSON.stringify(emptyVaultContents, null, 2),
    ].join('\n'));

    process.exit(0);

  },
});
