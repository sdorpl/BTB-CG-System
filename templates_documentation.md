# Dokumentacja: Tworzenie Własnych Szablonów Grafik (CG Control PRO)

Aplikacja **CG Control PRO** (silnik `VinciFlow`) wykorzystuje strukturę opartą o szablony HTML, CSS i JavaScript kompilowane w locie za pomocą biblioteki **Handlebars.js**. Szablony są następnie animowane i renderowane w środowisku przeglądarkowym (źródło Output). 

Poniższa dokumentacja opisuje, jak zdefiniować własny szablon w pliku bazy danych `db.json`.

---

## 1. Struktura Szablonu w `db.json`

Każdy szablon znajduje się w głównej tablicy `"templates"` w pliku konfiguracyjnym `db.json`. Schemat (obiekt JSON) każdego szablonu wygląda następująco:

```json
{
  "id": "moj-nowy-szablon",
  "name": "Nazwa Wyświetlana w Panelu",
  "type": "LOWER_THIRD", 
  "version": 1,
  "html_template": "KOD HTML...",
  "css_template": "KOD CSS...",
  "js_template": "KOD JS...",
  "defaultFields": {
    "title": "Domyślny Tytuł",
    "primaryColor": "#ff0000"
  },
  "defaultLayout": {
    "x": 100,
    "y": 800,
    "scale": 1,
    "layer": 1
  }
}
```

### Typy grafik (`type`)
Możesz przypisać szablonowi jeden z obsługiwanych typów, który decyduje o zakwalifikowaniu go w edytorze i banku grafik:
* `LOWER_THIRD` (np. belki informacyjne, podpisy)
* `TICKER` (paski przewijane horyzontalnie)
* `CLOCK` (widżety zegarowe)
* `IMAGE` (stałe logotypy lub grafiki statyczne)

---

## 2. Obsługiwane Zmienne (Handlebars)

Silnik Handlebars w locie ("wstrzykuje") wartości z ustawień Inspektora do kodu Twojego szablonu. Zmienne umieszcza się pomiędzy wąsami, np. `{{NAZWA_ZMIENNEJ}}`. Jeśli używasz kodu HTML (np. formatowanie tekstu w edytorze WYSIWYG), objmij zmienną potrójnymi wąsami: `{{{TITLE}}}`.

### Główne Zmienne Kontrolne
* `{{ID}}` – Unikalny identyfikator dom elementu danej grafiki wygenerowany przez system. ZAWSZE owijaj w niego odwołania w CSS, by unikać konfliktów (`#{{ID}} .moja-klasa`).
* `{{{TITLE}}}` – Główny tekst grafiki (z pełnym formatowaniem HTML).
* `{{SUBTITLE}}` – Tekst dodatkowy (podtytuł).
* `{{FONT_FAMILY}}` – Wybrana przez użytkownika czcionka.
* `{{TITLE_COLOR}}` / `{{SUBTITLE_COLOR}}` – Współrzędne kolorów tekstu.
* `{{TITLE_SIZE}}` / `{{SUBTITLE_SIZE}}` – Skala tekstu (w px).
* `{{TITLE_WEIGHT}}` – Waga czcionki (np. bold, normal).
* `{{TITLE_TRANSFORM}}` – Transformacja tekstu (np. uppercase).
* `{{PRIMARY_COLOR}}` / `{{SECONDARY_COLOR}}` – Kolory wybrane w sekcji WYGLĄD.
* `{{PRIMARY_BG}}` – Główne tło kontenera (może obsługiwać gradienty tworzone przez inspektor).

### Zmienne Animacji
Zmienne animacyjne są obliczane na podstawie ustawień wejścia/wyjścia (kierunek, miękkość) w Inspektorze:
* `{{ANIMATION_DURATION}}` / `{{ANIMATION_OUT_DURATION}}` – Czas trwania animacji w sekundach (np. `0.5`).
* `{{ANIMATION_DELAY}}` / `{{ANIMATION_OUT_DELAY}}` – Opóźnienie animacji w sekundach (np. `0`).
* `{{ANIMATION_EASE}}` / `{{ANIMATION_OUT_EASE}}` – Krzywa animacji (np. `ease-in-out`).
* `{{ANIMATION_IN_TRANSFORM}}` – Transformacja początkowa wejścia wygenerowana przez silnik kierunku (np. przesunięcie `translateX(-100px)`).
* `{{ANIMATION_IDENTITY}}` – Stan spoczynkowy animacji (zawsze `translate(0,0) scale(1)` itd.), używane w kodzie JavaScript aby "wprowadzić" zmienną na ekran.
* `{{ANIMATION_OUT_TRANSFORM}}` – Transformacja docelowa wyjścia obliczona przez silnik kierunku.

---

## 3. Kodowanie Szablonów – Praktyki i Wymogi

### A. Kod HTML (`html_template`)
Zbuduj szkielet swojej grafiki. Pamiętaj, aby opakować wszystko w główny kontener z unikalną klasą.
```html
<div class="moj-super-kontener">
    <div class="znak-wodny"></div>
    <div class="tekst-glowny">{{{TITLE}}}</div>
</div>
```

