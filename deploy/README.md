# VPS deployment

Production: https://allofdtp.site on 165.99.14.48.

Build with Node.js 22: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`.
Publish only `dist/client/` as static files; no Node.js server or container is needed.

Caddy site file: `/etc/caddy/sites.d/allofdtp.caddy` (see example in this folder).
Static releases: `/var/www/allofdtp/releases/<commit>/`.
Active release: symlink `/var/www/allofdtp/current`.

Before updating, back up the Caddy site file and record the existing symlink target.
Upload and verify all assets before switching the symlink, validate `/etc/caddy/Caddyfile`,
then reload Caddy and verify HTTPS plus the three tool links. Restore the previous
symlink and site file if validation fails. Keep earlier releases for rollback.

The `.openai/hosting.json` file is retained from the supplied source. Production here
uses the existing VPS and Caddy, not a newly registered Sites project.
