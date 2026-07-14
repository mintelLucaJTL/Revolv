Wichtig vor dem start !
1. eazybusiness DB im sql db manager mit dem SQL Befehl erweitern welcher aus dem ordner Database zu entnehmen ist
2. Insert into Befehl für test user: 
INSERT INTO revolv.Users (Email, PasswordHash, CreatedAt)
VALUES (
    'test',
    '123',
    GETDATE()
);
3. In visual studio in der nugget konsole folgende Befehle Ausführen:
3.1 dotnet user-secrets init
3.2 dotnet user-secrets set "Key" "Value"
3.3 dotnet user-secrets set "Jwt:Key" "MeinSuperGeheimerJtlRevolvKeyDerSehrLangIst123!"
3.4 dotnet user-secrets set "Jwt:Issuer" "RevolvAPI"
4. React Anwendung und Rest Api starten 
5. Im broswer eingeben: localhost:7272/swagger
5.1 api/Auth/migrate-passwords ausführen


# Revolv - JTL Return Analytics

Revolv ist ein spezialisiertes Modul zur intelligenten Analyse und Optimierung von Retourenprozessen für die JTL-Wawi. Ziel ist es, die Retourenquote durch datengestützte Analysen zu senken und die Bearbeitungszeit für Kundenretouren drastisch zu verkürzen.

## Kernfunktionen

- **KPI-Dashboard:** Schneller Überblick über Retourenquoten durch ein Ampelsystem (Rot/Orange/Gelb/Grün).
- **Kosten-Analyse:** Visualisierung der durch Retouren entstehenden Kosten pro Monat.
- **KI-Lösungs-Hub:** Intelligente Analyse von Retourengründen mit automatisierten Vorschlägen zur Überarbeitung der Artikelbeschreibungen.
- **Deep-Dive-Analysen:** Detailansicht zur Identifikation von Produkt-Schwachstellen (z. B. passformbedingte Retouren).

## Tech-Stack

- **Backend:** ASP.NET Core 10 (C#), Entity Framework Core, JWT-Authentifizierung, BCrypt
- **Datenbank:** Microsoft SQL Server (eigenes Schema: `revolv`)
- **Frontend:** React 19, TypeScript, Vite, React Router
- **UI:** JTL Platform UI (`@jtl-software/platform-ui-react`), Tailwind CSS 4, Lucide Icons
- **Qualitätssicherung:** Husky (Pre-Commit), Oxlint/Oxfmt (Frontend), `dotnet format` (Backend)
- **Design:** Figma-Mockups im Ordner `mockup/`

## Projektstruktur

```text
Revolv/
├── RevolvAPI/          # ASP.NET Core Web API (Auth, JWT, EF Core)
├── Frontend/           # React + TypeScript (Vite)
├── Database/           # SQL-Skripte für Schema und Tabellen
├── mockup/             # Figma-Make-Prototyp (Referenz-UI)
└── .husky/             # Git Pre-Commit Hooks
```

## Zielsetzung für das Praktikum

Dieses Projekt wird im Rahmen eines 8-wöchigen Praktikums bei JTL-Software entwickelt. Der Fokus liegt auf der nahtlosen Integration in E-Commerce-Workflows und der Verbesserung der User Experience bei der Bearbeitung komplexer Datenmengen in der Cloud-Wawi.

---

## Lokale Entwicklung & Setup

### Voraussetzungen

- [.NET SDK 10](https://dotnet.microsoft.com/download) (für das C#-Backend)
- [Node.js](https://nodejs.org/) (für das React-Frontend)
- Microsoft SQL Server und [SQL Server Management Studio (SSMS)](https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms) für die Datenbank

### 1. Repository klonen & initialisieren

Repository klonen und im Hauptverzeichnis einmal `npm install` ausführen. Dadurch werden u. a. Husky und die Git-Hooks eingerichtet:

```bash
git clone https://github.com/mintelLucaJTL/Revolv.git
cd Revolv
npm install
```

### 2. Datenbank einrichten

Das Backend erwartet eine SQL-Server-Datenbank mit dem Schema `revolv`. Führe das Skript `Database/RevolvSchema.sql` in SSMS aus.

Das Skript:

- legt das Schema `revolv` an (falls noch nicht vorhanden)
- erstellt die Tabelle `revolv.Users` für Login und Registrierung

Hinweis: Das Skript nutzt standardmäßig die Datenbank `eazybusiness`. Passe `USE eazybusiness;` bei Bedarf an deine lokale Umgebung an.

### 3. Backend starten (RevolvAPI)

Wechsle in den Backend-Ordner und hinterlege die Secrets lokal über User Secrets:

```bash
cd RevolvAPI
dotnet user-secrets set "Jwt:Key" "MeinSuperGeheimerJtlRevolvKeyDerSehrLangIst123!"
dotnet user-secrets set "Jwt:Issuer" "RevolvAPI"
dotnet user-secrets set "ConnectionStrings:WawiConnection" "DeinConnectionString"
```

Starte die API anschließend über Visual Studio oder per Konsole:

```bash
dotnet run
```

**Erreichbare URLs (Development):**

| Dienst | URL |
|--------|-----|
| API (HTTP) | http://localhost:5215 |
| API (HTTPS) | https://localhost:7272 |
| Swagger UI | http://localhost:5215/swagger |
| DB-Test | http://localhost:5215/test-db |

**Auth-Endpunkte:**

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| `POST` | `/api/auth/register` | Neuen Benutzer anlegen |
| `POST` | `/api/auth/login` | Login und JWT-Token erhalten |

### 4. Frontend starten (React)

In einem zweiten Terminal:

```bash
cd Frontend
npm install
npm run dev
```

Das Frontend läuft standardmäßig unter http://localhost:5173.

**Routen:**

| Route | Seite |
|-------|-------|
| `/` | Dashboard |
| `/login` | Login |
| `/profile` | Profil |

### 5. Code-Qualität (Husky)

Bei Commits mit Änderungen in `Frontend/` oder `RevolvAPI/` laufen automatisch Pre-Commit-Checks:

| Bereich | Prüfung |
|---------|---------|
| Frontend | Oxlint + Oxfmt (`format:check`) |
| Backend | `dotnet format --verify-no-changes` + `dotnet build` |

Falls ein Commit blockiert wird, meist so beheben:

```bash
# Frontend
cd Frontend
npm run format
npm run lint

# Backend
cd RevolvAPI
dotnet format RevolvAPI.csproj
dotnet build RevolvAPI.csproj
```

Danach die geänderten Dateien erneut stagen (`git add ...`) und committen.

Husky bei Bedarf einmalig überspringen:

```bash
HUSKY=0 git commit -m "deine message"
```

---

## Nützliche Befehle

```bash
# Frontend: Production-Build
cd Frontend && npm run build

# Backend: Formatierung prüfen (ohne Änderungen)
cd RevolvAPI && dotnet format RevolvAPI.csproj --verify-no-changes

# Backend: Build
cd RevolvAPI && dotnet build RevolvAPI.csproj
```
