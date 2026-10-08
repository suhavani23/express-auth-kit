# express-auth-kit

Plug-and-play authentication engine for Express. Supports **Google OAuth (PKCE)** and **native Email/Password authentication** out of the box with zero external crypto dependencies.

Config lives in `.env`, so there are no code changes between projects.

---

## Features

- 🔐 **Google OAuth 2.0**: RFC 7636 PKCE (S256) + cryptographic `state` CSRF protection.
- ✉️ **Native Email & Password**: Built-in registration and login using Node's native `crypto.scrypt` hashing with timing-safe validation.
- 🍪 **Hardened Sessions**: Anti session-fixation ID rotation on login, httpOnly cookies, Lax/Secure flags.
- 🔌 **Pluggable Architecture**: Modular providers and framework adapters.
- ⚡ **Zero External Crypto Dependencies**: No native node-gyp or bcrypt compilation required.

---

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

// Protected route
app.get("/dashboard", auth.requireLogin, (req, res) => res.json(req.user));

app.listen(3000);
```

`.env` (see `.env.example`):

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
BASE_URL=http://localhost:3000
SESSION_SECRET=long-random-string
PORT=3000
```

In Google Cloud Console, ensure the authorized redirect URI matches `{BASE_URL}/auth/google/callback`.

---

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/auth/google` | `GET` | Starts Google OAuth flow with PKCE |
| `/auth/google/callback` | `GET` | Google redirects back here |
| `/auth/register` | `POST` | Register with `{ email, password, name? }` |
| `/auth/login` | `POST` | Sign in with `{ email, password }` |
| `/auth/logout` | `GET` | Destroys session and clears cookie |
| `/auth/me` | `GET` | Returns `{ user }` or `401 Unauthorized` |

---

## Options: `auth.init(app, options)`

| Option | Default | Purpose |
|---|---|---|
| `basePath` | `/auth` | Prefix for all routes |
| `successRedirect` | `/` | Redirect URL after successful login |
| `failureRedirect` | `/?login=failed` | Redirect URL on error |
| `logoutRedirect` | `/` | Redirect URL after logout |
| `sessionMaxAgeMs` | 7 days | Session cookie lifetime |
| `store` | in-memory | Session store (e.g. `connect-redis`, `connect-mongo`) |
| `provider` | Google from `.env` | Any OAuth provider object |
| `passwordAuth` | `true` | Enable/disable email and password auth |
| `findUser` | `null` | Custom async hook: `(email) => userWithHash` |
| `createUser` | `null` | Custom async hook: `({ id, name, email, passwordHash }) => user` |
| `onLogin(user)` | `null` | Hook run after any login/register to sync with your DB |

`req.user` is `{ id, name, email, emailVerified, picture, provider }` or `null`.

---

### Saving users to your database (Prisma / Mongoose / SQL)

```js
auth.init(app, {
  // Sync OAuth & email users into your database:
  onLogin: async (user) => {
    const row = await db.users.upsert({
      where: { email: user.email },
      update: { name: user.name, picture: user.picture },
      create: { email: user.email, name: user.name, provider: user.provider },
    });
    return { ...user, dbId: row.id, role: row.role }; // becomes req.user
  },

  // Optional: delegate password user lookups directly to your database
  findUser: async (email) => {
    return await db.users.findUnique({ where: { email } });
  },
  createUser: async ({ id, name, email, passwordHash }) => {
    return await db.users.create({ data: { id, name, email, passwordHash, provider: "local" } });
  },
});
```

---

### Persistent sessions (production)

```js
const { createClient } = require("redis");
const RedisStore = require("connect-redis").default;
const client = createClient();
client.connect();

auth.init(app, { store: new RedisStore({ client }) });
```

---

### Project Structure

```
core/
  pkce.js             State + PKCE helpers (RFC 7636)
  password.js         Native scrypt hashing & timing-safe equality check
providers/
  google.js           Google-specific URLs and profile mapping
adapters/
  express.js          Express routes, sessions, middleware
index.js              Public API exports
example.js            Showcase demo app with modern UI
```

---

## Security Notes

- **PKCE (S256)**: Verifies the code exchange server-to-server with high entropy verifiers.
- **CSRF State**: Unique random cryptographically generated `state` verified on callback.
- **Anti Session-Fixation**: Re-generates session ID upon login so malicious pre-session cookies cannot hijack the account.
- **Native scrypt**: Modern, memory-hard hashing resistant to GPU brute-forcing.
- **HTTPS in Production**: Secure cookie flag activates automatically when `BASE_URL` begins with `https://`.
