# VFO Fensterkonfigurator – Konzept & Umsetzung

Standalone-Web-App (Three.js + jsPDF, keine Build-Tools). Start:

```bash
python3 -m http.server 5179
```

Danach http://localhost:5179 öffnen.

## Grundidee

Eine **Bestellung besteht aus Positionen** (Fenster), zum Beispiel für verschiedene Etagen. Alle Fenster erben die **Grundeinstellungen**. Jedes Fenster kann einzelne **Gruppen** individuell überschreiben (Material & Profil, Sicherheit, Farben, Verglasung, Sprossen, Griff, Rollladen, Insektenschutz, Fensterbank).

- Ändert man in einem Fenster eine Option, wird diese Gruppe automatisch „Individuell“. Mit „Zurücksetzen“ gilt wieder die Grundeinstellung.
- In den Grundeinstellungen zeigt jede Gruppe an, wie viele Fenster abweichen. Mit „Angleichen“ gilt die Grundeinstellung wieder für alle.
- Maße, Aufteilung, Etage, Raum und Stückzahl gehören immer zum einzelnen Fenster.

## Navigation (Sidebar, max. 3 Tab-Zeilen, alle im gleichen Stil)

1. **Grundeinstellungen · Übersicht**: immer sichtbar
2. **Fenster 1 · Fenster 2 · … · + Fenster**: sichtbar, sobald mindestens 1 Fenster existiert
3. **Maße · Aufteilung · Profil · Farben · Glas · Griff · Extras**: sichtbar, wenn man in einem Fenster ist

Die Tabs sind linksbündig und nicht scrollbar. Das aktive Element ist blau gefüllt. Das gewählte Fenster bleibt auch außerhalb der Fensteransicht markiert.

**Weiter/Zurück** unten in der Sidebar: Grundeinstellungen → Fenster 1 (alle Reiter) → Fenster 2 … → Übersicht. Die Übersicht enthält die Exit-Aktionen „PDF“ und „Angebot anfordern“.

- **Übersicht**: Fensterliste gruppiert nach Etage, mit Schema, Einzel- und Gesamtpreis, Stückzahl, Duplizieren und Löschen (mit Rückgängig). Ein Klick auf eine Position öffnet das Fenster.
- **Fenster hinzufügen / duplizieren**: Man landet direkt im neuen Fenster.
- **Start**: Ist nach dem Laden kein Fenster da, wird eins angelegt. Löscht der Nutzer bewusst alle Fenster, bleibt die Liste leer (mit Leerzustand).

## 3D (eigene Szenenlogik)

- Es wird immer nur das **aktive Fenster** gezeigt, eingebaut in eine Wand mit Laibungen, Fensterbank innen und außen, Boden innen (Parkett) und außen (Pflaster), Sonne mit Schatten und HDR-Umgebung.
- **Profile mit echten Querschnitten**: Ein Profil-Loft erzeugt Gehrungen. Dargestellt werden Blendrahmen mit Anschlag, Flügel mit Überschlag, Glasleiste, Dichtungen, Pfosten und Kämpfer, 2- oder 3-fach-Glas mit warmer Kante, Sprossen, Griffe (4 Modelle), Bänder, Aufsatz- und Vorbaurollladen mit Lamellen, Insektenschutz (Spannrahmen oder Plissee) und eine Alu-Fensterbank mit Tropfkante.
- **Kamerasystem**: Es gibt einen Zielzustand (Ziel, Winkel, Neigung, Abstand), dem die Kamera gedämpft folgt. Eingaben und Fokus-Presets ändern nur diesen Zielzustand, daher gibt es kein Springen und kein Gegeneinander. Ein Fokus kann einem Bauteil „folgen“, zum Beispiel dem Griff bei geöffnetem oder gekipptem Flügel. Beim Wechsel zwischen außen und innen fährt die Kamera um die Wand herum statt hindurch.
- **Auto-Fokus**:
  - Farbe außen → Außenansicht, Farbe innen → Innenansicht
  - Griff und Sicherheit → Griff-Nahaufnahme, auch geöffnet oder gekippt
  - Glas → Glaskante
  - Profil → Ecke innen
  - Rollladen, Insektenschutz und Fensterbank → passende Ansicht
  - Maße → Frontansicht mit Maßketten
- **Bauteil anklicken** im 3D öffnet den passenden Reiter.
- **Werkzeugleiste**: Außen/Innen · Zu/Gekippt/Offen · Rollladen-Position · Ansicht zentrieren

## PDF (K3-Design: #00A4DD, ruhige Typo)

- **Deckblatt**: Kennzahlen, Positionstabelle mit 3D-Thumbnails, Summen netto/MwSt./brutto
- **Je Position eine Seite**: 3D-Außenansicht, 3D-Innenansicht, technische Zeichnung von innen (DIN-Öffnungssymbole, Maßketten), Ausstattung (Abweichungen von der Grundeinstellung markiert), Preisaufstellung
- **Letzte Seite**: nächste Schritte und Konditionen

## Dateien

| Datei | Inhalt |
|---|---|
| `js/catalog.js` | Optionen, Feldgeometrie, Validierung, Preise |
| `js/state.js` | Zustand, Vererbung, Navigation, Speicherung im localStorage |
| `js/main.js` | Sidebar, Inhalte, Events, Kamera-Kopplung, Angebotsformular |
| `js/ui.js` | UI-Bausteine, Fensterschema als SVG |
| `js/geometry.js` | Profil-Loft und Prismen |
| `js/window3d.js` | 3D-Fenstermodell und Animation |
| `js/materials.js` | Prozedurale Texturen und Materialien |
| `js/stage.js` | Wand, Licht, Maßketten |
| `js/viewer.js` | Renderer, Kamerasystem, Picking, Screenshots |
| `js/pdf.js` | Angebots-PDF |
