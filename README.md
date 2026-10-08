# auth-kit

Plug-and-play OAuth login for Express. Config lives in `.env`, so there are no code changes between projects.
Google is built in; other providers plug in through a tiny interface.

## Quickstart

```bash
npm install express express-session dotenv
```

Copy this folder into your project, then:

```js
require("dotenv").config();
const express = require("express");
const auth = require("./auth-kit");

const app = express();
auth.init(app);

app.get("/dashboard", auth.requireLogin, (req, res) => res.json(req.user));
app.listen(3000);
```

`.env` (see `.env.example`):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BASE_URL=http://localhost:3000
SESSION_SECRET=long-random-string
```

In Google Cloud, the authorized redirect URI must be exactly `{BASE_URL}/auth/google/callback`.

## Routes

| Route | Purpose |
|---|---|
| `GET /auth/google` | Start login |
| `GET /auth/google/callback` | Provider redirects back here |
| `GET /auth/logout` | End session |
| `GET /auth/me` | `{ user }` or 401 |

## Options: `auth.init(app, options)`

| Option | Default | Purpose |
|---|---|---|
| `basePath` | `/auth` | Prefix for all routes |
| `successRedirect` | `/` | After login |
| `failureRedirect` | `/?login=failed` | Denied or invalid state |
| `logoutRedirect` | `/` | After logout |
| `sessionMaxAgeMs` | 7 days | Cookie lifetime |
| `store` | in-memory | Session store (Redis, Mongo...) |
| `provider` | Google from `.env` | Any provider object |
| `onLogin(user)` | none | Save to your DB; return an object to replace `req.user` |

`req.user` is `{ id, name, email, emailVerified, picture, provider }` or `null`.

### Persistent sessions (production)

```js
const { createClient } = require("redis");
const RedisStore = require("connect-redis").default;
const client = createClient(); client.connect();

auth.init(app, { store: new RedisStore({ client }) });
```

### Saving users to your database

```js
auth.init(app, {
  onLogin: async (user) => {
    const row = await db.users.upsert({ googleId: user.id, email: user.email, name: user.name });
    return { ...user, id: row.id, role: row.role }; // becomes req.user
  },
});
```

### Adding another provider (e.g. GitHub)

A provider is a plain object:

```js
{
  name: "github", // route becomes /auth/github
  buildAuthUrl({ redirectUri, state, challenge }) { /* return URL string */ },
  async fetchUser({ code, verifier, redirectUri }) {
    /* exchange code, return { id, name, email, emailVerified, picture, provider } */
  },
}
```

Then `auth.init(app, { provider: myGithubProvider })`. Register `{BASE_URL}/auth/github/callback` with that provider.

## Structure

```
core/pkce.js           state + PKCE helpers (no framework code)
providers/google.js    Google-specific URLs and profile mapping
adapters/express.js    routes, sessions, middleware
index.js               exports
```

Other frameworks (Fastify, Next.js) only need a new adapter. `core` and `providers` stay the same.

## How it works

1. `/auth/google` creates a random `state` and a PKCE `code_verifier`, saves them in the session, and redirects to Google with `state` and the hashed `code_challenge`.
2. Google redirects back with `?code&state`.
3. We check `state` matches the session (blocks forged callbacks / CSRF).
4. The server swaps the `code` + verifier + client secret for a token (server to server).
5. We fetch the profile, normalize it, run `onLogin`, regenerate the session id (anti session-fixation), and store the user.
6. The browser only holds an httpOnly cookie. Secrets and tokens never reach the frontend.

## Notes

- Use HTTPS in production. Secure cookies turn on automatically when `BASE_URL` starts with `https://`.
- If your frontend is on another origin, set `successRedirect` to it and enable CORS with `credentials: true`.
- Never commit `.env`.
