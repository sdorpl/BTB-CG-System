# Poradnik Tworzenia Szablonów

Tworzenie szablonów w BTB-CG jest elastyczne dzięki wykorzystaniu standardowych technologii webowych wzbogaconych o system tagów Handlebars.

## Komponenty Szablonu

### 1. HTML (Struktura)
Używaj zmiennych systemowych wewnątrz podwójnych lub potrójnych nawiasów klamrowych.
```html
<div class="banner">
    <div class="title">{{{TITLE}}}</div>
    <div class="subtitle">{{SUBTITLE}}</div>
</div>
```
*   `{{VARIABLE}}` — Escaped text (bezpieczny).
*   `{{{VARIABLE}}}` — Raw HTML (wymagany dla edytora WYSIWYG).

### 2. CSS (Stylizacja)
System automatycznie izoluje style każdego szablonu za pomocą zmiennej `{{ID}}`.
```css
#{{ID}} .banner {
    background: {{PRIMARY_BG}};
    border-radius: {{BORDER_RADIUS}}px;
    box-shadow: {{BOX_SHADOW}};
    transform: {{ANIMATION_IN_TRANSFORM}};
    opacity: 0;
}
```

### 3. JavaScript (Logika i Animacja)
Każdy szablon musi zarejestrować dwie funkcje na obiekcie `root`:

```javascript
(() => {
    const root = document.getElementById("{{ID}}");
    const el = root.querySelector('.banner');

    // Wywoływane przy wejściu na antenę
    root.__slt_show = () => {
        el.style.transition = "all {{ANIMATION_DURATION}}s {{ANIMATION_EASE}}";
        el.style.opacity = "1";
        el.style.transform = "{{ANIMATION_IDENTITY}}";
    };

    // Wywoływane przy ściąganiu z anteny
    root.__slt_hide = () => {
        el.style.transition = "all {{ANIMATION_OUT_DURATION}}s {{ANIMATION_OUT_EASE}}";
        el.style.opacity = "0";
        el.style.transform = "{{ANIMATION_OUT_TRANSFORM}}";
    };
})();
```

## Lista Głównych Zmiennych (Context)

| Zmienna | Opis |
| :--- | :--- |
| `{{ID}}` | Unikalny identyfikator danej instancji grafiki |
| `{{TITLE}}` | Główny tekst grafiki |
| `{{PRIMARY_BG}}` | Obliczony kolor lub gradient tła |
| `{{TITLE_SIZE}}` | Wielkość czcionki tytułu |
| `{{ANIMATION_DURATION}}` | Czas trwania animacji wejścia |
| `{{ANIMATION_IN_TRANSFORM}}` | Wstępnie obliczona macierz transformacji wejścia |
| `{{ANIMATION_OUT_TRANSFORM}}` | Wstępnie obliczona macierz transformacji wyjścia |
| `{{ANIMATION_IDENTITY}}` | Stan docelowy (transform: none) |
| `{{SIDE_IMAGE}}` | URL dodatkowej grafiki bocznej |
