# Podłączenie BTB CG System do OBS Studio

## Wymagania

- **OBS Studio** (wersja 28 lub nowsza)
- **BTB CG System** uruchomiony (serwer nasłuchuje na porcie `3000`)

---

## Krok 1 — Uruchom BTB CG System

Upewnij się, że aplikacja jest uruchomiona. W konsoli powinieneś zobaczyć:

```
CG Server running on port 3000 (SQLite)
Output URL (Local):    http://localhost:3000/output.html
```

> Jeśli OBS działa na **innym komputerze** w sieci lokalnej, użyj adresu LAN zamiast `localhost`, np. `http://192.168.1.100:3000/output.html`.

---

## Krok 2 — Dodaj źródło „Przeglądarka" w OBS

1. W OBS otwórz scenę, na której chcesz wyświetlać grafiki.
2. W panelu **Źródła** kliknij **+** (Dodaj źródło).
3. Wybierz **Przeglądarka** (ang. *Browser*).
4. Nadaj nazwę, np. `CG Output`, i kliknij **OK**.

---

## Krok 3 — Skonfiguruj źródło przeglądarki

W oknie właściwości źródła ustaw:

| Parametr | Wartość |
|---|---|
| **URL** | `http://localhost:3000/output.html` |
| **Szerokość** | `1920` |
| **Wysokość** | `1080` |
| **FPS** | `60` (zalecane) |

Dodatkowe ustawienia (zaznacz/odznacz):

- [x] **Odśwież przeglądarkę, gdy scena staje się aktywna** — zapewnia synchronizację po przełączeniu sceny
- [ ] **Wyłącz źródło, gdy nie jest widoczne** — **odznacz**, żeby grafiki pozostawały zsynchronizowane w tle
- [ ] **Zamknij źródło, gdy nie jest widoczne** — **odznacz** z tego samego powodu

Kliknij **OK**.

---

## Krok 4 — Umieść źródło na wierzchu

Źródło `CG Output` powinno znajdować się **nad** źródłem kamery/ekranu w hierarchii warstw (panelu Źródła). Tło strony `output.html` jest **przezroczyste**, więc grafiki CG nałożą się na obraz z kamery.

Kolejność warstw (od góry):
```
🔲 CG Output          ← źródło przeglądarki (grafiki)
📷 Kamera / NDI / Ekran  ← obraz bazowy
```

---

## Krok 5 — Sprawdź działanie

1. W panelu BTB CG System włącz dowolną grafikę (np. belkę nazwiskową).
2. Grafika powinna pojawić się z animacją na podglądzie OBS.
3. Wyłącz grafikę — powinna zniknąć z animacją wyjścia.

> Jeśli grafika się nie pojawia, kliknij prawym przyciskiem na źródło → **Odśwież pamięć podręczną przeglądarki** lub sprawdź, czy adres URL jest poprawny.

---

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---|---|
| Czarny ekran zamiast grafik | Sprawdź, czy serwer CG jest uruchomiony i adres URL jest poprawny |
| Brak przezroczystości | Upewnij się, że OBS nie ma własnego tła na źródle przeglądarki — domyślnie powinno być przezroczyste |
| Opóźnienie grafik | Zmniejsz buforowanie: prawym przyciskiem na źródło → Właściwości → zmniejsz wartość *Custom CSS* lub zwiększ FPS |
| Grafiki nie znikają po wyłączeniu | Odśwież pamięć podręczną przeglądarki (prawy klik → Odśwież) |
| Połączenie z innego komputera nie działa | Sprawdź firewall — port `3000` musi być otwarty; użyj adresu IP serwera zamiast `localhost` |

---

## Konfiguracja dla wielu monitorów wyjściowych

Można otworzyć wiele źródeł przeglądarki wskazujących na ten sam `output.html` — każde otrzyma identyczny stan grafik przez Socket.io. Przydatne np. gdy chcesz mieć osobną scenę z CG w programie i w nagraniu.

---

## Custom CSS (opcjonalnie)

OBS pozwala wstrzyknąć własny CSS do źródła przeglądarki. Domyślny CSS OBS nadaje białe tło — jeśli widzisz problem z przezroczystością, wyczyść pole **Custom CSS** lub ustaw:

```css
body { background-color: rgba(0, 0, 0, 0); margin: 0; overflow: hidden; }
```
