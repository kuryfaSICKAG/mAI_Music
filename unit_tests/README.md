# Unit Tests - mAI_Music Project

## Übersicht

Dieses Verzeichnis enthält umfassende Unit-Tests für alle Module des mAI_Music-Projekts.

### Struktur der Tests

```
unit_tests/
├── data.test.ts              # Tests für Datenverwaltung (data.ts)
├── serverContext.test.ts     # Tests für Server-Kontext und Utilities
├── deezer.test.ts            # Tests für Deezer API Integration
├── service.test.ts           # Tests für Song-Dienste
├── playlists.test.ts         # Tests für Playlist-Operationen
├── models.test.ts            # Tests für Datenmodelle
├── testRunner.ts             # Benutzerdefinierter Test-Runner mit Fortschritt
├── README.md                 # Diese Datei
└── [weitere Test-Dateien]
```

## Test-Module

### 🔧 data.test.ts

- **JSON Verwaltung**: loadJSON, saveJSON Funktionen
- **Benutzer Management**: Benutzer erstellen, speichern, laden
- **Playlist Management**: Playlist-Daten persistieren
- **Validierung**: Datenstruktur Integration

### 🖥️ serverContext.test.ts

- **Token Management**: Bearer Token Extraktion
- **Session Management**: Session-Erstellung und TTL
- **Hilfsfunktionen**: createId, defaultProfile, toSafeUser
- **Song Verwaltung**: Song-ID Normalisierung
- **Playlist Operationen**: Status und Verwaltung

### 🎵 deezer.test.ts

- **Track Suche**: Suche nach Variationen
- **Track Lookup**: Details abrufen
- **Artist/Album Suche**: Künstler- und Album-Suche
- **Fehlerbehandlung**: API-Fehler, Netzwerk-Fehler
- **URL Encoding**: Spezialzeichen in Anfragen

### 🔧 service.test.ts

- **Song Search**: Suchergebnisse, State Management
- **Track Info**: Titel-Abruf mit Fallback
- **Fehlerbehandlung**: API Fehler, leere Ergebnisse
- **Edge Cases**: Große Suchergebnisse, Sonderzeichen

### 📝 playlists.test.ts

- **Playlist Erstellung**: Duplikaterkennung, Status-Handling
- **Playlist Löschung**: Entfernen, Error Cases
- **Playlist Umbenennung**: Namenskonfikte
- **Status Management**: Public/Private Toggle
- **Song Management**: Hinzufügen, Entfernen, Reordern
- **Validierung**: Feld-Validierung, Status-Werte

### 📊 models.test.ts

- **Playlist Model**: Struktur und Validierung
- **Song Model**: Felder, optionale Eigenschaften
- **Album Model**: Album-Struktur
- **Artist Model**: Künstler-Daten
- **Genre Type**: Gültige Genre-Werte
- **Model Relationships**: Beziehungen zwischen Modellen

## Installation & Setup

1. **Dependencies installieren**:

```bash
npm install
```

2. **Vitest wird als devDependency installiert**:

```bash
npm install -D vitest @vitest/ui
```

## Test Commands

### Standard Tests (einmalige Ausführung)

```bash
npm test
```

### Watch-Modus (Live-Reload bei Änderungen)

```bash
npm run test:watch
```

### UI-Modus (Visuelle Interface)

```bash
npm run test:ui
```

### Benutzerdefinierten Test-Runner verwenden

```bash
npm run test:runner
```

**Dieser Runner zeigt einen schönen Fortschritt in der Konsole mit:**

- 🎵 Projekt-Header mit ASCII-Art
- 📋 Liste aller Test-Dateien
- ⏳ Live Test-Ausführung
- ✅/❌ Zusammenfassung mit Farben
- ⏱️ Execution Time
- Module-Übersicht mit Icons

## Test-Coverage

Die Tests decken folgende Szenarien ab:

### Happy Path

- ✅ Erfolgreiche Operationen
- ✅ Gültige Eingaben
- ✅ Korrekte Ausgaben

### Edge Cases

- 🔄 Leere Arrays
- 🔄 Null/Undefined Werte
- 🔄 Sehr große Datenmengen
- 🔄 Sonderzeichen in Strings

### Error Cases

- ❌ API-Fehler
- ❌ Netzwerk-Fehler
- ❌ Ungültige Eingaben
- ❌ Korrupte Daten

## Testingframework: Vitest

Die Tests verwenden **Vitest**, ein schnelles Unit-Test-Framework für TypeScript/JavaScript:

- ⚡ ECMAScript Module (ESM) Support
- 🚀 Schnelle Ausführung
- 📊 Code Coverage
- 🔧 Mocking & Stubbing
- 🎯 Watch Mode
- 📈 Reporter-Optionen

### Vitest Config

Siehe `vitest.config.ts` für Konfiguration:

- Node.js Environment
- Global Test Functions
- Code Coverage Provider (v8)
- Test Timeouts
- File Patterns

## Struktur einer Test-Datei

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Module Name", () => {
  beforeEach(() => {
    // Setup vor jedem Test
  });

  it("should do something specific", () => {
    // Arrange
    const input = "test";

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe("expected");
  });

  describe("Nested Feature", () => {
    it("should handle edge case", () => {
      expect(true).toBe(true);
    });
  });
});
```

## Best Practices

1. **AAA-Pattern**: Arrange → Act → Assert
2. **Aussagekräftige Beschreibungen**: Describes sollten Test-Intention klar machen
3. **Isolation**: Tests sollten unabhängig sein
4. **Mocking**: Externe Dependencies mocken
5. **Setup/Teardown**: beforeEach/afterEach für Cleanup

## Fehlerbehandlung bei Tests

Falls Tests fehlschlagen:

1. **Ausgabe prüfen**: Detaillierte Error-Messages anschauen
2. **Test isolieren**: Nur problematischen Test ausführen
3. **Mock prüfen**: Sicherstellen, dass Mocks korrekt configured sind
4. **Dependencies**: Node-Module neu installieren (`npm install`)

## Continuous Integration

Diese Tests können auch in CI/CD-Pipelines laufen:

```bash
npm test  # Auf CI-System ausführen
```

Der Exit-Code ist:

- `0` wenn alle Tests bestanden
- `1` wenn Tests fehlgeschlagen sind

## Weitere Ressourcen

- [Vitest Dokumentation](https://vitest.dev)
- [TypeScript Testing Best Practices](https://www.typescriptlang.org/)
- Projekt-README: `../README.md`

## Kontakt & Support

Bei Fragen zu den Tests:

1. Konsultieren Sie die Vitest-Dokumentation
2. Prüfen Sie existierende Test-Beispiele in dieser Suite
3. Passen Sie Tests basierend auf neuen Features an

---

**Zuletzt aktualisiert**: März 2026
