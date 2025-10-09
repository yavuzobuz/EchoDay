# Mail Bridge Deployment (IMAP/POP3 → HTTPS)

Goal: End users never run a local server. You host one small service once, mobile and web apps call it via HTTPS.

Option A — Docker (any VPS)
1) Build and run locally to test:
   docker build -t mail-bridge -f server/Dockerfile ./
   docker run -e MAIL_BRIDGE_PORT=5123 -p 5123:5123 mail-bridge
2) Put behind HTTPS (Caddy/NGINX/Traefik) and a domain, e.g. https://mailbridge.yourdomain.com
3) In app, set VITE_MAIL_BRIDGE_URL=https://mailbridge.yourdomain.com

Option B — Render (free tier friendly)
1) Create new Web Service → Use Docker → connect repo
2) Root Directory: repository root
3) Dockerfile path: server/Dockerfile
4) Expose port 5123 (auto-detected). Add environment:
   - MAIL_BRIDGE_PORT=10000 (Render provides port, but we set via PORT variable fallback too)
5) Deploy. Note the public URL.
6) Set VITE_MAIL_BRIDGE_URL to that URL in your app env.

Option C — Railway/Fly/Railway (container deploy)
- Create a new service from Dockerfile server/Dockerfile and expose 5123.

Security Notes
- The bridge relays user credentials to the IMAP/POP host. Serve only over HTTPS.
- Keep rate limits and per-user auth in front (e.g., an API key or your Supabase session JWT check) if making it public.
- Current CORS is wide-open for dev. For prod, restrict origins.

Post-deploy
- Update .env(.local): VITE_MAIL_BRIDGE_URL=https://mailbridge.yourdomain.com
- Rebuild the web/mobile app.
