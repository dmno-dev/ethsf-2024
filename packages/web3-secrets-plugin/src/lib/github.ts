const GIHUB_GQL_URL = 'https://api.github.com/graphql';



export async function getGithubTeams(githubOrg: string, githubUsername: string, githubAccessToken: string) {
  const gqlQuery = `{
    organization(login: "${githubOrg}") {
      teams(first: 100, userLogins: ["${githubUsername}"]) {
        totalCount
        edges {
          node {
            id
            name
            description
          }
        }
      }
    }
  }`;

  const teamsResponse = await fetch(GIHUB_GQL_URL, {
    method: 'post',
    body: JSON.stringify({ query: gqlQuery }),
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
    }
  });
  const teamsResponseJson: any = await teamsResponse.json();
  const teamsData = teamsResponseJson.data.organization.teams.edges.map((e: any) => ({ value: e.node.id, name: e.node.name}));
  return teamsData;
}

export async function getGithubProfile(githubAccessToken: string) {
  const profileReq = await fetch('https://api.github.com/user', {
    headers: {
      accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubAccessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    }
  })
  const profile: any = await profileReq.json();
  return profile;
}
