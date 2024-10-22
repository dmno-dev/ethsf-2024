
# @dmno/web3-secrets-plugin

Provides functionality to encrypt and store secrets in the [dmno config engine](https://dmno.dev) using a Programmable Key Pair (PKP) managed by [Lit Protocol](https://www.litprotocol.com/) with decryption gated via Github team membership.

> _This is a hackathon project and not yet ready for production use!_<br/>
> _Check the [DMNO](https://dmno.dev) docs for the latest updates and production ready plugins!_

## Plugin

### Setup

You must create an instance of the plugin in your `.dmno/config.mts` file, giving it an id which you will use when referencing it from the CLI.

If using a single instance, you can use something like `vault`.

Ideally you should segment your secrets into multiple vaults, following the [principle of least privilege](https://www.paloaltonetworks.com/cyberpedia/what-is-the-principle-of-least-privilege). At the very least, you should have a vault for production secrets, and another for everything else - so you could use ids like `vault/prod` and `vault/dev`.

However for this example code we'll just us a single vault.

```typescript
const vaultPlugin = new Web3VaultDmnoPlugin('vault');

// or with a fileName specified
const prodVaultPlugin = new Web3VaultDmnoPlugin('vault/prod', { fileName: 'prod'});
```

Because the plugin will use a Github personal access token to authorize decryption requests, you must add it to the schema. You could wire the plugin up to this token explicitly, but it will detect it automatically based on the type.

Your config should end up looking something like this:
```ts
import { DmnoBaseTypes, defineDmnoService } from 'dmno';
import { Web3VaultDmnoPlugin, Web3VaultTypes } from '@dmno/web3-secrets-plugin';

const vault = new Web3VaultDmnoPlugin('vault');

export default defineDmnoService({
  isRoot: true,
  schema: {
    GH_TOKEN: {
      extends: Web3VaultTypes.githubPersonalAccessToken,
    },
  },
});
```

#### Github setup

**Teams**

Vault access will use github "teams" to control access. So you'll need to set up teams accordingly. Usually this would at least look like a "Superadmins" team (who can access everything) and a "Developers" team that can access everything else. You may already have teams like this set up!

**Access tokens**

Each developer (including you!) will need a "Personal access token" that they will use to prove their identity, which lets them decrypt the secrets in the vault.

**You will need to do this right away to set up the vault!**

- Go to: **Profile > Developer Settings > Personal Access Tokens > Fine-grained tokens**
  Or [click here](https://github.com/settings/tokens?type=beta) to go directly
- Click `Generate new token`
- Give your token a name, like "DMNO vault access"
- Set resource owner to your github org
- Set expiration to anything under 1 year (many orgs will not allow never-ending tokens)
- Click `Organization Permissions` and grant _read-only_ access to `Members`
- Click `Generate token`
- Copy the token!

While setting up the vault, the plugin will add this token to your local `.env.local` file. Other devs just trying to use secrets can just add it to their's directly.

#### Crypto wallet

You will need a crypto wallet that has a tiny bit of ETH to set up the PKP.

Currently it is using the [Optimism Sepolia](https://sepolia-optimism.etherscan.io/) test-network.

The setup command will ask for your wallet private key - it will be used only to set up the PKP and then discarded. Costs are minimal...

**In the future this will likely all be handled for you, and payment will happen some other way!**



#### Run the setup wizard
You need to reference your plugin instance using the ID you set in your schema. For example if you used `vault` you would run `pnpm exec dmno plugin -p vault -- setup`

Follow the instructions and it will create your PKP and set up your vault file.

#### Wire up vault items in your schema!

Now you can wire up individual items to the vault using the value resolver function, and use cli commands to manage item values. More details below.

### Value Resolvers

Items in your schema should be marked as living in the vault using the `vaultInstance.item()` resolver. For example: 

```
  //...
  schema: {
    SOME_SECRET: {
      value: vault.item(),
      // ... the rest of your settings for the item
    },
  },
```


### Editing items in the vault

In most cases, you should use the upsert and you'll be able to select from all items in your schema that are marked as living in this vault.
- `pnpm exec dmno plugin -p <vault> -- upsert`

Or `add` to filter items that are empty
- `pnpm exec dmno plugin -p <vault> -- add`

Or `update` to filter items that are not empty
- `pnpm exec dmno plugin -p <vault> -- update`

Delete will let you select items to delete (or you can edit the vault file directly...)
- `pnpm exec dmno plugin -p <vault> -- delete`
