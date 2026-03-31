# Request Logger

Real-time HTTP request inspector with a sleek web UI. Capture, monitor, and debug incoming HTTP requests on any path — similar to RequestBin or Webhook.site, but self-hosted.

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Features

- **Dynamic Path Listening** — Add any pathname via the UI and start capturing requests instantly
- **Real-Time Updates** — Requests appear live via WebSocket, no polling or refreshing
- **Full Request Inspection** — View method, URL, headers, query parameters, and body
- **Method Highlighting** — Color-coded badges for GET, POST, PUT, PATCH, DELETE, and more
- **Filtering** — Filter captured requests by URL or HTTP method
- **JSON Pretty-Print** — Automatically formats JSON bodies for readability
- **Collapsible Sections** — Expand/collapse headers, body, and query params in the detail view
- **Docker Support** — Run with a single command using Docker Compose
- **Zero Dependencies UI** — Pure HTML/CSS/JS frontend, no build step required

## Quick Start

### With Docker (recommended)

```bash
docker compose up --build
```

### Without Docker

```bash
npm install
npm start
```

Open **http://localhost:3000/app** in your browser.

## Usage

1. Open the web UI at `http://localhost:3000/app`
2. Enter a path (e.g. `/webhook`) in the sidebar and click **Add**
3. Send requests to that path:

```bash
# Simple GET
curl http://localhost:3000/webhook

# POST with JSON body
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "user.created", "id": 42}'

# With query parameters
curl "http://localhost:3000/webhook?source=github&action=push"
```

4. Watch requests appear in real-time in the UI
5. Click any request to inspect its full details — headers, body, query params, and more

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |

## Project Structure

```
request-logger/
├── server.js            # Express + WebSocket backend
├── public/
│   └── index.html       # Single-file frontend (HTML + CSS + JS)
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## License

[MIT](LICENSE)
