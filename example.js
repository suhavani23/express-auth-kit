require("dotenv").config();
const express = require("express");
const auth = require("./index");

const app = express();

auth.init(app, {
  // Optional: save the user to your own database here.
  onLogin: async (user) => {
    console.log("User logged in:", user.email);
    // const row = await db.users.upsert({ googleId: user.id, ...user });
    // return { ...user, id: row.id, role: row.role };
  },
});

app.get("/", (req, res) => {
  if (req.user) {
    return res.send(`
      <h2>Hi ${req.user.name}</h2>
      <img src="${req.user.picture}" width="64" referrerpolicy="no-referrer" />
      <p>${req.user.email}</p>
      <p><a href="/dashboard">Dashboard (protected)</a> | <a href="/auth/logout">Log out</a></p>
    `);
  }
  res.send(`<h2>Not logged in</h2><a href="/auth/google">Sign in with Google</a>`);
});

app.get("/dashboard", auth.requireLogin, (req, res) => {
  res.json({ message: "Only logged-in users see this", user: req.user });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on http://localhost:${port}`));
