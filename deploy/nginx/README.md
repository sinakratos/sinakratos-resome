# sinakratos.ir with Nginx and PM2

These instructions assume Ubuntu/Debian, an existing Nginx installation, and the résumé app running on 127.0.0.1:3001. Keep your other domain's existing Nginx configuration and PM2 process in place. If sinakratos.ir already has an Nginx server block, update that file instead of enabling a duplicate.

## 1. Confirm the app

On the server:

```sh
pm2 status
curl -I http://127.0.0.1:3001
```

If the app is not running, from the directory containing package.json and ecosystem.config.cjs:

```sh
npm ci --omit=dev
npm run setup
pm2 start ecosystem.config.cjs --only sinakratos-resume
pm2 save
```

The server must use Node.js >=22.13. Set PUBLIC_ORIGIN=https://sinakratos.ir in .env.local for HTTPS cookies. The app needs its own .env.local credentials and a writable DATABASE_PATH. Preserve the SQLite database through deployments: it contains saved content and photos. To restore PM2 at boot, run pm2 startup and execute the command it prints for your deployment user, then run pm2 save.

## 2. DNS and network

Add an A record for sinakratos.ir pointing at the server's public IPv4 address and a CNAME record for www pointing at sinakratos.ir. If an AAAA record exists, it must point to a working IPv6 address serving this site; otherwise correct or remove that stale record. Ports 80 and 443 must be reachable through the server firewall and provider firewall. The application port 3001 stays on loopback.

## 3. Install the configuration

Copy sinakratos.ir.conf to /etc/nginx/sites-available/sinakratos.ir. For a fresh configuration, enable it once:

```sh
sudo ln -s /etc/nginx/sites-available/sinakratos.ir /etc/nginx/sites-enabled/sinakratos.ir
sudo nginx -t
```

Only after the test succeeds:

```sh
sudo systemctl reload nginx
curl -I -H 'Host: sinakratos.ir' http://127.0.0.1
```

The configuration permits photo uploads, preserves the original hostname for admin origin checks, forwards the public protocol, disables proxy caching/response buffering, and rewrites internal-host redirects to the public site.

## 4. HTTPS

If Certbot is not installed, install it using the method appropriate to your server. On Ubuntu/Debian with apt-based Certbot:

```sh
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

Once both DNS names resolve to the server:

```sh
sudo certbot --nginx --redirect -d sinakratos.ir -d www.sinakratos.ir
sudo nginx -t
sudo certbot renew --dry-run
curl -I https://sinakratos.ir
```

Certbot adds the certificate paths, HTTPS listener, and HTTP-to-HTTPS redirect. Follow its prompts, including renewal setup for the installation method you used. Keep the installed configuration after Certbot edits it; do not overwrite it later with the original HTTP bootstrap file.

## 5. Verify the complete site

Open https://sinakratos.ir and https://sinakratos.ir/admin. Check password login, saving an edit, photo upload, and logout. Also confirm the existing domain still serves its app.

For errors:

```sh
pm2 logs sinakratos-resume --lines 30
sudo tail -n 50 /var/log/nginx/sinakratos.error.log
```

A 502 generally means the app on port 3001 is unavailable. A 413 means the upload exceeded a proxy body limit. Certificate issuance failures require checking DNS and public HTTP access.
