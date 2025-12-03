Firebase configuration
----------------------

This project expects a Firebase configuration to be available at runtime via a small script that
sets `window.__firebase_config` (a JSON string). A placeholder file `firebase-config.js` has been
added to the project root.

Quick setup (local development):

1. Open `firebase-config.js` in the project root.
2. Replace the placeholder values (`YOUR_API_KEY`, `YOUR_PROJECT_ID`, etc.) with your Firebase
	project's configuration values (available in the Firebase console -> Project settings).
3. Optionally, set `window.__initial_auth_token` in the same file if you need to sign in with a
	custom token at startup.

Security notes:
- Do not commit real Firebase credentials to a public repository. Use a private repo or
  environment-specific build steps to inject secrets for production.
- For CI/CD, generate `firebase-config.js` at build time from secure environment variables.

If you'd like, I can:
- Change the project to load config from environment variables at build time.
- Add an example `firebase-config.example.js` and a `.gitignore` rule to avoid committing real creds.

