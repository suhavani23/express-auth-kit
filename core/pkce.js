"use strict";
const crypto = require("crypto");

/** Random URL-safe string (used for `state` and the PKCE verifier). */
const random = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

/** PKCE: code_challenge = BASE64URL(SHA256(code_verifier)) */
const challengeFor = (verifier) =>
  crypto.createHash("sha256").update(verifier).digest("base64url");

module.exports = { random, challengeFor };
