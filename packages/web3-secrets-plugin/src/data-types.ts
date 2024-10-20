import { DmnoBaseTypes, createDmnoDataType } from 'dmno';

// TODO: move to core - with the other github stuff...
const GithubPersonalAccessToken = createDmnoDataType({
  typeLabel: 'github/personal-access-token',
  extends: DmnoBaseTypes.string({
    startsWith: 'github_pat_',
  }),
  typeDescription: 'Github personal access token',
  externalDocs: {
    description: 'github docs',
    url: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
  },
  ui: {
    icon: 'mdi:github-box',
  },
  sensitive: true,
});


export const Web3VaultTypes = {
  githubPersonalAccessToken: GithubPersonalAccessToken,
};
