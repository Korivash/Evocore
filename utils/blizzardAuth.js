const fetch = require("node-fetch");
const querystring = require("querystring");

const clientId = process.env.BLIZZARD_CLIENT_ID;
const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
const redirectUri = process.env.BLIZZARD_REDIRECT_URI;

function getBlizzardAuthUrl(region = "us", state = "") {
  const params = querystring.stringify({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "wow.profile",
    state, // Discord user ID
  });
  return `https://${region}.battle.net/oauth/authorize?${params}`;
}

async function exchangeCodeForToken(code, region = "us") {
  const res = await fetch(`https://${region}.battle.net/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`,
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

async function fetchCurrentKeystone(region, token) {
  const res = await fetch(
    `https://${region}.api.blizzard.com/profile/user/wow?namespace=profile-${region}&locale=en_US`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(`Keystone fetch failed: ${res.status}`);
  return res.json();
}

module.exports = {
  getBlizzardAuthUrl,
  exchangeCodeForToken,
  fetchCurrentKeystone,
};

