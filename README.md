Team Name:Team 5Team MembersS.NoName1VUDATTA SATYA VENKATA NAGA PRAJNA2Rai Bhuvaneswari Devi3VELUGULA DIGVIJAY SAI GANESH4PERLA SOMESWARI
# SSL Certificate Expiry Watcher

SSL Certificate Expiry Watcher is a professional web application for monitoring SSL/TLS certificates, checking expiry dates, reviewing certificate health, and receiving practical renewal guidance. The project is organized with a separate frontend and backend while keeping the local development workflow simple through one command.

## Project Summary

| Area | Details |
| --- | --- |
| Project type | Full-stack SSL/TLS certificate monitoring dashboard |
| Frontend | HTML, CSS, JavaScript, Chart.js |
| Backend | Node.js HTTP server |
| Database | SQLite managed through Python |
| Security utilities | Python SSL checker and local API key vault |
| AI support | Server-side chatbot proxy with safe fallback responses |
| Frontend URL | `http://localhost:3000` |
| Backend API URL | `http://localhost:4000` |

## Key Features

- Professional dashboard for certificate health, expiry status, alerts, reports, settings, and review pages
- Live SSL certificate scan using backend TLS checks
- Persistent monitored-domain storage with SQLite
- Frontend/backend environment separation
- Safe server-side AI provider integration
- Optional local API key vault utility
- VS Code tasks and debug configuration
- Clean documentation for setup, architecture, API routes, security, and user workflow

## Folder Structure

```text
ssl/
  backend/
    server.js
    database/
      db.py
      schema.sql
      sslwatch.db
    security_utils/
      ssl_checker.py
      api_key_vault.py
    .env.example

  frontend/
    index.html
    style.css
    app.js
    config.js
    server.js
    .env.example

  docs/
    API.md
    ARCHITECTURE.md
    DEVELOPMENT.md
    USER_GUIDE.md

  sample_data/
    domains.csv

  .vscode/
    launch.json
    settings.json
    tasks.json

  .env.example
  ENVIRONMENT.md
  SECURITY.md
  package.json
  README.md
```

## Quick Start

1. Open the project folder in VS Code.

```text
C:\Users\user\OneDrive\Documents\ssl
```

2. Start the application.

```bash
npm start
```

3. Open the dashboard.

```text
http://localhost:3000
```

The backend API runs separately at:

```text
http://localhost:4000
```

Opening `http://localhost:4000` shows the backend/database status interface, not the frontend dashboard.

4. Use the demo login.

```text
Email: demo@sslwatch.io
Password: password123
```

## Environment Setup

Copy the root environment example before adding real secrets:

```powershell
Copy-Item .env.example .env
```

Recommended local values:

```env
PORT=4000
BACKEND_PORT=4000
FRONTEND_PORT=3000
NODE_ENV=development
PYTHON_BIN=python

AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
AI_API_KEY=your_real_api_key_here

ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_APP_NAME=SSLWatch
FRONTEND_APP_ENV=development
FRONTEND_API_BASE_URL=http://localhost:4000
FRONTEND_REQUEST_TIMEOUT_MS=15000
```

Keep real API keys in `.env`, not in frontend files.

## Common Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start frontend on `3000` and backend on `4000` |
| `npm run dev` | Start frontend on `3000` and backend on `4000` |
| `npm run backend:dev` | Start only the backend API on `4000` |
| `npm run frontend:dev` | Start only the frontend static server on `3000` |
| `npm run db:init` | Initialize or validate SQLite database |
| `npm run ssl:check` | Run the Python SSL checker against `google.com` |
| `npm run vault:list` | List locally stored API key vault services |
| `python backend/database/db.py list` | Print monitored domains as JSON |
| `python backend/security_utils/ssl_checker.py example.com` | Check one domain directly |

On Windows PowerShell, if `npm` is blocked by execution policy, use `npm.cmd`:

```powershell
npm.cmd start
```

## Backend API Overview

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `http://localhost:3000/config.js` | Serve browser-safe frontend config |
| `GET` | `/api/config` | Return safe runtime AI status |
| `GET` | `/api/domains` | List monitored domains |
| `POST` | `/api/domains` | Create or update a monitored domain |
| `DELETE` | `/api/domains/:id` | Delete a monitored domain |
| `POST` | `/api/check-ssl` | Run live SSL certificate check |
| `POST` | `/api/chat` | Ask SSLBot through server-side AI proxy |

Full API details are in `docs/API.md`.

## Documentation Index

- `docs/USER_GUIDE.md` explains how to use the dashboard.
- `docs/ARCHITECTURE.md` explains frontend, backend, database, and security utility design.
- `docs/API.md` documents every backend route and payload.
- `docs/DEVELOPMENT.md` explains local development, testing, and troubleshooting.
- `ENVIRONMENT.md` explains frontend/backend environment setup.
- `SECURITY.md` explains API key safety and secure operating rules.

## Security Model

The frontend never receives private API keys. Browser code calls `http://localhost:4000/api/...`, and the backend reads secrets from `.env`. The frontend `config.js` file only contains public configuration values such as app name, environment, API base URL, and request timeout.

If no AI key is configured, SSLBot still works with built-in SSL guidance. This keeps the demo functional without exposing secrets.

## Project Status

Current local checks:

- Backend syntax validation passes
- Frontend syntax validation passes
- SQLite initialization passes
- `/config.js` route works
- `/api/domains` route works
- Python SSL checker works

## Suggested Presentation Description

SSL Certificate Expiry Watcher helps teams monitor certificate expiry risk before users encounter HTTPS warnings or service outages. It combines a professional monitoring dashboard, live SSL checks, persistent domain storage, AI-assisted SSL guidance, and safe secret handling through a separated frontend/backend architecture.
  scripts/
    start-dev.js

"# SSL-Certificate-Expiry-Watcher" 
