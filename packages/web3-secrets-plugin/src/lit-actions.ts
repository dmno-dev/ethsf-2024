
export const foo = 1;

// async function noopAccess() {
//   LitActions.setResponse({ response: "true" });
// }

// async function simpleGhAccess() {
//   const GIHUB_GQL_URL = 'https://api.github.com/graphql';
//   const profileReq = await fetch('https://api.github.com/user', {
//     headers: {
//       accept: 'application/vnd.github+json',
//       Authorization: `Bearer ${ghAccessToken}`,
//       'X-GitHub-Api-Version': '2022-11-28',
//     }
//   })
//   const profileJson: any = await profileReq.json();
//   const { login: githubUsername } = profileJson;

//   LitActions.setResponse({ response: githubUsername === 'theoephraim' ? "true" : "false" });
// }

// export const simpleGithubCheckLitActionCode = `(${simpleGhAccess.toString()})();`;

async function checkGithubAccess() {

  // INPUT PARAMS - passed in by lit  
  // githubAccessToken
  // githubOrg
  // const signSchemaFullId = 'onchain_evm_11155420_0x47';

  // const pkpEthAddress = '0x9Beb8d651076a811CdF3A5DFf088dF94A22F436A';

  // githubOrg: string, githubAccessToken: string, teamId: string
  const GIHUB_GQL_URL = 'https://api.github.com/graphql';
  const profileReq = await fetch('https://api.github.com/user', {
    headers: {
      accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubAccessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    }
  })
  const profileJson: any = await profileReq.json();
  const { login: githubUsername } = profileJson;

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
  const userTeamIds = teamsResponseJson.data.organization.teams.edges.map((e) => e.node.id);

  return LitActions.setResponse({
    response: JSON.stringify({
      allowed: "true",
      userTeamIds,
      signSchemaFullId,
      pkpEthAddress,
    })
  });
}

export const checkGithubAccessCode = `(${checkGithubAccess.toString()})();`;


async function decryptLitAction() {

  const authSession = JSON.parse(Lit.Auth.customAuthResource);

  const pkpEthAddress = authSession.pkpEthAddress;
  console.log('PKP ADDRESS!', pkpEthAddress);
  // console.log(Lit.Auth);

  const qParams = [
    `schemaId=${authSession.signSchemaFullId}`,
    `indexingValue=${pkpEthAddress}`
  ].join('&')

  const result = await fetch(`https://testnet-rpc.sign.global/api/index/attestations?${qParams}`);
  const resultJson: any = await result.json();

  console.log(resultJson);

  const nonRevoked = resultJson.data.rows.filter((r: any) => !r.revoked);

  const abiCoder = new ethers.utils.AbiCoder();

  const encryptedTeamIds = nonRevoked.map((a: any) => {
    // decoding without sign's sdk...
    const types = a.schema.data.map((i: any) => i.type);
    const decoded = abiCoder.decode(types, a.data);
    return decoded[1];
  });


  const accessControlConditions = [{
    contractAddress: '',
    standardContractType: '',
    chain: "ethereum",
    method: '',
    parameters: [
      ':userAddress',
    ],
    returnValueTest: {
      comparator: '=',
      value: pkpEthAddress,
    }
  }];

  const allowedTeamIds: Array<string> = [];
  for (const item of encryptedTeamIds) {
    const [ciphertext, dataToEncryptHash] = item.split(':::');
    const decryptedTeamId = await Lit.Actions.decryptAndCombine({
      accessControlConditions,
      ciphertext,
      dataToEncryptHash,
      authSig: null,
      chain: 'ethereum',
    });
    allowedTeamIds.push(decryptedTeamId)
  }
  
  console.log('user team ids', authSession.userTeamIds);
  console.log('allowed ids', allowedTeamIds);

  const intersectingIds = authSession.userTeamIds.filter((id) => allowedTeamIds.includes(id));
  const allowed = intersectingIds.length > 0;


  const [ciphertext, dataToEncryptHash] = encryptedCombined.split(':::');

  if (!allowed) throw new Error('not allowed!');
  
  const decryptedData = await Lit.Actions.decryptAndCombine({
    accessControlConditions,
    ciphertext,
    dataToEncryptHash,
    authSig: null,
    chain: 'ethereum',
  });
  
  decryptedData
  return LitActions.setResponse({
    response: JSON.stringify(decryptedData)
  });
}

export const decryptLitActionCode = `(${decryptLitAction.toString()})();`;
