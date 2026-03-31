const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const MAX_REQUESTS = 500;

// State
let listenPaths = new Map(); // path -> { id, path, createdAt }
let capturedRequests = []; // [{ id, pathId, method, url, headers, body, query, ip, timestamp }]

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.text({ limit: "10mb" }));
app.use(express.raw({ type: "*/*", limit: "10mb" }));

// Serve static UI
app.use("/app", express.static(path.join(__dirname, "public")));

// API routes
app.get("/api/paths", (req, res) => {
  res.json([...listenPaths.values()]);
});

app.post("/api/paths", (req, res) => {
  let pathName = req.body.path;
  if (!pathName) return res.status(400).json({ error: "path is required" });

  // Normalize path
  if (!pathName.startsWith("/")) pathName = "/" + pathName;
  pathName = pathName.replace(/\/+$/, "") || "/";

  if (listenPaths.has(pathName)) {
    return res.status(409).json({ error: "Path already exists" });
  }

  const entry = {
    id: uuidv4(),
    path: pathName,
    createdAt: new Date().toISOString(),
    requestCount: 0,
  };
  listenPaths.set(pathName, entry);

  broadcast({ type: "path_added", data: entry });
  res.status(201).json(entry);
});

app.delete("/api/paths/:id", (req, res) => {
  for (const [key, val] of listenPaths) {
    if (val.id === req.params.id) {
      listenPaths.delete(key);
      capturedRequests = capturedRequests.filter((r) => r.pathId !== val.id);
      broadcast({ type: "path_removed", data: { id: val.id } });
      return res.json({ ok: true });
    }
  }
  res.status(404).json({ error: "Path not found" });
});

app.get("/api/requests", (req, res) => {
  const { pathId } = req.query;
  let results = capturedRequests;
  if (pathId) results = results.filter((r) => r.pathId === pathId);
  res.json(results.slice(-MAX_REQUESTS).reverse());
});

app.delete("/api/requests", (req, res) => {
  const { pathId } = req.query;
  if (pathId) {
    capturedRequests = capturedRequests.filter((r) => r.pathId !== pathId);
  } else {
    capturedRequests = [];
  }
  broadcast({ type: "requests_cleared", data: { pathId: pathId || null } });
  res.json({ ok: true });
});

// Root redirect
app.get("/", (req, res) => {
  // Check if this matches a listen path
  if (listenPaths.has("/")) {
    captureRequest(req, "/");
    return res.status(200).json({ captured: true });
  }
  res.redirect("/app");
});

// Catch-all: capture requests on listened paths
app.all("*", (req, res) => {
  // Skip internal routes
  if (req.path.startsWith("/app") || req.path.startsWith("/api/") || req.path.startsWith("/ws")) {
    return res.status(404).json({ error: "Not found" });
  }

  // Find matching listen path
  const matchedPath = findMatchingPath(req.path);
  if (matchedPath) {
    captureRequest(req, matchedPath);
    return res.status(200).json({
      message: "Request captured",
      path: matchedPath,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(404).json({ error: "No listener configured for this path" });
});

function findMatchingPath(requestPath) {
  // Exact match first
  if (listenPaths.has(requestPath)) return requestPath;

  // Prefix match (e.g., /webhook matches /webhook/anything)
  for (const [listenPath] of listenPaths) {
    if (requestPath.startsWith(listenPath + "/") || requestPath === listenPath) {
      return listenPath;
    }
  }
  return null;
}

function captureRequest(req, matchedPath) {
  const pathEntry = listenPaths.get(matchedPath);
  if (!pathEntry) return;

  let bodyContent = null;
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      bodyContent = req.body.toString("utf-8");
    } else if (typeof req.body === "string") {
      bodyContent = req.body;
    } else {
      bodyContent = JSON.stringify(req.body, null, 2);
    }
  }

  const captured = {
    id: uuidv4(),
    pathId: pathEntry.id,
    matchedPath: matchedPath,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    headers: req.headers,
    body: bodyContent,
    ip: req.ip || req.socket.remoteAddress,
    contentType: req.get("content-type") || null,
    contentLength: req.get("content-length") || null,
    timestamp: new Date().toISOString(),
  };

  capturedRequests.push(captured);
  pathEntry.requestCount++;

  // Trim old requests
  if (capturedRequests.length > MAX_REQUESTS * 2) {
    capturedRequests = capturedRequests.slice(-MAX_REQUESTS);
  }

  broadcast({ type: "new_request", data: captured });
}

// WebSocket
const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
  ws.on("error", () => clients.delete(ws));
});

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

server.listen(PORT, () => {
  console.log(`\n  Request Logger running on http://localhost:${PORT}/app\n`);
});