### B. Kod CSS (`css_template`)
Cały kod stylów **musi** być spięty klamrą identyfikatora: `#{{ID}}`. Inaczej, style Twojej grafiki "rozleją" się na inne instancje na ekranie. Zdefiniuj w CSS początkowy, niewidzialny stan grafiki do animacji (opacity: 0).
```css
#{{ID}} .moj-super-kontener {
    font-family: '{{FONT_FAMILY}}', sans-serif;
    background: {{PRIMARY_COLOR}};
    color: {{TITLE_COLOR}};
    padding: 20px;
    opacity: 0; /* STAN POCZĄTKOWY - UKRYTE PRZED WEJŚCIEM */
    transform: {{ANIMATION_IN_TRANSFORM}}; /* POZYCJA STARTOWA ANIMACJI */
    transition: all {{ANIMATION_DURATION}}s {{ANIMATION_EASE}};
}
```

### C. Kod JavaScript (`js_template`)
JavaScript każdej grafiki musi ujawniać w obiekcie głównym dwie fundamentalne metody: `__slt_show` oraz `__slt_hide`. To one są wywoływane "z zewnątrz" przez Output Renderer za każdym razem, gdy klikasz `ON AIR` oraz `OFF AIR`.

Całość skryptu zamknij w IIFE (Immediately Invoked Function Expression), by nie psuć globalnego kontekstu przeglądarki.

**Wymagany schemat JS:**
```javascript
(() => {
    // 1. ZŁAP GŁÓWNY ELEMENT GRAFIKI (WYMAGANE!)
    const root = document.getElementById("{{ID}}");
    
    // 2. ZŁAĆ KONTENER, KTÓRY BĘDZIESZ ANIMOWAĆ
    const container = root.querySelector(".moj-super-kontener");

    // METODA WYWOŁYWANA PRZY KLIKNIĘCIU "ON AIR"
    root.__slt_show = () => {
        // Oblicz opóźnienie dla silnika (wymagane w warstwowej architekturze CG)
        const delay = parseFloat("{{ANIMATION_DELAY}}") || 0;
        const mainWrapper = root.children[0];
        if(mainWrapper) mainWrapper.style.transitionDelay = delay + "s";
        
        // WYKONAJ ANIMACJĘ DO STANU FINALNEGO
        if(container) {
            void container.offsetWidth; // Wymuś reflow przeglądarki
            container.style.opacity = "1";
            container.style.transform = "{{ANIMATION_IDENTITY}}";
        }
    };

    // METODA WYWOŁYWANA PRZY KLIKNIĘCIU "OFF AIR" (ORAZ "WYCZYŚĆ")
    root.__slt_hide = () => {
        const delay = parseFloat("{{ANIMATION_OUT_DELAY}}") || 0;
        const mainWrapper = root.children[0];
        if(mainWrapper) mainWrapper.style.transitionDelay = delay + "s";
        
        // NADPISZ TRANZYCJĘ WYŚCIA I WYKONAJ ANIMACJĘ UKRYWANIA
        if (typeof container !== "undefined" && container) {
            container.style.transition = "all {{ANIMATION_OUT_DURATION}}s {{ANIMATION_OUT_EASE}} " + delay + "s";
            container.style.opacity = "0";
            container.style.transform = "{{ANIMATION_OUT_TRANSFORM}}";
        }
    };
})();
```

---

## 4. Tickery – Paski Przewijane

Tickery (`type: "TICKER"`) mają specyficzną strukturę listową danych. Iterujemy po wiadomościach za pomocą pętli zgodnej ze standardem Handlebars (`{{#each ITEMS}}`).

**Kod HTML dla Tickera:**
```html
<div class="moj-ticker-box">
    <div class="ticker-belt">
        {{#each ITEMS}}
           <div class="ticker-wiadomosc">{{this}}</div>
           <div class="ticker-separator">***</div>
        {{/each}}
    </div>
</div>
```

**JavaScript dla Tickera** wymaga zainicjowania pętli, w CSS definiujemy tzw. `@keyframes` scroll, a w JavaScripcie nadpisujemy właściwość `.style.animation` kalkulując prędkość. Przykład znajduje się w kodzie źródłowym bazy dla paska "Modern Ticker". 

---

## 5. Zegary (Sposób na Interval)

Szablony typu `CLOCK` często muszą odliczać na żywo aktualną godzinę. Należy przypisać do instrukcji funkcję `setInterval` na procesie `__slt_show`, oraz bezwzględnie przerwać go klauzulą `clearInterval(timer)` na etapie `__slt_hide` (zapobiegnie to niszczeniu przeglądarki setkami śmieciowych ticków i utracie pamięci). Instrukcje jak to zrobić zaimplementowane są na przykład w logice elementu "Republika Clock" w bazie.

---

## 6. Porady 
* **Z-Index:** Opcje "Warstwa" na podglądzie są przydzielane głównej ramce nakładanej z zewnątrz przez renderer – nie musisz się o nie martwić w CSS szablonów (chyba, że pozycjonujesz tło / obiekty wewnątrz własnego pudełka po przez `position: absolute`).
* **Testowanie:** Najłatwiej modyfikować szablony otwierając edytor kodu z uruchomionym serwerem, a następnie przeładowując przeglądarkę z Control Panelem przyciskiem "Reload DB", aby wgrał on Twój nowy kod z dysku.
