"use strict";

const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const { random, challengeFor } = require("../core/pkce");
const { hashPassword, verifyPassword } = require("../core/password");
const google = require("../providers/google");

let loginPath = "/auth/google";

const wrap = (fn) => new Promise((resolve, reject) => fn((err) => (err ? reject(err) : resolve())));

// In-memory fallback user registry for email/password authentication
const memoryUsers = new Map();

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
    passwordAuth: true, // enable email/password registration & login
    findUser: null, // async (email) => { id, name, email, passwordHash } | null
    createUser: null, // async ({ id, name, email, passwordHash }) => user
    ...options,
  };

  if (!cfg.sessionSecret) {
    throw new Error("auth-kit: missing SESSION_SECRET in .env");
  }

  // Ensure body parsing is available for POST /auth/register and /auth/login
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

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

  // ==========================================
  // 1) OAuth Provider Routes (e.g. Google)
  // ==========================================

  // Redirect to provider
  app.get(loginPath, (req, res, next) => {
    const state = random();
    const verifier = random(48);
    req.session.oauth = { state, verifier };
    const url = provider.buildAuthUrl({ redirectUri, state, challenge: challengeFor(verifier) });
    req.session.save((err) => (err ? next(err) : res.redirect(url)));
  });

  // Provider callback
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

  // ==========================================
  // 2) Native Email & Password Authentication
  // ==========================================
  if (cfg.passwordAuth) {
    // POST /auth/register
    app.post(`${cfg.basePath}/register`, async (req, res, next) => {
      try {
        const { email, password, name } = req.body || {};

        if (!email || typeof email !== "string" || !email.includes("@")) {
          return respondError(req, res, "Invalid email address", 400, cfg.failureRedirect);
        }
        if (!password || typeof password !== "string" || password.length < 6) {
          return respondError(req, res, "Password must be at least 6 characters", 400, cfg.failureRedirect);
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        let existing = null;
        if (typeof cfg.findUser === "function") {
          existing = await cfg.findUser(normalizedEmail);
        } else {
          existing = memoryUsers.get(normalizedEmail);
        }

        if (existing) {
          return respondError(req, res, "Email is already registered", 409, cfg.failureRedirect);
        }

        const passwordHash = await hashPassword(password);
        const id = crypto.randomUUID ? crypto.randomUUID() : random(16);
        const displayName = (name && typeof name === "string" && name.trim()) || normalizedEmail.split("@")[0];

        let user = {
          id,
          name: displayName,
          email: normalizedEmail,
          emailVerified: false,
          picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(normalizedEmail)}`,
          provider: "local",
        };

        if (typeof cfg.createUser === "function") {
          const dbUser = await cfg.createUser({ id, name: displayName, email: normalizedEmail, passwordHash });
          if (dbUser) user = dbUser;
        } else {
          memoryUsers.set(normalizedEmail, { ...user, passwordHash });
        }

        if (typeof cfg.onLogin === "function") {
          const result = await cfg.onLogin(user);
          if (result) user = result;
        }

        await wrap((cb) => req.session.regenerate(cb));
        req.session.user = user;
        await wrap((cb) => req.session.save(cb));

        if (wantsJson(req)) {
          return res.status(201).json({ success: true, user });
        }
        res.redirect(cfg.successRedirect);
      } catch (err) {
        next(err);
      }
    });

    // POST /auth/login
    app.post(`${cfg.basePath}/login`, async (req, res, next) => {
      try {
        const { email, password } = req.body || {};

        if (!email || !password) {
          return respondError(req, res, "Email and password are required", 400, cfg.failureRedirect);
        }

        const normalizedEmail = email.toLowerCase().trim();

        let account = null;
        if (typeof cfg.findUser === "function") {
          account = await cfg.findUser(normalizedEmail);
        } else {
          account = memoryUsers.get(normalizedEmail);
        }

        if (!account || !account.passwordHash) {
          return respondError(req, res, "Invalid email or password", 401, `${cfg.failureRedirect}?error=invalid_credentials`);
        }

        const isValid = await verifyPassword(password, account.passwordHash);
        if (!isValid) {
          return respondError(req, res, "Invalid email or password", 401, `${cfg.failureRedirect}?error=invalid_credentials`);
        }

        let user = {
          id: account.id,
          name: account.name,
          email: account.email,
          emailVerified: Boolean(account.emailVerified),
          picture: account.picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(normalizedEmail)}`,
          provider: "local",
        };

        if (typeof cfg.onLogin === "function") {
          const result = await cfg.onLogin(user);
          if (result) user = result;
        }

        await wrap((cb) => req.session.regenerate(cb));
        req.session.user = user;
        await wrap((cb) => req.session.save(cb));

        if (wantsJson(req)) {
          return res.json({ success: true, user });
        }
        res.redirect(cfg.successRedirect);
      } catch (err) {
        next(err);
      }
    });
  }

  // ==========================================
  // 3) Common Session & Profile Routes
  // ==========================================

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

function wantsJson(req) {
  return (
    req.headers["content-type"] === "application/json" ||
    req.headers.accept?.includes("application/json") ||
    req.xhr
  );
}

function respondError(req, res, message, status, fallbackRedirect) {
  if (wantsJson(req)) {
    return res.status(status).json({ error: message });
  }
  res.redirect(`${fallbackRedirect}?error=${encodeURIComponent(message)}`);
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
