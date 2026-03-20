const { Issuer } = require('openid-client');

let oidcClient = null;

async function initOidcClient() {
  const issuerUrl = process.env.OIDC_ISSUER_URL;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const redirectUri = process.env.OIDC_REDIRECT_URI;

  if (!issuerUrl || !clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'OIDC is not configured. Required env vars: OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI'
    );
  }

  const issuer = await Issuer.discover(issuerUrl);
  console.log('OIDC: Discovered issuer %s', issuer.issuer);

  oidcClient = new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
    response_types: ['code'],
  });

  return oidcClient;
}

function getOidcClient() {
  if (!oidcClient) {
    throw new Error('OIDC client not initialized. Call initOidcClient() first.');
  }
  return oidcClient;
}

module.exports = { initOidcClient, getOidcClient };
