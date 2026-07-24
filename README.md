# Revolv – JTL Return Analytics

Revolv ist ein spezialisiertes Modul zur intelligenten Analyse und Optimierung von Retourenprozessen für die JTL-Wawi. Ziel ist es, die Retourenquote durch datengestützte Analysen zu senken.

## Inhaltsverzeichnis

1. [Kernfunktionen](#kernfunktionen)
2. [Tech-Stack](#tech-stack)
3. [Projektstruktur](#projektstruktur)
4. [Voraussetzungen](#voraussetzungen)
5. [Setup – Schritt für Schritt](#setup--schritt-für-schritt)
6. [Backend testen (Swagger + Auth)](#backend-testen-swagger--auth)
7. [API-Endpunkte im Überblick](#api-endpunkte-im-überblick)
8. [Frontend-Routen](#frontend-routen)
9. [Code-Qualität (Husky)](#code-qualität-husky)
10. [Nützliche Befehle](#nützliche-befehle)
11. [Troubleshooting](#troubleshooting)

---

## Kernfunktionen

- **KPI-Dashboard:** Schneller Überblick über Retourenquoten durch ein Ampelsystem (Rot/Orange/Gelb/Grün).
- **Kosten-Analyse:** Visualisierung der durch Retouren entstehenden Kosten pro Monat.
- **KI-Lösungs-Hub:** Intelligente Analyse von Retourengründen mit automatisierten Vorschlägen zur Überarbeitung der Artikelbeschreibungen.
- **Deep-Dive-Analysen:** Detailansicht zur Identifikation von Produkt-Schwachstellen (z. B. passformbedingte Retouren).

## Tech-Stack

- **Backend:** ASP.NET Core 10 (C#), Entity Framework Core, JWT-Authentifizierung, BCrypt, Swashbuckle (Swagger)
- **Datenbank:** Microsoft SQL Server (eigenes Schema: `revolv`)
- **Frontend:** React 19, TypeScript, Vite, React Router
- **UI:** JTL Platform UI (`@jtl-software/platform-ui-react`), Tailwind CSS 4, Lucide Icons
- **Qualitätssicherung:** Husky (Pre-Commit), Oxlint/Oxfmt (Frontend), `dotnet format` (Backend)
- **Design:** Figma-Mockups im Ordner `mockup/`

## Projektstruktur

```text
Revolv/
├── RevolvAPI/          # ASP.NET Core Web API (Auth, JWT, EF Core, Swagger)
│   ├── Controllers/    # REST-Endpunkte (Auth, User, Dashboard, Article, ...)
│   ├── Data/           # AppDbContext + DbSeeder (Demo-Daten)
│   ├── DTOs/           # Datenübertragungsobjekte für die API
│   ├── Models/         # EF-Core-Entitäten
│   └── Services/       # TokenService, PasswordService, ReturnRateBandService
├── Frontend/           # React + TypeScript (Vite)
│   └── src/
│       ├── pages/       # Login, Dashboard, Retouren-Analyse, KI-Empfehlungen, ...
│       ├── components/  # Wiederverwendbare UI-Komponenten
│       └── utils/       # apiFetch-Helper (Auth-Header, 401-Handling), user.ts
├── Database/           # SQL-Skripte für Schema und Tabellen
├── mockup/             # Figma-Make-Prototyp (Referenz-UI)
└── .husky/             # Git Pre-Commit Hooks
```

## Zielsetzung für das Praktikum

Dieses Projekt wird im Rahmen eines 8-wöchigen Praktikums bei JTL-Software entwickelt. Der Fokus liegt auf der nahtlosen Integration in E-Commerce-Workflows und der Verbesserung der User Experience bei der Bearbeitung komplexer Datenmengen in der Cloud-Wawi.

---

## Voraussetzungen

- [.NET SDK 10](https://dotnet.microsoft.com/download) (für das C#-Backend)
- [Node.js](https://nodejs.org/) (LTS, für das React-Frontend)
- Microsoft SQL Server und [SQL Server Management Studio (SSMS)](https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms) für die Datenbank
- Ein SQL-Login mit Zugriff auf die (lokale) `eazybusiness`-Datenbank

---

## Setup – Schritt für Schritt

### 1. Repository klonen & initialisieren

```bash
git clone https://github.com/mintelLucaJTL/Revolv.git
cd Revolv
npm install
```

Der `npm install` im Hauptverzeichnis installiert **Husky** und richtet die Git-Pre-Commit-Hooks ein (siehe [Code-Qualität](#code-qualität-husky)).

### 2. Datenbank einrichten

Das Backend erwartet eine SQL-Server-Datenbank mit dem Schema `revolv` (Standard-DB: `eazybusiness`). Führe im Ordner `Database/` **alle** SQL-Skripte einmalig in SSMS aus, am besten in dieser Reihenfolge (wegen Fremdschlüssel-Abhängigkeiten):

| Reihenfolge | Skript | Erstellt |
|---|---|---|
| 1 | `RevolvSchema.sql` | Schema `revolv` + Tabelle `revolv.Users` (Login/Registrierung) |
| 2 | `revolv.Users_AddName.sql` | Spalte `Name` auf `revolv.Users` |
| 3 | `revolv.Articles.sql` | Tabelle `revolv.Articles` |
| 4 | `revolv.AiRecommendations.sql` | Tabelle `revolv.AiRecommendations` (FK → Articles) |
| 5 | `dbo.QualityIssues.sql` | Tabelle `dbo.QualityIssues` (FK → AiRecommendations) |
| 6 | `revolv.DescriptionProposals.sql` | Tabelle `revolv.DescriptionProposals` (FK → AiRecommendations) |
| 7 | `revolv.ActionRecommendations.sql` | Tabelle `revolv.ActionRecommendations` (FK → AiRecommendations) |
| 8 | `revolv.ShopSettings.sql` | Tabelle `revolv.ShopSettings` (Schwellenwerte, Tonfall) |

Alle Skripte sind idempotent (`IF NOT EXISTS ...`) – ein mehrfaches Ausführen ist unproblematisch.

Hinweis: Die Skripte nutzen standardmäßig `USE eazybusiness;`. Passe das bei Bedarf an deine lokale Datenbank an.

Im Ordner `Database/UsefullCodes/` liegen zusätzlich Hilfsskripte (z. B. `CheckArticles.sql`, `cleanup.sql`) zum Debuggen/Zurücksetzen der Demo-Daten.

### 3. Backend konfigurieren & starten (RevolvAPI)

Wechsle in den Backend-Ordner und hinterlege die sensiblen Werte lokal über **.NET User Secrets** (landen nicht im Repo):

```bash
cd RevolvAPI
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:WawiConnection" "Server=localhost;Database=eazybusiness;Trusted_Connection=True;TrustServerCertificate=True;"
dotnet user-secrets set "Jwt:Key" "MeinSuperGeheimerJtlRevolvKeyDerSehrLangIst123!"
dotnet user-secrets set "Jwt:Issuer" "RevolvAPI"
```

- `Jwt:Key` muss ein hinreichend langer, zufälliger String sein (HMAC-SHA256 benötigt mindestens 32 Zeichen).

Starte die API anschließend über Visual Studio (**RevolvAPI**) oder per Konsole:

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

Rufe `http://localhost:5215/test-db` im Browser auf, um zu prüfen, ob die Datenbankverbindung funktioniert ("Successfully connected to DB!"). Beim ersten Start füllt der `DbSeeder` außerdem automatisch ein paar Demo-Artikel mit KI-Empfehlungen in die Datenbank ein (nur wenn `revolv.Articles` noch leer ist).

### 4. Frontend starten (React)

In einem **zweiten Terminal**:

```bash
cd Frontend
npm install
npm run dev
```

Das Frontend läuft standardmäßig unter http://localhost:5173 und ruft die API unter `http://localhost:5215` auf (siehe `Frontend/src/utils/api.ts`, `API_BASE_URL`). Falls dein Backend auf einem anderen Port läuft, diese Konstante entsprechend anpassen.

### 5. Testbenutzer anlegen & einloggen

Ein Benutzer kann entweder direkt im Frontend über `/register` angelegt werden, oder über den `/api/auth/register`-Endpunkt in Swagger (siehe unten). Danach unter `/login` im Frontend (oder `/api/auth/login`) einloggen – das Frontend speichert das erhaltene JWT automatisch in `localStorage` (`authToken`) und hängt es bei jedem Request über den zentralen `apiFetch`-Helper (`Frontend/src/utils/api.ts`) als `Authorization: Bearer <token>`-Header an.

Damit bist du vom Start (leere DB) bis zum fertigen, eingeloggten Frontend durch.

---

## Backend testen (Swagger + Auth)

Fast alle Endpunkte sind mit `[Authorize]` geschützt und erwarten ein gültiges JWT. So testest du sie in Swagger UI (http://localhost:5215/swagger):

1. **Benutzer registrieren:** Endpunkt `POST /api/auth/register` aufklappen → "Try it out" → Body ausfüllen (`name`, `email`, `password`) → "Execute".
2. **Einloggen:** Endpunkt `POST /api/auth/login` mit denselben Zugangsdaten aufrufen. Die Antwort enthält `{ "token": "eyJ..." }`. Token kopieren.
3. **Autorisieren:** Oben rechts in Swagger UI auf den Button **Authorize** (🔒) klicken. Im Feld **exakt** Folgendes eintragen (das Wort `Bearer` gefolgt von einem Leerzeichen und dem Token):

   ```text
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. Mit **Authorize** bestätigen und den Dialog schließen. Ab jetzt zeigen alle geschützten Endpunkte ein geschlossenes Schloss-Symbol und der Header wird automatisch mitgesendet.
5. Jetzt kannst du z. B. `GET /api/dashboard/kpi` oder `GET /api/articles` per "Try it out" → "Execute" testen und solltest `200 OK` mit echten Daten erhalten statt `401 Unauthorized`.

Falls der Token nicht funktioniert, siehe [Troubleshooting](#troubleshooting).

---

## API-Endpunkte im Überblick

Alle Endpunkte außer den `Auth`-Endpunkten benötigen den `Authorization: Bearer <token>`-Header.

### Auth (`api/auth`) – öffentlich

| Methode | Endpunkt | Beschreibung |
|---------|----------|---------------|
| `POST` | `/api/auth/register` | Neuen Benutzer anlegen |
| `POST` | `/api/auth/login` | Login, liefert JWT-Token |
| `POST` | `/api/auth/migrate-passwords` | Einmalig: legacy Klartext-Passwörter nachträglich hashen |

### User (`api/user`) 🔒

| Methode | Endpunkt | Beschreibung |
|---------|----------|---------------|
| `GET` | `/api/user/me` | Profil des eingeloggten Benutzers |
| `PATCH` | `/api/user/me` | Anzeigename aktualisieren |

### Dashboard (`api/dashboard`) 🔒

| Methode | Endpunkt | Beschreibung |
|---------|----------|---------------|
| `GET` | `/api/dashboard/kpi` | Gesamt-KPIs (Retourenquote, betroffene Artikel, offene Empfehlungen) |
| `GET` | `/api/dashboard/traffic-lights` | Ampel-Auswertung (Rot/Gelb/Grün) inkl. Schwellenwerten |
| `GET` | `/api/dashboard/return-reasons` | Top-5-Retourengründe |

### Artikel & Retouren (`api/articles`) 🔒

| Methode | Endpunkt | Beschreibung |
|---------|----------|---------------|
| `GET` | `/api/articles` | Liste aller Artikel mit Retourenquote |
| `GET` | `/api/articles/{id}` | Detailansicht eines Artikels inkl. KI-Empfehlungen |
| `GET` | `/api/articles/returns` | Tabellendaten für die Retouren-Analyse-Seite |

### KI-Empfehlungen (`api/ai`) 🔒

| Methode | Endpunkt | Beschreibung |
|---------|----------|---------------|
| `GET` | `/api/ai/overview` | Übersicht aller KI-Empfehlungen mit Badges/Zähler |
| `GET` | `/api/ai/recommendations/{articleId}` | Detail-Empfehlung für einen Artikel |
| `PATCH` | `/api/ai/description/{id}/status` | Status eines Beschreibungsvorschlags ändern |
| `PATCH` | `/api/ai/description/{id}/text` | Vorgeschlagenen Text bearbeiten |
| `PATCH` | `/api/ai/quality/{id}/status` | Status eines Qualitätsproblems ändern |
| `PATCH` | `/api/ai/action/{id}/complete` | Handlungsempfehlung als erledigt markieren |

### Qualität (`api/quality`) 🔒

| Methode | Endpunkt | Beschreibung |
|---------|----------|---------------|
| `GET` | `/api/quality/open` | Alle offenen Qualitätsprobleme inkl. Artikelbezug |

### Einstellungen (`api/settings`) 🔒

| Methode | Endpunkt | Beschreibung |
|---------|----------|---------------|
| `GET` | `/api/settings` | Aktuelle Shop-Einstellungen (Tonfall, Schwellenwerte) |
| `PUT` | `/api/settings` | Shop-Einstellungen aktualisieren |

### Sonstiges

| Methode | Endpunkt | Beschreibung |
|---------|----------|---------------|
| `GET` | `/test-db` | Prüft die Datenbankverbindung (kein Auth nötig) |

---

## Frontend-Routen

| Route | Seite | Geschützt? |
|-------|-------|------------|
| `/` | Redirect auf `/dashboard` bzw. `/login` | – |
| `/login` | Login | ❌ |
| `/register` | Registrierung | ❌ |
| `/dashboard` | KPI-Dashboard | ✅ |
| `/retouren-analyse` | Retouren-Analyse (Artikeltabelle) | ✅ |
| `/ki-empfehlungen` | KI-Lösungs-Hub | ✅ |
| `/settings` | Einstellungen (Schwellenwerte, Tonfall) | ✅ |
| `/profile` | Benutzerprofil | ✅ |

Geschützte Routen leiten ohne gültiges Token in `localStorage` automatisch auf `/login` um (siehe `Frontend/src/App.tsx`).

---

## Code-Qualität (Husky)

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
# Frontend: Dev-Server
cd Frontend && npm run dev

# Frontend: Production-Build
cd Frontend && npm run build

# Backend: starten
cd RevolvAPI && dotnet run

# Backend: Formatierung prüfen (ohne Änderungen)
cd RevolvAPI && dotnet format RevolvAPI.csproj --verify-no-changes

# Backend: Build
cd RevolvAPI && dotnet build RevolvAPI.csproj

# Backend: neuen User-Secret setzen/ändern
cd RevolvAPI && dotnet user-secrets set "Schlüssel" "Wert"

# Backend: alle User Secrets anzeigen (Namen + Werte, nur lokal!)
cd RevolvAPI && dotnet user-secrets list
```

---

## Troubleshooting

**"401 Unauthorized" trotz eingegebenem Token in Swagger**
Prüfe, ob im Feld wirklich `Bearer <token>` (mit Leerzeichen, ohne Anführungszeichen) steht. Prüfe außerdem, ob der Token noch gültig ist (läuft nach 120 Minuten ab, siehe `TokenService.cs`) und ob `Jwt:Key`/`Jwt:Issuer` in den User Secrets gesetzt sind.

**Build-Fehler rund um `Microsoft.OpenApi` / `OpenApiSecurityScheme` in `Program.cs`**
Das Projekt nutzt `Swashbuckle.AspNetCore` (Swagger), das seine eigene, kompatible Version von `Microsoft.OpenApi` mitbringt. **Füge `Microsoft.OpenApi` nicht manuell als eigenes NuGet-Paket hinzu** (z. B. per `dotnet add package Microsoft.OpenApi`) – das zieht eine neuere, inkompatible Major-Version und führt zu Compile-Fehlern (`OpenApiReference`/`.Models`-Namespace nicht gefunden etc.).

**Datenbankverbindung schlägt fehl**
`http://localhost:5215/test-db` aufrufen, um die Fehlermeldung zu sehen. Meistens liegt es an einer falschen `ConnectionStrings:WawiConnection` in den User Secrets (Server-Name, Datenbankname `eazybusiness`, Trusted Connection vs. SQL-Login).

**Frontend bekommt CORS-Fehler**
Stelle sicher, dass das Backend läuft und die Frontend-URL (`http://localhost:5173`) mit der in `Program.cs` konfigurierten CORS-Policy `AllowReactFrontend` übereinstimmt.

**Commit wird von Husky blockiert**
Siehe [Code-Qualität (Husky)](#code-qualität-husky).
