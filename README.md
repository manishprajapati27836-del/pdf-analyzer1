# Marginalia — PDF Reading Notes

A web app that extracts text from a PDF in the browser and uses OpenAI GPT-4o
to summarize it and answer questions, protected behind email/password login.
Built with security, mobile responsiveness, and deployment in mind.

## Project structure

```
pdf-analyzer/
├── server.js          # Express backend — auth, sessions, rate limiting, calls Claude
├── users.js           # Reads/writes users.json (no database software needed)
├── package.json
├── .env.example        # Copy to .env and fill in your own values
├── .gitignore           # Keeps .env, users.json, node_modules out of git
└── public/
    ├── landing.html      # Public marketing page (shown at "/" when logged out)
    ├── login.html         # Log in page
    ├── signup.html        # Sign up page
    ├── auth.css           # Shared styling for login/signup
    ├── index.html          # Main app (protected — requires login)
    ├── style.css           # Main app styling
   ├── script.js           # PDF extraction, statistics, summary + Q&A requests
    └── 404.html            # Not-found page
```

## Setup

1. **Install Node.js** (v18+): https://nodejs.org

2. **Install dependencies:**
   ```
   npm install
   ```
   Installs Express, bcryptjs, express-session, helmet (security headers),
   and express-rate-limit — all pure JavaScript, no native compilation.

3. **Create your `.env` file** (copy `.env.example` and fill in):
   ```
   OPENAI_API_KEY=your-real-key-from-platform.openai.com
   SESSION_SECRET=any-long-random-string-you-make-up
   PORT=3000
   NODE_ENV=development
   ```

4. **Run it:**
   ```
   npm start
   ```

5. Visit http://localhost:3000 — you'll see the landing page. Click
   "Sign up free" to create your first account.

## What makes this production-ready

- **Security headers** via `helmet` (clickjacking/MIME-sniffing protection, etc.)
- **Rate limiting**: 20 login/signup attempts per 15 minutes per IP, and 10
   AI requests per minute per IP, to prevent abuse and control API cost
- **Timing-safe login**: a fake password check runs even for unknown emails,
  so response time can't be used to guess which emails are registered
- **Session regeneration** on login/signup, to prevent session-fixation attacks
- **Secure cookies** (`secure: true`, `sameSite: lax`) automatically enabled
  when `NODE_ENV=production`
- **Input validation**: proper email format checks, length limits, and type
   checks on every auth and AI request
- **Centralized error handling** and a proper 404 page
- **Mobile-responsive layout** — the app usably reflows on phone-sized screens
- `.gitignore` keeps secrets and per-user data out of version control

## Deploying publicly

This app needs a host that runs a persistent Node server (not a serverless
platform like Vercel, which doesn't support the file-based session/user
storage used here). **Render** or **Railway** both work well:

1. Push this project to a GitHub repository (`.env` and `users.json` will be
   excluded automatically thanks to `.gitignore`).
2. Create a new Web Service on Render/Railway, connected to that repo.
3. Set the build command to `npm install` and the start command to `npm start`.
4. Add environment variables in their dashboard: `OPENAI_API_KEY`,
   `SESSION_SECRET` (a real random string), and `NODE_ENV=production`.
5. Deploy — you'll get a public URL like `your-app.onrender.com`.

Note: `users.json` lives on the server's local disk. Most free hosting tiers
reset local disk on redeploys, so accounts may be wiped when you push updates.
For a real public launch with persistent accounts, move to a hosted database
(e.g. Supabase, MongoDB Atlas, or Render's own Postgres) — ask if you'd like
help with that migration.

## Notes

- Only text-based PDFs work — scanned image-only PDFs have no text layer
  to extract (no OCR is included here).
- Long documents are truncated to roughly the first 60,000 characters.
