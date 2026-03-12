# Architektura Systemu BTB-CG

System BTB-CG został zaprojektowany z myślą o wydajności i synchronizacji w czasie rzeczywistym w środowisku emisyjnym.

## Główne Komponenty

### 1. Backend (Serwer)
*   **Technologia:** Node.js z frameworkiem Express.
*   **Baza Danych:** SQLite (plik `database.sqlite`). System automatycznie inicjalizuje schemat przy pierwszym uruchomieniu i potrafi zmigrować dane z pliku `db.json`.
*   **Zasada Działania:** `db.json` służy jako **wzorzec startowy**. Po uruchomieniu, wszystkie zmiany są zapisywane wyłącznie w `database.sqlite`.
*   **Komunikacja:** Socket.io — każda zmiana stanu (np. włączenie grafiki) jest natychmiastowo rozsyłana do wszystkich podłączonych monitorów wyjściowych.

### 2. Frontend (Panel Sterowania)
*   **Technologia:** Vanilla JavaScript (bez ciężkich frameworków), co zapewnia niskie opóźnienia.
*   **Interfejs:** Responsywny panel sterowania podzielony na Dashboard, Edytor Szablonów oraz Ustawienia.
*   **Stan (State):** Scentralizowany obiekt stanu synchronizowany z serwerem.

### 3. Silnik Renderujący (Renderer)
*   **Handlebars.js:** Wykorzystywany do wstrzykiwania danych z bazy do szablonów HTML/CSS.
*   **GSAP (GreenSock):** Standard przemysłowy dla płynnych i precyzyjnych animacji graficznych.
*   **Izolacja:** Każda instancja grafiki jest izolowana (scoping CSS), co zapobiega konfliktom stylów między różnymi szablonami na jednym ekranie.

## Przepływ Danych

1.  Użytkownik klika przycisk emisyjny w **Aplikacji**.
2.  Aplikacja wysyła zdarzenie `updateState` do **Serwera**.
3.  Serwer zapisuje zmianę w **SQLite** i emituje `stateUpdated` do wszystkich klientów.
4.  **Monitor Wyjściowy** (Renderer) odbiera nowy stan i uruchamia animację grafiki.

## Zarządzanie Bazą Danych

Aplikacja rozróżnia dwa stany bazy danych:

1.  **Stan Statyczny (db.json):** Widoczny w repozytorium, łatwo edytowalny tekstowo. Służy do przenoszenia szablonów i konfiguracji między instalacjami.
2.  **Stan Dynamiczny (database.sqlite):** Binarna baza danych używana podczas pracy aplikacji.

### Synchronizacja
Jeśli baza `database.sqlite` nie istnieje, serwer automatycznie zaimportuje dane z `db.json`.

Aby zapisać aktualny stan z SQLite z powrotem do pliku JSON (np. w celu zachowania zmian w Git), należy użyć skryptu:
```bash
node export-db.js
```
