CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,email TEXT UNIQUE NOT NULL,role TEXT NOT NULL,password_hash TEXT,totp_secret TEXT NOT NULL,invite_code TEXT,active INTEGER NOT NULL DEFAULT 0,created_at TEXT);
CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,created_at INTEGER,last_seen INTEGER);
CREATE TABLE records(id TEXT PRIMARY KEY,entity TEXT NOT NULL,seq INTEGER NOT NULL,data TEXT NOT NULL,created_at TEXT,updated_at TEXT,UNIQUE(entity,seq));
CREATE TABLE audit_log(id TEXT PRIMARY KEY,ts TEXT NOT NULL,actor_id TEXT,ip TEXT,action TEXT NOT NULL,target TEXT,before_json TEXT,after_json TEXT);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT,'audit_log is append-only'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_log BEGIN SELECT RAISE(ABORT,'audit_log is append-only'); END;
