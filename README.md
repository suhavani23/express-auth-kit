# 🔐 express-auth-kit

> Add **Google OAuth** and **Email/Password** login to any Express app in under 2 minutes. No complicated setup, no Passport.js boilerplate.

---

## ⚡ What is this?

A drop-in authentication module for Express. It handles:
- **Sign in with Google** (secure PKCE + CSRF protection)
- **Sign in with Email & Password** (built-in secure password hashing)
- **Protected routes** (`auth.requireLogin`)
- **Session management** (safe httpOnly cookies)

Everything is configured through `.env`, so you can plug it into any project without modifying the auth code.

---

## 🚀 3-Minute Quickstart

### Step 1: Install dependencies
In your Express project, run:
```bash
npm install express express-session dotenv
```

### Step 2: Set up `.env`
Create a `.env` file in your project root:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
BASE_URL=http://localhost:3000
SESSION_SECRET=type-any-long-random-secret-string
PORT=3000
```
*(In Google Cloud Console, add `http://localhost:3000/auth/google/callback` to your Authorized Redirect URIs).*

### Step 3: Plug it into your Express server
```javascript
require("dotenv").config();
const express = require("express");
const auth = require("./index"); // or require("express-auth-kit")

const app = express();

// 1. Initialize auth
auth.init(app);

// 2. Protect any route with auth.requireLogin
app.get("/dashboard", auth.requireLogin, (req, res) => {
  res.send(`Welcome back, ${req.user.name}! Your email is ${req.user.email}`);
});

app.listen(3000, () => console.log("Running on http://localhost:3000"));
```

---

## 💻 How to use it in your app

### 1. In your HTML / Frontend:

**Google Login Button:**
```html
<a href="/auth/google">Sign in with Google</a>
```

**Email & Password Login Form:**
```html
<form action="/auth/login" method="POST">
  <input type="email" name="email" placeholder="Email" required />
  <input type="password" name="password" placeholder="Password" required />
  <button type="submit">Log In</button>
</form>
```

**Email & Password Sign Up Form:**
```html
<form action="/auth/register" method="POST">
  <input type="text" name="name" placeholder="Your Name" />
  <input type="email" name="email" placeholder="Email" required />
  <input type="password" name="password" placeholder="Password" required />
  <button type="submit">Create Account</button>
</form>
```

**Logout Link:**
```html
<a href="/auth/logout">Log Out</a>
```

---

### 2. In your Backend routes:

Check if someone is logged in:
```javascript
app.get("/", (req, res) => {
  if (req.user) {
    res.send(`Hello ${req.user.name} (${req.user.email})`);
  } else {
    res.send(`<a href="/auth/google">Please sign in</a>`);
  }
});
```

Protect an entire page or API route:
```javascript
// Automatically redirects non-logged-in users to login:
app.get("/profile", auth.requireLogin, (req, res) => {
  res.json({ user: req.user });
});
```

---

## 📍 Available Routes

| Route | Method | What it does |
|---|---|---|
| `/auth/google` | `GET` | Starts Google login |
| `/auth/google/callback` | `GET` | Google callback URL |
| `/auth/register` | `POST` | Create account with `{ email, password, name }` |
| `/auth/login` | `POST` | Sign in with `{ email, password }` |
| `/auth/logout` | `GET` | Logs user out & clears session |
| `/auth/me` | `GET` | API endpoint: returns current `{ user }` (or 401) |

---

## 💾 Saving Users to your Database (Optional)

Want to save users to MongoDB, Prisma, or PostgreSQL? Just pass `onLogin` into `auth.init()`:

```javascript
auth.init(app, {
  onLogin: async (user) => {
    // Save or update user in your database:
    // const dbUser = await db.user.upsert({ where: { email: user.email }, ... });
    // return { ...user, role: dbUser.role };
  }
});
```

---

## 🧪 Try the live demo
Run the built-in showcase app to test it right away:
```bash
npm start
```
Open **`http://localhost:3000`** in your browser.
