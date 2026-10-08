"use strict";

const session = require("express-session");
const { random, challengeFor } = require("../core/pkce");
const google = require("../providers/google");

let loginPath = "/auth/google";

const wrap = (fn) => new Promise((resolve, reject) => fn((err) => (err ? reject(err) : resolve())));

function init(app, options = {}) {
  const cfg = {
    baseUrl: process.env.BASE_URL || "http://localhost:3000",
    sessionSecret: process.env.SESSION_SECRET,
    basePath: "/auth",
    successRedirect: "/",
    failureRedirect: "/?login=failed",
    logoutRedirect: "/",
    sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
    store: undefined, // e.g. new RedisStore({ client }); default = in-memory
    provider: null, // default = Google, configured from .env
    onLogin: null, // async (user) => user | void
    ...options,
  };

  if (!cfg.sessionSecret) {
    throw new Error("auth-kit: missing SESSION_SECRET in .env");
  }

  const provider =
    cfg.provider ||
    google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET });

  const isHttps = cfg.baseUrl.startsWith("https://");
  loginPath = `${cfg.basePath}/${provider.name}`;
  const callbackPath = `${loginPath}/callback`;
  const redirectUri = `${cfg.baseUrl}${callbackPath}`;

  if (isHttps) app.set("trust proxy", 1);

  app.use(
    session({
      name: "sid",
      secret: cfg.sessionSecret,
      store: cfg.store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        maxAge: cfg.sessionMaxAgeMs,
      },
    })
  );

  app.use((req, _res, next) => {
    req.user = (req.session && req.session.user) || null;
    next();
  });

  // 1) Redirect to the provider
  app.get(loginPath, (req, res, next) => {
    const state = random();
    const verifier = random(48);
    req.session.oauth = { state, verifier };
    const url = provider.buildAuthUrl({ redirectUri, state, challenge: challengeFor(verifier) });
    req.session.save((err) => (err ? next(err) : res.redirect(url)));
  });

  // 2) Provider redirects back here
  app.get(callbackPath, async (req, res, next) => {
    try {
      const { code, state, error } = req.query;
      const saved = req.session.oauth;
      delete req.session.oauth;

      if (error || !code || !saved || state !== saved.state) {
        return res.redirect(cfg.failureRedirect);
      }

      let user = await provider.fetchUser({ code, verifier: saved.verifier, redirectUri });

      if (typeof cfg.onLogin === "function") {
        const result = await cfg.onLogin(user);
        if (result) user = result;
      }

      await wrap((cb) => req.session.regenerate(cb)); // new session id (anti session-fixation)
      req.session.user = user;
      await wrap((cb) => req.session.save(cb));

      res.redirect(cfg.successRedirect);
    } catch (err) {
      next(err);
    }
  });

  app.get(`${cfg.basePath}/logout`, (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("sid");
      res.redirect(cfg.logoutRedirect);
    });
  });

  app.get(`${cfg.basePath}/me`, (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not logged in" });
    res.json({ user: req.user });
  });
}

function requireLogin(req, res, next) {
  const user = req.session && req.session.user;
  if (user) {
    req.user = user;
    return next();
  }
  if (req.accepts(["html", "json"]) === "json") {
    return res.status(401).json({ error: "Not logged in" });
  }
  res.redirect(loginPath);
}

module.exports = { init, requireLogin };
