# Kostenmodell für die Retourenkosten-Analyse

Konzept-Dokument zu Ticket #257. Referenziert von den Folge-Tickets #274 (Backend-Endpoint)
und #273 (Frontend-Chart).

## Ausgangslage

`ReturnAnalyticsService.GetMonthlyReturnCostsAsync` liefert aktuell nur den **Warenwert**
der zurückgesendeten Artikel (`Menge × Ø netto Verkaufspreis`), keine echten Zusatzkosten.
Das überschätzt die tatsächlichen Kosten (volle Annahme: Ware ist wertlos) und ignoriert
Versand/Handling/Wiedereinlagerung komplett.

## Kostenkomponenten

Vier feste Kostenarten, deren **Beträge** in den Settings editierbar sind (wie schon bei den
Ampel-Schwellenwerten) - keine frei anlegbaren, benutzerdefinierten Kostenposten (bewusst
einfach gehalten für den aktuellen Scope).

| Komponente | Granularität | Default | Bedeutung |
|---|---|---|---|
| `ValueLossPercent` | % vom Warenwert, pro Position | 30 % | Anteil des Warenwerts, der durch die Retoure tatsächlich verloren geht (Ware wird meist reduziert weiterverkauft, nicht komplett abgeschrieben) |
| `ShippingCostPerReturn` | fix, **pro Retourenvorgang** | 4,95 € | Rückversandkosten - ein Paket mit mehreren Artikeln wird nur einmal zurückgeschickt |
| `HandlingCostPerItem` | fix, pro retournierter Position | 3,50 € | Prüfung/Wareneingang je Artikel |
| `RestockingCostPerItem` | fix, pro retournierter Position | 1,50 € | Wiedereinlagerung je Artikel |

## Formel

```
Kosten(Zeitraum) =
    Σ (je Retoure im Zeitraum)     ShippingCostPerReturn
  + Σ (je Position im Zeitraum)    HandlingCostPerItem
                                  + RestockingCostPerItem
                                  + ValueLossPercent × (Menge × Ø-Verkaufspreis)
```

Der Warenwert-Teil (`Menge × Ø-Verkaufspreis`) nutzt weiterhin die bestehende, bereits
implementierte Preisermittlung (`GetAverageSalesPriceByItemAsync`): Ø tatsächlicher
Netto-Verkaufspreis aus Rechnungspositionen, Fallback auf den Katalogpreis bei Artikeln
ohne erfasste Verkäufe.

## Ist-Daten vs. Annahmen

- **Ist-Daten aus der WAWI:** Menge und Warenwert (Rechnungspositionen/Katalogpreis).
- **Konfigurierbare Annahmen:** die vier Kostenfaktoren oben - sinnvolle Defaults, vom
  Nutzer in den Settings anpassbar. Im UI/Chart als Schätzung kennzeichnen, nicht als
  exakten Ist-Wert.

## Zeitdimension

Wie bisher: **Retoureneingang** (`WawiReturn.ReturnDate`), nicht Bestelldatum oder
Gutschrift - das ist der Zeitpunkt, an dem die Kosten tatsächlich anfallen.

## Währung / MwSt.

Netto-Preise (`SalesPriceNet`) wie in der WAWI, keine MwSt.-Aufschläge (interne
Kostenbetrachtung, keine Rechnungsbeträge). Währung: EUR (einziger Zielmarkt aktuell,
im Frontend hart codiert).

## Datenmodell (für Ticket #274)

Neue Spalten auf `revolv.ShopSettings` (analog zu `ThresholdYellow`/`ThresholdRed`):

- `ValueLossPercent DECIMAL(5,2) NOT NULL DEFAULT 30.0`
- `ShippingCostPerReturn DECIMAL(10,2) NOT NULL DEFAULT 4.95`
- `HandlingCostPerItem DECIMAL(10,2) NOT NULL DEFAULT 3.50`
- `RestockingCostPerItem DECIMAL(10,2) NOT NULL DEFAULT 1.50`

## Migration weg vom MVP

Die bestehende `GetMonthlyReturnCostsAsync`-Berechnung wird auf die Formel oben umgestellt.
Der `ValueLossPercent`-Default (30 %) ist bewusst so gewählt, dass bestehende Zahlen nicht
plötzlich viel niedriger wirken, ohne dabei den alten "100 % Warenwert = Kosten"-Fehler
fortzuführen.
