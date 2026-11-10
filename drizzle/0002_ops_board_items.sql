DROP TABLE entries;
--> statement-breakpoint
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  lane TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  due_date TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  closed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE board_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  updated_at INTEGER NOT NULL
);
