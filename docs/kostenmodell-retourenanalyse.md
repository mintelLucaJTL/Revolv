# Konzept: Kostenmodell für Retourenkosten-Analyse

Referenz für Backend-/Frontend-Tickets, die Kosten von Retouren berechnen oder anzeigen.
Implementiert in `RevolvAPI/Services/ReturnAnalyticsService.cs`
(`GetMonthlyReturnCostsAsync`) und `GET /api/dashboard/return-costs`
(`RevolvAPI/Controllers/DashboardController.cs`), gebaut für Ticket #273
("Frontend: Kosten-Chart im Dashboard integrieren").

## Kostenkomponente

| Komponente | Bedeutung | Berechnung |
|---|---|---|
| Warenwert der Retoure | Wert der zurückgesendeten Ware | `ReturnedQuantity × durchschnittlicher Netto-Verkaufspreis des Artikels` |

Bewusst **nicht** enthalten (out of scope für dieses Kostenmodell):
- **Rückversandkosten** (Porto/Bearbeitung) — kein Kostenfeld in der WAWI-Anbindung.
- **Wiedereinlagerungs-/Prüfkosten** (Personalzeit) — ebenfalls keine Datengrundlage.
- Beides könnte künftig als zusätzliche, separat konfigurierbare Annahme ergänzt werden,
  ist aber bewusst nicht Teil dieses Modells, um Ist-Daten und Schätzwerte nicht in einer
  Zahl zu vermischen.

## Ist-Daten vs. Annahmen

| Feld | Quelle |
|---|---|
| `ReturnedQuantity`, Monat | Echte Ist-Daten aus `WawiReturn` / `WawiReturnLineItem` |
| Verkaufspreis je Artikel | Echte Ist-Daten: Durchschnitt der tatsächlich in Rechnung gestellten Preise aus `WawiSalesInvoiceLineItem.SalesPriceNet` |
| Verkaufspreis-Fallback | `WawiItem.SalesPriceNet` (aktueller Katalogpreis) — nur wenn ein Artikel keine erfassten Verkäufe hat |

Der Report basiert also überwiegend auf **echten Ist-Daten**, nicht auf konfigurierbaren
Annahmen. Die einzige "Annahme" ist der Preis-Fallback auf den Katalogpreis bei fehlenden
Verkaufsdaten. Damit das im Response sichtbar ist statt sich mit echten Werten zu vermischen,
markiert jeder Monat ein `isEstimated`-Flag: `true`, wenn mindestens ein in diesem Monat
zurückgesendeter Artikel über den Katalogpreis statt eines echten Rechnungspreises bewertet
wurde.

## Zeitdimension

**Retoureneingang** (`WawiReturn.ReturnDate`) — nicht Bestelldatum, nicht Gutschriftsdatum.
Begründung: Retoureneingang ist das einzige Datum, das in der aktuellen WAWI-Anbindung sowohl
vorhanden als auch eindeutig einer Retoure zugeordnet ist. Gutschriftsdaten werden aktuell
nicht gemappt.

## Währung & MwSt.

- **Einzige unterstützte Währung: EUR.** Wie der Rest der App geht das Kostenmodell von einem
  Single-Tenant-Shop ohne Mehrwährungsbetrieb aus.
- **Alle Beträge sind Netto** (`SalesPriceNet` — explizit der Netto-Einzelpreis, siehe
  `WawiSalesInvoiceLineItem.cs`). Es findet keine MwSt.-Auf- oder -Abschlagsrechnung im Code
  statt; die Zahlen entsprechen dem, was tatsächlich netto in Rechnung gestellt wurde.

## Bekannte Lücken / Folgearbeiten

- Keine Rückversand- oder Wiedereinlagerungskosten (fehlende Kostendaten, siehe oben).
- Keine Mehrwährungsunterstützung.
- Bei Artikeln ohne jegliche Verkaufshistorie und ohne Katalogpreis (`SalesPriceNet = 0`)
  wird der Warenwert für diese Retouren mit 0 € gezählt statt als "unbekannt" markiert —
  kann die Gesamtsumme leicht unterschätzen.

## Referenzierbare Implementierung

- Datenzugriff: `RevolvAPI/Services/ReturnAnalyticsService.cs` (`GetMonthlyReturnCostsAsync`,
  `GetAverageSalesPriceByItemAsync`)
- Reine, getestete Berechnungslogik: `RevolvAPI/Services/ReturnCostAggregator.cs`
  (Monats-Bucketing, Rundung, Lückenfüllung, Schätzwert-Flag)
- Tests: `RevolvAPI.Tests/ReturnCostAggregatorTests.cs`
- Endpoint: `GET /api/dashboard/return-costs?months=6` → `ReturnCostsResponseDto`
  (`RevolvAPI/DTOs/ReturnCostsResponseDto.cs`), jeder Monat mit `isEstimated`-Flag
- Datenmodell: `MonthlyReturnCost` (`RevolvAPI/Services/ReturnAnalyticsModels.cs`)
