import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('kuska.db');

export function initDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS reports (
      client_id TEXT PRIMARY KEY NOT NULL,
      title TEXT,
      description TEXT,
      lat REAL,
      lon REAL,
      photo_uri TEXT,
      video_uri TEXT,
      created_at_client TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      incident_id TEXT,
      gemma_result_json TEXT
    );
  `);
  // Instalaciones previas a este campo: agregarlo si falta (SQLite no tiene
  // "ADD COLUMN IF NOT EXISTS", así que se ignora el error si ya existe).
  try {
    db.execSync(`ALTER TABLE reports ADD COLUMN gemma_result_json TEXT;`);
  } catch (e) {
    // ya existe
  }
}

export function insertReport(report) {
  db.runSync(
    `INSERT INTO reports
      (client_id, title, description, lat, lon, photo_uri, video_uri, created_at_client, status, incident_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.clientId,
      report.title ?? null,
      report.description ?? null,
      report.lat ?? null,
      report.lon ?? null,
      report.photoUri ?? null,
      report.videoUri ?? null,
      report.createdAtClient,
      report.status ?? 'pending',
      report.incidentId ?? null,
    ]
  );
}

export function updateReportStatus(clientId, status, incidentId) {
  db.runSync(`UPDATE reports SET status = ?, incident_id = ? WHERE client_id = ?`, [
    status,
    incidentId ?? null,
    clientId,
  ]);
}

export function updateGemmaResult(clientId, gemmaResult) {
  db.runSync(`UPDATE reports SET gemma_result_json = ? WHERE client_id = ?`, [
    gemmaResult ? JSON.stringify(gemmaResult) : null,
    clientId,
  ]);
}

export function getAllReports() {
  return db.getAllSync(`SELECT * FROM reports ORDER BY created_at_client DESC`);
}

export function getPendingReports() {
  return db.getAllSync(`SELECT * FROM reports WHERE status IN ('pending', 'error')`);
}

export function countReports() {
  const row = db.getFirstSync(`SELECT COUNT(*) as count FROM reports`);
  return row?.count ?? 0;
}
