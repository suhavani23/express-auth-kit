"use strict";

// Default export = Express adapter. Core pieces are exposed for other frameworks.
const express = require("./adapters/express");

module.exports = {
  init: express.init,
  requireLogin: express.requireLogin,
  providers: { google: require("./providers/google") },
  core: { pkce: require("./core/pkce") },
};
