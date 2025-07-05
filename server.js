// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("better-sqlite3")("db/db.sql");
const { spawn } = require("child_process");
const app = express();

const socatMap = new Map();

// Middleware
app.use(bodyParser.json());
app.use(express.static("public"));

// Create table
const initSQL = `
  CREATE TABLE IF NOT EXISTS ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_port INTEGER,
    local_port INTEGER,
    serverIP TEXT,
    status TEXT DEFAULT 'Running'
  )
`;
db.prepare(initSQL).run();

// Login endpoint
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.LG_USERNAME &&
    password === process.env.LG_PASSWD
  ) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false });
});

const existingPorts = db.prepare("SELECT * FROM ports WHERE status = 'Running'").all();

existingPorts.forEach(({ id, server_port, local_port, serverIP }) => {
  const socat = spawn("socat", [
    `TCP-LISTEN:${local_port},reuseaddr,fork`,
    `TCP:${serverIP}:${server_port}`
  ], {
    detached: true,
    stdio: "ignore"
  });

  socatMap.set(id, socat);
  socat.unref();
  console.log(`Restored socat for ID ${id}: ${local_port} → ${serverIP}:${server_port}`);
});


// Login endpoint
app.post("/api/login", (req, res) => {
    console.log("Login endpoint called");
  const { username, password } = req.body;
  if (
    username === process.env.LG_USERNAME &&
    password === process.env.LG_PASSWD
  ) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false });
});


// Get all port entries
app.get("/api/ports", (req, res) => {
  const rows = db.prepare("SELECT * FROM ports").all();
  res.json(rows);
});

// Add port entry and run socat
app.post("/api/ports", (req, res) => {
  const { server_port, local_port, serverIP } = req.body;

  const stmt = db.prepare(
    "INSERT INTO ports (server_port, local_port, serverIP, status) VALUES (?, ?, ?, 'Running')"
  );
  const result = stmt.run(server_port, local_port, serverIP);
  const id = result.lastInsertRowid;

  const socat = spawn("socat", [
    `TCP-LISTEN:${local_port},reuseaddr,fork`,
    `TCP:${serverIP}:${server_port}`
  ], {
    detached: true,
    stdio: "ignore"
  });

  socatMap.set(id, socat);
  socat.unref();

  res.json({ success: true, id });
});

// Delete port entry and kill socat
app.delete("/api/ports/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const stmt = db.prepare("DELETE FROM ports WHERE id = ?");
  const info = stmt.run(id);

  if (info.changes > 0) {
    const process = socatMap.get(id);
    if (process) {
      try {
        process.kill();
      } catch (err) {
        console.error("Failed to kill socat:", err.message);
      }
      socatMap.delete(id);
    }
    return res.json({ success: true });
  }

  res.json({ success: false });
});



app.listen(80, '0.0.0.0', () => {
  console.log('Server running on http://localhost:80');
});
