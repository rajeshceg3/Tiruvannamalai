# Verify Tiruvannamalai
Sacred Steps - Tiruvannamalai pilgrimage app (vite React client + express/drizzle server).
## Launch
npm install; npm run dev for the full stack (tsx server), or npm run build && npm start (needs DATABASE_URL in production).
## Doctor
`python3 .cursor/skills/verify-tiruvannamalai/verify.py`
## Drive
Builds the client and server bundles, then renders the built client (dist/public) in headless Chromium asserting the boot marker and zero JS console errors.
## Evidence
`.cursor/skills/verify-tiruvannamalai/evidence.json`
## Cleanup
Static server terminated after the render.
## Known boundaries
Render smoke only; scene quality and e2e suites (cypress/playwright/puppeteer) not exercised here.
