"use strict";

/**
 * A provider is any object with:
 *   name                                         e.g. "google" (used in the route: /auth/<name>)
 *   buildAuthUrl({ redirectUri, state, challenge })  -> URL string
 *   fetchUser({ code, verifier, redirectUri })       -> { id, name, email, emailVerified, picture, provider }
 *
 * To add GitHub/Discord later, write another file with the same three things.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function google({ clientId, clientSecret } = {}) {
  if (!clientId || !clientSecret) {
    throw new Error(
      "auth-kit: missing Google credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
    );
  }

  return {
    name: "google",

    buildAuthUrl({ redirectUri, state, challenge }) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "select_account",
      });
      return `${AUTH_URL}?${params}`;
    },

    async fetchUser({ code, verifier, redirectUri }) {
      // Server-to-server: swap the one-time code for an access token
      const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          code_verifier: verifier,
        }),
      });
      if (!tokenRes.ok) {
        throw new Error(`auth-kit: Google token exchange failed (${tokenRes.status}) ${await tokenRes.text()}`);
      }
      const { access_token } = await tokenRes.json();

      const infoRes = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!infoRes.ok) throw new Error(`auth-kit: Google userinfo failed (${infoRes.status})`);
      const p = await infoRes.json();

      return {
        id: p.sub,
        name: p.name,
        email: p.email,
        emailVerified: p.email_verified,
        picture: p.picture,
        provider: "google",
      };
    },
  };
}

module.exports = google;
