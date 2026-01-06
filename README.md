
# ilaychat - Global Realtime Lounge 🚀

Dies ist eine moderne Realtime-Chat-Anwendung auf Basis von React, Tailwind CSS und Supabase.

## Features
- **Realtime:** Nachrichten erscheinen sofort bei allen Nutzern.
- **Auto-Cleanup:** Die Datenbank behält automatisch nur die letzten 200 Nachrichten (verhindert Überfüllung).
- **No-Build:** Läuft direkt im Browser via ESM (Import Maps).

## Deployment auf GitHub Pages

1. **GitHub Repository erstellen.**
2. **Dateien hochladen:** Lade alle Dateien aus diesem Verzeichnis (inkl. Ordner) hoch.
3. **Supabase Keys:** Stelle sicher, dass deine Keys in `services/supabase.ts` korrekt hinterlegt sind.
4. **Settings -> Pages:** 
   - Build and deployment -> Source: "Deploy from a branch"
   - Branch: `main` auswählen.
5. **Fertig!** Deine App ist unter `https://[dein-name].github.io/[repo-name]` erreichbar.

---
*Entwickelt für maximale Ästhetik und Performance.*
