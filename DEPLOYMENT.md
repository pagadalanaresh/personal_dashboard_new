# Deploying Wealthfolio to Oracle Cloud (Always Free Tier)

This walks you through deploying this app on a completely free Oracle Cloud
Infrastructure (OCI) VM, from a Linux machine. By the end you'll have:

- An **Ampere A1 (ARM) VM** — the most generous Always Free shape OCI offers
  (up to 4 OCPUs / 24 GB RAM total, split across one or more instances, for
  as long as your account exists — not a 12-month trial).
- **PostgreSQL** installed natively via `apt` and run as a systemd service —
  no Docker involved anywhere in this guide.
- The **Next.js app** built and kept running permanently with PM2, restarting
  automatically on crash or server reboot.
- **Nginx** as a reverse proxy in front of it, with a free **Let's Encrypt**
  TLS certificate.

Follow the parts in order — each one depends on the last.

> **Why HTTPS is not optional here**: the app's session cookie is marked
> `secure` in production (`lib/auth.ts`), meaning browsers will only send it
> over HTTPS. Skipping the domain/TLS setup in Part 3 will leave you unable
> to log in once deployed. Do not skip it.

---

## Part 0 — What you need before starting

- An Oracle Cloud account. Sign up at <https://signup.oraclecloud.com/> if
  you don't have one — a credit card is required for verification, but the
  Always Free resources used here will never be billed as long as you pick
  the shapes/sizes marked "Always Free eligible" below.
- A Linux machine with a terminal (you have this) and `ssh`, `scp`/`rsync`,
  and `openssl` installed (they usually already are — check with
  `ssh -V`, `rsync --version`, `openssl version`).
- A hostname pointing at your server's IP — see Part 3. You cannot get a
  trusted HTTPS certificate for a bare IP address, but you do **not** need to
  own or pay for a real domain; Part 3 covers a zero-signup option
  (`sslip.io`) as well as free dynamic DNS (DuckDNS).

---

## Part 1 — Create the Always Free VM

1. Log in to the [OCI Console](https://cloud.oracle.com/).
2. Open the hamburger menu → **Compute** → **Instances** → **Create
   Instance**.
3. **Name**: `wealthfolio` (or anything you like).
4. **Placement**: leave the default availability domain.
5. **Image and shape**:
   - Click **Edit** next to "Image and shape".
   - Image: **Canonical Ubuntu** → **24.04** (or the newest LTS offered).
   - Shape: click **Change shape**, select the **Ampere** series, choose
     **VM.Standard.A1.Flex**. Set **2 OCPUs** and **12 GB memory** — this
     comfortably fits inside the 4 OCPU / 24 GB Always Free allowance and
     leaves room for a second free instance later if you ever want one.
   - Confirm the shape card is labeled **"Always Free eligible"** before
     continuing. If it isn't, you picked the wrong shape.
6. **Networking**:
   - Leave "Create new virtual cloud network" selected (or pick an existing
     one). Make sure **"Assign a public IPv4 address"** is checked.
7. **Add SSH keys**:
   - Select **"Generate a key pair for me"**, then click **Save private
     key** and **Save public key**. Save the private key somewhere like
     `~/.ssh/wealthfolio-oci.key` on your Linux machine.
   - Alternatively, if you already have a local keypair, select **"Upload
     public key file"** and upload `~/.ssh/id_ed25519.pub` (or
     `id_rsa.pub`).
8. **Boot volume**: leave the default (46 GB) — you have up to 200 GB free
   across all boot volumes, so this is fine as-is.
9. Click **Create**. Wait for the instance state to become **Running**
   (a minute or two), then note its **Public IPv4 address** from the
   instance detail page.

Lock down the file permissions on your private key so SSH will accept it:

```bash
chmod 600 ~/.ssh/wealthfolio-oci.key
```

---

## Part 2 — Open the firewall (two layers — both are required)

