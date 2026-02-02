import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

const dbPath = path.join(__dirname, "zeiten.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      pause_minutes INTEGER NOT NULL DEFAULT 0,
      project TEXT NOT NULL,
      note TEXT,
      duration_minutes INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
});

const toMinutes = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const calcDurationMinutes = ({ startTime, endTime, pauseMinutes }) => {
  const start = toMinutes(startTime);
  let end = toMinutes(endTime);
  if (end < start) end += 24 * 60;
  const pause = Number.isFinite(Number(pauseMinutes)) ? Number(pauseMinutes) : 0;
  return Math.max(0, end - start - pause);
};

app.get("/api/entries", (req, res) => {
  db.all(
    "SELECT * FROM entries ORDER BY date DESC, start_time DESC, id DESC",
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: "Datenbankfehler" });
        return;
      }
      res.json(rows);
    }
  );
});

app.post("/api/entries", (req, res) => {
  const { date, startTime, endTime, pauseMinutes, project, note } = req.body || {};

  if (!date || !startTime || !endTime || !project) {
    res.status(400).json({ error: "Pflichtfelder fehlen" });
    return;
  }

  const durationMinutes = calcDurationMinutes({ startTime, endTime, pauseMinutes });

  db.run(
    `INSERT INTO entries (date, start_time, end_time, pause_minutes, project, note, duration_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?)` ,
    [date, startTime, endTime, Number(pauseMinutes || 0), project, note || "", durationMinutes],
    function (err) {
      if (err) {
        res.status(500).json({ error: "Speichern fehlgeschlagen" });
        return;
      }
      res.status(201).json({
        id: this.lastID,
        date,
        start_time: startTime,
        end_time: endTime,
        pause_minutes: Number(pauseMinutes || 0),
        project,
        note: note || "",
        duration_minutes: durationMinutes,
        created_at: new Date().toISOString()
      });
    }
  );
});

const openBrowser = (url) => {
  if (process.env.OPEN_BROWSER === "false") return;
  const command =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  exec(command);
};

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Timetracker läuft auf ${url}`);
  openBrowser(url);
});
