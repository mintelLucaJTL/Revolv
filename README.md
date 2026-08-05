# Revolv – JTL Return Analytics

Revolv analysiert Retourenquoten aus einer laufenden JTL-WAWI-Datenbank und liefert KPIs, Ampel-Risikobänder, Retourenkosten-Trends sowie Verbesserungsvorschläge.

## Tech-Stack

| Schicht | Technik |
|---------|---------|
| Backend | ASP.NET Core 10, EF Core, JWT, Swagger |
| Datenbank | SQL Server (JTL-WAWI `eazybusiness`) + App-Schema `revolv` |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, JTL Platform UI |

## Projektstruktur

```text
Revolv/
├── RevolvAPI/     # ASP.NET Core Web API
├── Frontend/      # React-App
├── Database/      # SQL-Setup (00_MasterSetup.sql ausführen)
└── mockup/        # Figma-Prototyp als Referenz
```

## Voraussetzungen

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) LTS
- SQL Server + laufende JTL-WAWI-Datenbank (Standardname: `eazybusiness`)

## Setup

### 1. Klonen & Hooks

```bash
git clone https://github.com/mintelLucaJTL/Revolv.git
cd Revolv
npm install
```

### 2. Datenbank

`Database/00_MasterSetup.sql` einmal in SSMS gegen die WAWI-Datenbank ausführen. Legt Schema `revolv` und die App-Tabellen an – WAWI-Tabellen bleiben unberührt.

Artikel-, Retouren- und Verkaufsdaten kommen live aus der WAWI (`dbo` / `DAL`). Die `USE`-Zeile anpassen, falls die DB nicht `eazybusiness` heißt.

Optionale EF-Migrationen für App-Schema-Änderungen:

```bash
cd RevolvAPI
dotnet ef migrations add <Name>
dotnet ef database update
```

### 3. Backend

```bash
cd RevolvAPI
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:WawiConnection" "Server=localhost;Database=eazybusiness;Trusted_Connection=True;TrustServerCertificate=True;"
dotnet user-secrets set "Jwt:Key" "MeinSuperGeheimerJtlRevolvKeyDerSehrLangIst123!"
dotnet user-secrets set "Jwt:Issuer" "RevolvAPI"
dotnet run
```

| Dienst | URL |
|--------|-----|
| API | http://localhost:5215 |
| Swagger | http://localhost:5215/swagger |
| DB-Check | http://localhost:5215/test-db |

`Jwt:Key` muss mindestens 32 Zeichen lang sein. Es gibt kein Demo-Seeding – es werden echte WAWI-Artikel genutzt.

### 4. Frontend

```bash
cd Frontend
npm install
npm run dev
```

App: http://localhost:5173 (API-Basis in `Frontend/src/utils/api.ts`).

### 5. Erster Login

Über `/register` oder Swagger `POST /api/auth/register` registrieren, danach einloggen. Das JWT liegt in `localStorage` und wird von `apiFetch` mitgeschickt.

## API & Auth (Swagger)

Die meisten Endpunkte brauchen ein JWT. In Swagger:

1. `POST /api/auth/register` → `POST /api/auth/login`
2. Token kopieren → **Authorize** → `Bearer <token>` eintragen
3. Geschützte Endpunkte testen (z. B. `GET /api/dashboard/kpi`)

Alle Routen: Swagger UI. Frontend-Routen: `/login`, `/register`, `/dashboard`, `/retouren-analyse`, `/ki-empfehlungen`, `/settings`, `/profile`.

### KI-Hub Overview (`GET /api/ai/overview`)

Liefert **eine Karte pro Artikel** (neueste `AiRecommendation`). IDs sind getrennt:

| Feld | Bedeutung |
|------|-----------|
| `articleId` | WAWI-Artikel (`kArtikel`) — für `GET /api/articles/{articleId}` und UI-Keys |
| `recommendationId` | PK von `revolv.AiRecommendations` — nicht für Artikel-Detailaufrufe verwenden |

`openCount` / `resolvedCount` nutzen dieselben Statusregeln wie Modal und Dashboard: QualityIssue `Erledigt`, DescriptionProposal `Akzeptiert`/`Abgelehnt`, ActionRecommendation `isCompleted`.

## Code-Qualität (Husky)

Pre-Commit prüft `Frontend/` (Oxlint/Oxfmt) und `RevolvAPI/` (`dotnet format` + Build).

```bash
# Frontend
cd Frontend && npm run format && npm run lint

# Backend
cd RevolvAPI && dotnet format RevolvAPI.csproj && dotnet build
```

Hooks einmal überspringen: `HUSKY=0 git commit -m "..."`.

## Nützliche Befehle

```bash
cd Frontend && npm run dev          # Frontend starten
cd Frontend && npm run build        # Production-Build
cd RevolvAPI && dotnet run          # API starten
cd RevolvAPI && dotnet user-secrets list
cd RevolvAPI && dotnet ef database update
```

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| 401 in Swagger | `Bearer <token>` (Leerzeichen, ohne Anführungszeichen). Token gilt 120 Min. |
| OpenApi / Swashbuckle Build-Fehler | `Microsoft.OpenApi` nicht extra als NuGet-Paket hinzufügen. |
| DB-Verbindung fehlgeschlagen | `/test-db` aufrufen; `ConnectionStrings:WawiConnection` in User Secrets prüfen. |
| CORS-Fehler | Backend muss laufen; Origin `http://localhost:5173` passt zur Policy `AllowReactFrontend`. |
| Husky blockiert Commit | Format/Lint/Build oben ausführen, dann erneut stagen. |