OCI has **two** independent firewalls in front of your instance. Missing
either one is the single most common reason a fresh OCI deployment is
unreachable.

### 2a. The Security List (cloud-level firewall)

1. In the Console, go to your instance's detail page → under "Primary VNIC"
   click the subnet link → click the attached **Security List** (usually
   named `Default Security List for ...`).
2. Click **Add Ingress Rules** and add three rules, each with:
   - Source Type: `CIDR`, Source CIDR: `0.0.0.0/0`
   - IP Protocol: `TCP`
   - Destination Port Range: `80` (repeat for `443`, and `22` should already
     exist by default — add it if it doesn't).

### 2b. The instance's own OS firewall

Ubuntu images on OCI ship with `iptables` rules that block everything except
SSH by default, **separately** from the Security List above. SSH in (see
Part 3 below for the exact command) and run:

```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

If `netfilter-persistent` isn't installed, install it first:

```bash
sudo apt-get update && sudo apt-get install -y iptables-persistent
```

---

## Part 3 — Connect over SSH, and point a domain at your server

Connect from your Linux machine (replace the IP with your instance's public
IP; the default username on Ubuntu OCI images is `ubuntu`):

```bash
ssh -i ~/.ssh/wealthfolio-oci.key ubuntu@<YOUR_PUBLIC_IP>
```

### Get a domain name pointing at your IP

You need *some* hostname that resolves to your instance's public IP — a
bare IP can't get a real TLS certificate. Pick whichever is easiest for you:

- **You don't want to sign up for anything (fastest, zero setup)**: use
  [sslip.io](https://sslip.io/) — a free wildcard DNS service that resolves
  automatically from the IP itself, no account or DNS record needed. Take
  your public IP and replace the dots with dashes, then append `.sslip.io`.
  For example, if your public IP is `140.238.12.34`, your hostname is:
  ```
  140-238-12-34.sslip.io
  ```
  That's it — it already resolves. Skip straight to the `ping` check below.
- **You don't own a domain but want a memorable, permanent name**: use a
  free dynamic DNS service like [DuckDNS](https://www.duckdns.org/) — sign
  in, claim a subdomain like `wealthfolio.duckdns.org`, and point it at your
  instance's public IP. Free forever, works fine with Let's Encrypt. Useful
  if your IP might change later (dynamic DNS auto-updates); with `sslip.io`
  above, changing IPs means changing your hostname too since the IP is
  baked into it.
- **You own a domain already**: add an `A` record for e.g.
  `wealthfolio.yourdomain.com` → `<YOUR_PUBLIC_IP>` in your DNS provider.

Wait a few minutes for DNS to propagate (not needed for `sslip.io`, it's
instant), then confirm it resolves:

```bash
ping -c 2 140-238-12-34.sslip.io   # or your DuckDNS/real domain
```

From here on, this guide uses `YOUR_DOMAIN` as a placeholder — substitute
your actual hostname (whichever option you picked above) everywhere you see
it.

---

## Part 4 — Install everything the server needs

All of this runs **on the server**, over the SSH session from Part 3.

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

### Node.js 24

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should print v24.x
```

> This app has been built and tested throughout on Node 24 locally. Next.js
> 16.3.1 itself only requires Node >=20.9, but deploying on a materially
> older major than what you actually tested against is an avoidable risk —
> match your server to your dev machine's Node version rather than the
> framework's bare minimum. Check your own local version with `node -v`
> and adjust the `setup_XX.x` number above to match if it differs from 24.

### PostgreSQL

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
systemctl status postgresql --no-pager   # should show "active (running)"
```

### Nginx, Certbot, PM2

```bash
sudo apt-get install -y nginx
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

sudo npm install -g pm2
```

---

## Part 5 — Transfer the project to the server

This project isn't in a git repository yet, so the simplest path is to copy
it directly from your local machine with `rsync`. **Run this from your
local machine**, not the server (open a second terminal, or exit the SSH
session first):

```bash
rsync -avz --progress \
  --exclude node_modules \
  --exclude .next \
  --exclude .env \
  --exclude tsconfig.tsbuildinfo \
  -e "ssh -i ~/.ssh/wealthfolio-oci.key" \
  /Users/npagadal/Documents/Personal/New_DasBoard/ \
  ubuntu@<YOUR_PUBLIC_IP>:~/wealthfolio/
```

(`.env` is deliberately excluded — you'll create a fresh production one
directly on the server in Part 6, rather than copying local secrets over.)

If you'd rather use git going forward (recommended for future updates):
push this repo to a private GitHub repo from your machine, then on the
server run `git clone <your-repo-url> ~/wealthfolio` instead of the rsync
command above. Either way, the rest of this guide is identical from here.

---

## Part 6 — Configure the environment

Back in your **SSH session on the server**:

```bash
cd ~/wealthfolio
```

### Create the database and a dedicated user

PostgreSQL is running (Part 4), but it starts with no databases of ours yet.
Create one, plus a non-superuser account for the app to connect as — do not
run this in production with a default/blank password:

```bash
sudo -u postgres psql
```

You're now inside the `psql` prompt. Run (replace the password with a
strong one of your own — keep the quotes):

```sql
CREATE USER dasboard_user WITH ENCRYPTED PASSWORD 'REPLACE_WITH_A_STRONG_PASSWORD';
CREATE DATABASE dasboard OWNER dasboard_user;
\c dasboard
GRANT ALL ON SCHEMA public TO dasboard_user;
\q
```

Ubuntu's default PostgreSQL config already allows password-authenticated
connections from `localhost` over TCP, so no `pg_hba.conf` editing is
needed — the app will connect as `dasboard_user` on `localhost:5432`.

Confirm it works before moving on:

```bash
psql -h localhost -U dasboard_user -d dasboard -c '\conninfo'
```
(enter the password when prompted; `Ctrl+D` or `\q` to exit).

### Create the production `.env` file

```bash
cd ~/wealthfolio
nano .env
```

Paste this in, filling in the password you just chose:

```env
DATABASE_URL="postgresql://dasboard_user:<password>@localhost:5432/dasboard"
AUTH_SECRET="REPLACE_ME"
MARKET_DATA_PROVIDER="yahoo"
NODE_ENV="production"
```

Generate a strong, unique `AUTH_SECRET` — never reuse a value from local
development — and paste its output in place of `REPLACE_ME` above:

```bash
openssl rand -base64 32
```

Save and exit (`Ctrl+O`, Enter, `Ctrl+X`).

> `MARKET_DATA_PROVIDER="yahoo"` gives you real live quotes via the
> unofficial Yahoo Finance client already built into this app. Set it to
> `"mock"` instead if you'd rather run on simulated data.

---

## Part 7 — Install, migrate, and build

Still in `~/wealthfolio` on the server:

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
```

`prisma migrate deploy` applies the migrations already committed in
`prisma/migrations/` — it's the production-safe equivalent of
`prisma migrate dev` (it never prompts and never generates new migrations).

---

## Part 8 — Run it permanently with PM2

```bash
pm2 start npm --name wealthfolio -- start
pm2 save
```

Make PM2 itself (and therefore your app) start automatically after a server
reboot:

```bash
pm2 startup
```

This prints a `sudo env PATH=... pm2 startup systemd -u ubuntu --hp /home/ubuntu`
command — copy and run exactly what it prints (it's specific to your user).

Useful PM2 commands going forward:

```bash
pm2 status              # is it running?
pm2 logs wealthfolio     # tail live logs
pm2 restart wealthfolio  # restart after redeploying
```

The app is now running on `127.0.0.1:3000` on the server — not yet
reachable from the internet. Nginx handles that next.

---

## Part 9 — Nginx reverse proxy + free HTTPS

Create an Nginx site config:

```bash
sudo nano /etc/nginx/sites-available/wealthfolio
```

Paste in (replace `YOUR_DOMAIN` with your real hostname from Part 3):

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/wealthfolio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

At this point `http://YOUR_DOMAIN` should load the app over plain HTTP.
Now get a free certificate and let Certbot upgrade the config to HTTPS
automatically:

```bash
sudo certbot --nginx -d YOUR_DOMAIN
```

Follow the prompts (enter an email, agree to terms, choose to redirect HTTP
to HTTPS when asked — recommended). Certbot edits the Nginx config for you
and sets up auto-renewal.

---

## Part 10 — Verify

Open `https://YOUR_DOMAIN` in a browser. You should see the login page over
a valid HTTPS connection (padlock, no warnings). Sign up for an account and
confirm the dashboard loads and the market ticker populates.

If anything doesn't work, jump to the Troubleshooting section below before
re-reading the whole guide — it covers the issues people hit most often.

---

## Part 11 — Updating the app later

Whenever you make changes locally and want to redeploy:

```bash
# From your local machine:
rsync -avz --progress \
  --exclude node_modules --exclude .next --exclude .env --exclude tsconfig.tsbuildinfo \
  -e "ssh -i ~/.ssh/wealthfolio-oci.key" \
  /Users/npagadal/Documents/Personal/New_DasBoard/ \
  ubuntu@<YOUR_PUBLIC_IP>:~/wealthfolio/

# Then on the server:
cd ~/wealthfolio
npm ci
npx prisma migrate deploy
npm run build
pm2 restart wealthfolio
```

(If you switched to git in Part 5, replace the `rsync` step with
`git pull` on the server instead.)

---

## Part 12 — Connecting to the PostgreSQL database

A quick clarification first, since the naming is easy to mix up: this app
uses **PostgreSQL installed natively on your own VM** (set up in Part 6) —
not Oracle's separate, paid "OCI Database with PostgreSQL" managed service.
What's below is how to get into *that* database — the one you already have
running for free.

We deliberately did **not** open port `5432` to the internet in Part 2 —
a database should never be directly reachable from the public internet.
Instead, there are two ways in:

### Option A — `psql` directly on the server (simplest)

SSH into the server (Part 3), then:

```bash
psql -h localhost -U dasboard_user -d dasboard
```

Use the same user/password you set in Part 6 (enter the password when
prompted). Once connected, some useful starter commands:

```sql
\dt              -- list all tables
\d "Holding"     -- describe a specific table's columns
SELECT * FROM "User";
\q               -- quit
```

### Option B — connect from your local machine with a GUI tool

This is nicer if you want to browse data visually (e.g. with
[DBeaver](https://dbeaver.io/), free and cross-platform, or TablePlus,
pgAdmin, etc.) instead of typing SQL by hand. Because port 5432 isn't
public, you first open an SSH tunnel that forwards a local port to the
database through your existing SSH access:

```bash
ssh -i ~/.ssh/wealthfolio-oci.key -L 5433:localhost:5432 ubuntu@<YOUR_PUBLIC_IP> -N
```

Leave that command running in its own terminal (it doesn't print anything —
that's normal; `-N` means "just forward the port, don't open a shell").
Then, in your GUI tool or a second local terminal, connect to:

- Host: `localhost`
- Port: `5433`
- Database: `dasboard`
- Username / password: whatever you set for `dasboard_user` in Part 6

If you'd rather use the `psql` command line locally instead of a GUI, and
don't have it installed yet:

```bash
sudo apt-get install -y postgresql-client   # Debian/Ubuntu-based distros
# Fedora: sudo dnf install postgresql
# Arch:   sudo pacman -S postgresql
```

Then, with the tunnel from above still running:

```bash
psql -h localhost -p 5433 -U dasboard_user -d dasboard
```

Stop the tunnel any time with `Ctrl+C` in the terminal it's running in.

---

## Part 13 — Running and managing the app day-to-day

The app has three moving pieces, each managed independently: **PostgreSQL**
(database, as a systemd service), **PM2** (the Next.js app itself), and
**Nginx** (the public-facing reverse proxy + HTTPS). All commands below run
on the server, over SSH.

### Check whether everything is up

```bash
systemctl status postgresql --no-pager   # database — expect "active (running)"
pm2 status                                # app — expect "online"
sudo systemctl status nginx --no-pager    # reverse proxy — expect "active (running)"
```

### Start everything (e.g. after it's been stopped, or to double-check
after a server reboot)

```bash
sudo systemctl start postgresql
pm2 resurrect      # restores the process list saved by `pm2 save` in Part 8
sudo systemctl start nginx
```

In normal operation you shouldn't need this — Part 8's `pm2 startup` step
and `systemctl enable` on both `postgresql` and `nginx` bring everything
back up automatically after a reboot. This is here for when something needs
a manual nudge.

### Stop everything

```bash
pm2 stop wealthfolio
sudo systemctl stop postgresql
```

(Your data is untouched — it lives on disk under PostgreSQL's own data
directory, independent of whether the service is running.)

### View logs

```bash
pm2 logs wealthfolio                        # the Next.js app itself
sudo journalctl -u postgresql -f            # the database
sudo tail -f /var/log/nginx/error.log       # the reverse proxy
```

### Restart just the app (after redeploying new code, or if it's misbehaving)

```bash
pm2 restart wealthfolio
```

---

## Troubleshooting

**Can't reach the site at all / connection times out.**
You're missing one of the two firewall layers from Part 2. Re-check both
the Security List ingress rules *and* the instance's `iptables` rules —
almost every "OCI won't let me in" problem is one of these two.

**Site loads over HTTP but I can't log in / get redirected back to
login after signing in.**
The session cookie requires HTTPS in production. Confirm you completed
Part 9's Certbot step and are visiting the site via `https://`, not
`http://`.

**`prisma migrate deploy` fails with a connection error.**
Check `systemctl status postgresql` shows `active (running)`, and that the
username/password/database name in `.env`'s `DATABASE_URL` exactly match
what you set up for `dasboard_user` in Part 6 (re-test with
`psql -h localhost -U dasboard_user -d dasboard` if unsure).

**Build runs out of memory.**
Unlikely on a 12 GB A1 instance, but if you sized your instance smaller, add
swap:
```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Yahoo Finance quotes aren't loading / news is empty.**
This is expected occasionally — it's an unofficial API with no uptime
guarantee (see the in-app note on the Settings page). Confirm
`MARKET_DATA_PROVIDER="yahoo"` is set in `.env` and `pm2 restart wealthfolio`
was run after changing it. Set it to `"mock"` if you want deterministic
simulated data instead.

**Logs show `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` and every Yahoo Finance
call fails (holdings, watchlist, indexes, charts all load empty).**
This is a *local development machine* problem, not a production one — do
not "fix" it by adding `NODE_EXTRA_CA_CERTS` or
`NODE_TLS_REJECT_UNAUTHORIZED=0` to the server's `.env`. It happens locally
when a corporate VPN/proxy does TLS interception and your interactive shell
profile (e.g. `~/.zshrc`) trusts that corporate CA — something double-click
launchers and non-login shells don't inherit. Oracle Cloud's VM has direct
internet egress with no such interception, so this should never occur in
production; if it somehow does, the actual fix is installing whatever CA
is genuinely intercepting traffic on *that* network, never disabling
certificate verification.

**PM2 doesn't restart the app after a server reboot.**
Re-run the exact `sudo env PATH=...` command that `pm2 startup` printed in
Part 8 — this step is easy to skip by accident, and without it `pm2 save`
alone won't survive a reboot.
