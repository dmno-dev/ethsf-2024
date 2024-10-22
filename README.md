# DMNO - PKP Secret Plugin

> This project was built for [ETHGlobal](https://ethglobal.com/)'s [ETH San Francisco 2024 Hackathon](https://ethglobal.com/events/sanfrancisco2024)

[Hackathon project submission page](https://ethglobal.com/showcase/dmno-pkp-secrets-vaytr)

**Prizes won:**
- Sign Protocol - Best Overall Application
- Sign Protocol - Best Use of Encrypted Attestations
- Lit Protocol - Runner up

----

## What is this?

This hackathon project is a web3-powered plugin for an existing open source devtool called [DMNO](https://dmno.dev). DMNO is a powerful tool for managing configuration and secrets that aims to solve all the common paper-cuts of dealing with config. Aside from validation, coercion, type-safety, composability, and leak prevention, sensitive values can be pulled from various backends using plugins. Currently there are plugins to store secrets in an encrypted file within your repo, 1password, and more (ex: bitwarden, aws, etc) are on the way.

The [existing encrypted file plugin](https://dmno.dev/docs/plugins/encrypted-vault/) uses a single symmetric key which must be shared with all teammates who need access. This is obviously a naive approach and not ideal... Other sensible approaches would require a centralized manager of the private key, which is also not ideal and comes with serious liability/security risks, and compliance requirements.

This hackathon project introduces a new encrypted vault plugin (powered by web3) with a far superior decentralized approach to encryption/decryption. This plugin bridges the gap to web2 by relying on Github for access control, and hiding all web3 interactions after initial setup is complete. Encrypted secrets are still stored in a file within your repository, but encryption uses a PKP (powered by [Lit Protocol](https://www.litprotocol.com/)). Using an on-chain PKP allows all devs to update secret values (encrypting using the public key), but decrypting those secrets can be set using programmable conditions - without ever exposing the private key to anyone.

The plugin uses Github personal access tokens to identify users, and membership in Github org "teams" for access control at the vault level. Secrets can be segmented into multiple vault instances, and access to each vault can be granted to multiple teams, and changed over time, as the access list is stored as on-chain attestations using [Sign Protocol](https://sign.global/).

The goal is to make this all as seamless as possible, and take advantage of the benefits of decentralization, without forcing the end users to deal with wallets/keys/etc. While a wallet is needed to set up the vault (and corresponding PKP), after that everything is handled via github auth tokens, so most users may not even realize they are using web3 at all. Even this is not necessary as a centralized service could handle setting things up for end users, taking fiat payments, and hiding all web3 interactions.

Future work will need to be done to move this onto mainnet, deal with payments and delegation, complete access management, etc...

I ALSO created a simple package with a few web3-related data types for DMNO. This lets us set config items as being web3 addresses and private keys, and we get some basic validations. In the future, I will add more options to check certain conditions as validations - for example checking a balance, or checking that an address is a certain type of contract, etc... This is just generally useful and will help stop typos turning into huge catastrophes.

---

- More info about the plugin and how to set it up is available in the [package's README](./packages/web3-secrets-plugin)
- You can see an example of how the plugin is used in the example repo's [.dmno/config.mts](./example-repo/.dmno/config.mts) file





