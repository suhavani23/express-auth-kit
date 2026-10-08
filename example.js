require("dotenv").config();
const express = require("express");
const auth = require("./index");

const app = express();

auth.init(app, {
  // Optional: hook to persist or enrich user data upon login
  onLogin: async (user) => {
    console.log("⚡ User logged in successfully:", user.email);
    // const row = await db.users.upsert({ googleId: user.id, ...user });
    // return { ...user, id: row.id, role: row.role };
  },
});

// Shared layout styling helper for portfolio-grade aesthetic
function renderPage({ title, content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | AuthKit Express</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(17, 24, 39, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --accent: #38bdf8;
      --success: #10b981;
      --danger: #ef4444;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(56, 189, 248, 0.12) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(139, 92, 246, 0.08) 0px, transparent 50%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .container {
      width: 100%;
      max-width: 560px;
      animation: fadeIn 0.4s ease-out;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      margin-bottom: 1.25rem;
    }

    .card {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 2.25rem;
      box-shadow: 
        0 20px 40px -15px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #ffffff 40%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 1.75rem;
    }

    .btn-google {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      background: #ffffff;
      color: #1f2937;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 0.85rem 1.25rem;
      border-radius: 12px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      margin-bottom: 1.75rem;
    }

    .btn-google:hover {
      background: #f8fafc;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 255, 255, 0.15);
    }

    .btn-google svg {
      width: 20px;
      height: 20px;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 1.5rem;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .feature-icon {
      color: var(--accent);
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    /* Logged-in profile styles */
    .profile-header {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }

    .avatar-wrapper {
      position: relative;
    }

    .avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: 3px solid rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.35);
      object-fit: cover;
    }

    .status-dot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      background: var(--success);
      border: 2px solid var(--bg);
      border-radius: 50%;
    }

    .profile-info h2 {
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .profile-email {
      color: var(--text-muted);
      font-size: 0.88rem;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .action-group {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.65rem 1.15rem;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      border: 1px solid transparent;
    }

    .btn-primary {
      background: var(--primary);
      color: #ffffff;
    }
    .btn-primary:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--text);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .code-viewer {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 1rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      color: #a5b4fc;
      overflow-x: auto;
      max-height: 220px;
      margin-top: 1rem;
    }

    .footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.78rem;
      color: #6b7280;
    }

    .footer a {
      color: #818cf8;
      text-decoration: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align: center;">
      <span class="header-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        AuthKit Express • v0.2.0
      </span>
    </div>
    
    <div class="card">
      ${content}
    </div>

    <div class="footer">
      Drop-in OAuth module for Express apps &nbsp;•&nbsp; 
      <a href="https://github.com/suhavani23/express-auth-kit" target="_blank">View on GitHub</a>
    </div>
  </div>
</body>
</html>`;
}

// 1) Home page route
app.get("/", (req, res) => {
  if (req.user) {
    const content = `
      <div class="profile-header">
        <div class="avatar-wrapper">
          <img class="avatar" src="${req.user.picture || 'https://via.placeholder.com/72'}" referrerpolicy="no-referrer" alt="${req.user.name}" />
          <span class="status-dot"></span>
        </div>
        <div class="profile-info">
          <h2>${req.user.name}</h2>
          <div class="profile-email">
            ${req.user.email}
            ${req.user.emailVerified ? '<span class="badge-verified">✓ Verified</span>' : ''}
          </div>
        </div>
      </div>

      <div class="action-group">
        <a href="/dashboard" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Protected Dashboard
        </a>
        <a href="/auth/logout" class="btn btn-danger">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </a>
      </div>

      <div style="margin-top: 1.25rem;">
        <span style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700;">Active Session Payload (req.user)</span>
        <pre class="code-viewer"><code>${JSON.stringify(req.user, null, 2)}</code></pre>
      </div>
    `;
    return res.send(renderPage({ title: "Account", content }));
  }

  const content = `
    <h1>Welcome to AuthKit</h1>
    <p class="subtitle">A secure, zero-config OAuth login engine for Express with PKCE (S256), CSRF state validation, and httpOnly cookie sessions.</p>

    <a href="/auth/google" class="btn-google">
      <svg viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      Continue with Google
    </a>

    <div class="feature-grid">
      <div class="feature-item">
        <span class="feature-icon">🔒</span>
        <div><strong>RFC 7636 PKCE (S256):</strong> Protects authorization code swaps from interception.</div>
      </div>
      <div class="feature-item">
        <span class="feature-icon">🛡️</span>
        <div><strong>Cryptographic State:</strong> Built-in anti-CSRF token verification per request.</div>
      </div>
      <div class="feature-item">
        <span class="feature-icon">🍪</span>
        <div><strong>Anti Session-Fixation:</strong> Regenerates session IDs automatically on login.</div>
      </div>
    </div>
  `;
  return res.send(renderPage({ title: "Sign In", content }));
});

// 2) Protected route showcase
app.get("/dashboard", auth.requireLogin, (req, res) => {
  // If API / JSON requested
  if (req.query.format === "json" || req.headers.accept?.includes("application/json")) {
    return res.json({ message: "Only authenticated sessions can view this", user: req.user });
  }

  const content = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
      <span class="badge-verified" style="font-size: 0.8rem; padding: 0.3rem 0.75rem;">
        🔒 Protected Route (auth.requireLogin)
      </span>
      <a href="/" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem;">Back to Home</a>
    </div>

    <h1>Secret Dashboard Area</h1>
    <p class="subtitle">This route is protected by <code>auth.requireLogin</code>. If you weren't authenticated, Express would have automatically redirected you to the Google login page.</p>

    <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
      <div style="font-weight: 700; color: #c7d2fe; margin-bottom: 0.4rem;">Access Granted for:</div>
      <div style="font-size: 1.1rem; font-weight: 600;">${req.user.name} &lt;${req.user.email}&gt;</div>
    </div>

    <div class="action-group">
      <a href="/dashboard?format=json" class="btn btn-secondary" target="_blank">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        View as JSON
      </a>
      <a href="/auth/logout" class="btn btn-danger">
        Sign Out
      </a>
    </div>
  `;
  res.send(renderPage({ title: "Protected Dashboard", content }));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 AuthKit demo running on http://localhost:${port}`));
