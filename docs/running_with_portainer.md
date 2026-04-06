# Uruchamianie BTB CG System z Portainer

Instrukcja wdrożenia BTB CG System jako kontenera Docker za pomocą Portainer.

---

## Wymagania

- Portainer (CE lub Business) z dostępem do Docker Engine
- Docker z obsługą Compose v2

---

## Sposób 1: Stack z repozytorium Git

1. Zaloguj się do Portainer → **Stacks** → **Add stack**
2. Nazwa stacka: `btb-cg-system`
3. Wybierz **Repository**
4. Repository URL: `https://github.com/sdorpl/BTB-CG-System.git`
5. Compose path: `docker-compose.yml`
6. Opcjonalnie w **Environment variables** dodaj:
   - `PORT` — port wewnętrzny serwera (domyślnie `3000`)
7. Kliknij **Deploy the stack**

> Portainer sam zbuduje obraz Docker z `Dockerfile` i uruchomi kontener.

---

## Sposób 2: Stack z gotowego docker-compose

1. **Stacks** → **Add stack** → **Web editor**
2. Nazwa: `btb-cg-system`
3. Wklej poniższy compose:

```yaml
services:
  cg-system:
    build: .
    container_name: btb-cg-system
    ports:
      - "3000:3000"
    volumes:
      - cg-data:/data
    environment:
      - PORT=3000
    restart: unless-stopped

volumes:
  cg-data:
```

4. Kliknij **Deploy the stack**

---

## Sposób 3: Z gotowego obrazu (bez budowania)

Jeśli obraz został wcześniej zbudowany i wgrany do registry:

1. **Containers** → **Add container**
2. Image: `btb-cg-system:1.1.0`
3. **Port mapping:** Host `3000` → Container `3000`
4. **Volumes:** Utwórz named volume `cg-data` zamontowany na `/data`
5. **Restart policy:** `unless-stopped`
6. Kliknij **Deploy the container**

---

## Po wdrożeniu

| Co | URL |
|---|---|
| Panel sterowania | `http://<IP-serwera>:3000/` |
| Output dla OBS | `http://<IP-serwera>:3000/output.html` |

Przy pierwszym uruchomieniu:
- Baza danych SQLite zostanie automatycznie utworzona i zainicjalizowana
- Szablony z `templates/` zostaną zsynchronizowane do bazy
- Katalog uploads jest tworzony automatycznie

---

## Persystencja danych

Wszystkie dane (baza SQLite + uploadowane pliki) przechowywane są w wolumenie Docker zamontowanym na `/data`:

```
/data/
├── database.sqlite      # Baza danych
└── uploads/             # Wgrane pliki (obrazy, czcionki, media)
```

Wolumen `cg-data` przetrwa restart kontenera, aktualizację stacka i przebudowanie obrazu.

### Backup bazy danych

```bash
# Skopiuj bazę z wolumenu na host
docker cp btb-cg-system:/data/database.sqlite ./backup_database.sqlite

# Lub z poziomu Portainer: Volumes → cg-data → Browse
```

---

## Zmiana portu

Aby udostępnić aplikację na innym porcie (np. 8080):

```yaml
ports:
  - "8080:3000"
```

Port wewnętrzny (`3000`) nie wymaga zmian — jest kodem w obrazie.

---

## Aktualizacja

1. **Stacks** → `btb-cg-system` → **Editor**
2. Kliknij **Update the stack** z opcją **Re-pull image and redeploy**
3. Dane w wolumenie `cg-data` zostają zachowane

---

## Healthcheck

Obraz ma wbudowany healthcheck — Portainer pokaże status zdrowia kontenera:
- **healthy** — serwer odpowiada na HTTP
- **unhealthy** — serwer nie odpowiada (sprawdź logi)
