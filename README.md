# Revolv - JTL Return Analytics

Revolv ist ein spezialisiertes Modul zur intelligenten Analyse und Optimierung von Retourenprozessen für die JTL-Wawi. Ziel ist es, die Retourenquote durch datengestützte Analysen zu senken und die Bearbeitungszeit für Kundenretouren drastisch zu verkürzen.

## 🎯 Kernfunktionen

* **KPI-Dashboard:** Schneller Überblick über Retourenquoten durch ein Ampelsystem (Rot/Orange/Gelb/Grün).
* **Kosten-Analyse:** Visualisierung der durch Retouren entstehenden Kosten pro Monat.
* **KI-Lösungs-Hub:** Intelligente Analyse von Retourengründen mit automatisierten Vorschlägen zur Überarbeitung der Artikelbeschreibungen.
* **Deep-Dive-Analysen:** Detailansicht zur Identifikation von Produkt-Schwachstellen (z.B. passformbedingte Retouren).

## 💻 Tech-Stack

* **Backend:** ASP.NET Core (C#), Entity Framework Core, JWT-Authentifizierung (BCrypt)
* **Datenbank:** Microsoft SQL Server (Eigenes Schema: `revolv`)
* **Frontend:** React mit TypeScript (Vite)
* **Design:** Figma (UI/UX Mockups)

## 🚀 Zielsetzung für das Praktikum

Dieses Projekt wird im Rahmen eines 8-wöchigen Praktikums bei JTL-Software entwickelt. Der Fokus liegt auf der nahtlosen Integration in E-Commerce-Workflows und der Verbesserung der User Experience bei der Bearbeitung komplexer Datenmengen in der Cloud-Wawi.

---

## 🛠️ Lokale Entwicklung & Setup

### Voraussetzungen
* [.NET SDK](https://dotnet.microsoft.com/download) (für das C#-Backend)
* [Node.js](https://nodejs.org/) (für das React-Frontend)
* SQL Server Management Studio (SSMS) für die Datenbank

### 1. Repository klonen
Lade das Projekt lokal auf deinen Rechner herunter und öffne es in deiner Entwicklungsumgebung.

### 2. Backend Starten (RevolvAPI)
Damit der Login, die Datenbankverbindung und die JWT-Generierung lokal funktionieren, müssen einmalig die geheimen Schlüssel in den lokalen User Secrets hinterlegt werden. Führe dazu folgende Befehle in der Konsole im Ordner des Backends aus:

```bash
dotnet user-secrets set "Jwt:Key" "MeinSuperGeheimerJtlRevolvKeyDerSehrLangIst123!"
dotnet user-secrets set "Jwt:Issuer" "RevolvAPI"
```
Als Nächstes musst du deine lokale Datenbank mit dem Backend verbinden:

```bash
dotnet user-secrets set "ConnectionStrings:WawiConnection" "DeinConnectionString"
```

Starte das Backend anschließend über Visual Studio (Play-Button) oder per Konsole:

```bash
dotnet run
```

Die API (inkl. Swagger-UI zum Testen der Endpunkte) ist nun erreichbar.

3. Frontend Starten (React)
Wechsle in den Frontend-Ordner, installiere die Abhängigkeiten und starte den lokalen Vite-Server:

```bash
npm install
npm run dev
```

Das Frontend ist nun standardmäßig unter http://localhost:5173 erreichbar.
