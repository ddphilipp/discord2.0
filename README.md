# GameHub

1. In Neon: SQL Editor öffnen, Inhalt von `schema.sql` ausführen.
2. Auf Vercel: Projekt importieren und Environment Variables setzen:
   - `DATABASE_URL` (Neon Connection String)
   - `AUTH_SECRET` (langer Zufallsstring, z. B. `openssl rand -hex 32`)
   - Storage → Blob-Store erstellen und mit dem Projekt verbinden (setzt `BLOB_READ_WRITE_TOKEN`)
3. Deployen.

Lokal: `.env.local` nach `.env.example` anlegen, dann `npm install && npm run dev`.
