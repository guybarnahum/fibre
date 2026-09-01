CREATE TABLE IF NOT EXISTS fibre_admin_entitlements (
  email TEXT PRIMARY KEY,
  admin INTEGER NOT NULL CHECK (admin IN (0, 1))
);
