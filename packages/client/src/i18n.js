// ======================================================
// src/i18n.js — Internationalization module (PL / EN / DE)
// ======================================================
// Technical broadcast terms are NOT translated:
// take, cut, cue, pgm, pvw, on-air, ticker, shotbox, preset, LIVE, OFF, PREV, POPOUT

const translations = {
    // ── Header & Navigation ──
    'nav.showMenu':          { pl: 'Pokaż menu', en: 'Show menu', de: 'Menü anzeigen' },
    'nav.dashboard':         { pl: 'Panel Główny', en: 'Dashboard', de: 'Dashboard' },
    'nav.templates':         { pl: 'Edytor Szablonów', en: 'Template Editor', de: 'Vorlagen-Editor' },
    'nav.settings':          { pl: 'Ustawienia', en: 'Settings', de: 'Einstellungen' },
    'nav.output':            { pl: 'Wyjście (Output)', en: 'Output', de: 'Ausgabe (Output)' },
    'nav.expandMenu':        { pl: 'Rozwiń menu', en: 'Expand menu', de: 'Menü aufklappen' },
    'nav.hideHeader':        { pl: 'Ukryj nagłówek', en: 'Hide header', de: 'Kopfzeile ausblenden' },
    'nav.clearProgram':      { pl: 'Wyczyść Program', en: 'Clear Program', de: 'Programm leeren' },

    // ── Standalone panels ──
    'panel.preview':         { pl: 'Podgląd (osobne okno)', en: 'Preview (separate window)', de: 'Vorschau (separates Fenster)' },
    'panel.bank':            { pl: 'Bank Grafik', en: 'Graphics Bank', de: 'Grafikbank' },
    'panel.inspector':       { pl: 'Inspektor', en: 'Inspector', de: 'Inspektor' },

    // ── Background controls ──
    'bg.pickColor':          { pl: 'Wybierz kolor tła', en: 'Pick background color', de: 'Hintergrundfarbe wählen' },
    'bg.setColor':           { pl: 'Ustaw kolor tła', en: 'Set background color', de: 'Hintergrundfarbe setzen' },
    'bg.transparent':        { pl: 'Tło OBS (przezroczyste)', en: 'OBS background (transparent)', de: 'OBS-Hintergrund (transparent)' },

    // ── Presets ──
    'preset.select':         { pl: 'Wybierz preset grafik', en: 'Select graphics preset', de: 'Grafik-Preset wählen' },
    'preset.none':           { pl: '— brak —', en: '— none —', de: '— leer —' },
    'preset.load':           { pl: 'Załaduj preset', en: 'Load preset', de: 'Preset laden' },
    'preset.save':           { pl: 'Zapisz preset', en: 'Save preset', de: 'Preset speichern' },
    'preset.delete':         { pl: 'Usuń preset', en: 'Delete preset', de: 'Preset löschen' },
    'preset.export':         { pl: 'Eksportuj preset', en: 'Export preset', de: 'Preset exportieren' },
    'preset.import':         { pl: 'Importuj preset', en: 'Import preset', de: 'Preset importieren' },
    'preset.saveName':       { pl: 'Nazwa dla presetu:', en: 'Preset name:', de: 'Preset-Name:' },
    'preset.confirmDelete':  { pl: 'Czy na pewno chcesz usunąć ten preset?', en: 'Are you sure you want to delete this preset?', de: 'Möchten Sie dieses Preset wirklich löschen?' },
    'preset.confirmLoad':    { pl: 'Załadowanie presetu zastąpi aktualny bank grafik. Kontynuować?', en: 'Loading a preset will replace the current graphics bank. Continue?', de: 'Das Laden eines Presets ersetzt die aktuelle Grafikbank. Fortfahren?' },

    // ── Utilities ──
    'util.shortcuts':        { pl: 'Skróty klawiszowe (?)', en: 'Keyboard shortcuts (?)', de: 'Tastaturkürzel (?)' },
    'util.resetDb':          { pl: 'Resetuj bazę danych', en: 'Reset database', de: 'Datenbank zurücksetzen' },
    'util.resetDbAriaLabel': { pl: 'Resetuj bazę danych', en: 'Reset database', de: 'Datenbank zurücksetzen' },

    // ── Preview monitor ──
    'preview.title':         { pl: 'PREVIEW (PODGLĄD)', en: 'PREVIEW', de: 'VORSCHAU (PREVIEW)' },
    'preview.safeArea':      { pl: 'BEZPIECZNY OBSZAR', en: 'SAFE AREA', de: 'SICHERER BEREICH' },
    'preview.safeAreaAriaLabel': { pl: 'Przełącz bezpieczny obszar EBU', en: 'Toggle EBU safe area', de: 'EBU-Sicherheitsbereich umschalten' },
    'preview.openWindow':    { pl: 'Otwórz Podgląd w osobnym oknie', en: 'Open Preview in separate window', de: 'Vorschau in separatem Fenster öffnen' },
    'preview.collapse':      { pl: 'Zwiń / Rozwiń', en: 'Collapse / Expand', de: 'Ein-/Ausklappen' },
    'preview.nextElement':   { pl: 'Następny Element', en: 'Next Element', de: 'Nächstes Element' },
    'preview.edit':          { pl: 'Edytuj', en: 'Edit', de: 'Bearbeiten' },
    'preview.sync':          { pl: 'Synchr.', en: 'Sync', de: 'Sync' },
    'preview.goLive':        { pl: 'Na Żywo', en: 'Go Live', de: 'Live schalten' },

    // ── Program monitor ──
    'program.title':         { pl: 'PROGRAM (WIZJA)', en: 'PROGRAM', de: 'PROGRAMM' },
    'program.onAir':         { pl: 'NA ŻYWO', en: 'ON AIR', de: 'AUF SENDUNG' },
    'program.layers':        { pl: 'Warstw', en: 'Layers', de: 'Ebenen' },
    'program.openWindow':    { pl: 'Otwórz Program (Output) w osobnym oknie', en: 'Open Program (Output) in separate window', de: 'Programm (Output) in separatem Fenster öffnen'},
    'program.clearAll':      { pl: 'Wyczyść Wszystko', en: 'Clear All', de: 'Alles löschen' },
    'program.onAirLayers':   { pl: 'Na Żywo: {0} Warstw', en: 'On Air: {0} Layers', de: 'Auf Sendung: {0} Ebenen' },

    // ── Shotbox / Graphics Bank ──
    'bank.graphicFallback':  { pl: 'Grafika', en: 'Graphic', de: 'Grafik' },
    'bank.groupFallback':    { pl: 'Grupa', en: 'Group', de: 'Gruppe' },
    'bank.groupTooltip':     { pl: 'Grupa', en: 'Group', de: 'Gruppe' },
    'bank.title':            { pl: 'Bank Grafik', en: 'Graphics Bank', de: 'Grafikbank' },
    'bank.clear':            { pl: 'Wyczyść', en: 'Clear', de: 'Leeren' },
    'bank.newGraphic':       { pl: 'Nowa Grafika', en: 'New Graphic', de: 'Neue Grafik' },
    'bank.copy':             { pl: 'Kopiuj', en: 'Copy', de: 'Kopieren' },
    'bank.delete':           { pl: 'Usuń', en: 'Delete', de: 'Löschen' },
    'bank.copyName':         { pl: '(kopia)', en: '(copy)', de: '(Kopie)' },
    'bank.confirmDelete':    { pl: 'Czy na pewno chcesz usunąć grafikę "{0}"?', en: 'Are you sure you want to delete graphic "{0}"?', de: 'Möchten Sie die Grafik „{0}" wirklich löschen?' },
    'bank.assignHotkey':     { pl: 'Przypisz skrót klawiszowy', en: 'Assign hotkey', de: 'Tastenkürzel zuweisen' },
    'bank.changeHotkey':     { pl: 'Zmień skrót: {0}', en: 'Change hotkey: {0}', de: 'Kürzel ändern: {0}' },
    'bank.graphicSettings':  { pl: 'Ustawienia grafiki', en: 'Graphic settings', de: 'Grafikeinstellungen' },
    'bank.quickEdit':        { pl: 'Szybka Edycja', en: 'Quick Edit', de: 'Schnellbearbeitung' },
    'bank.editContent':      { pl: 'Edytuj Treść', en: 'Edit Content', de: 'Inhalt bearbeiten' },
    'bank.noGroup':          { pl: '— NO GROUP —', en: '— NO GROUP —', de: '— KEINE GRUPPE —' },
    'bank.newGroup':         { pl: '＋ NEW GROUP…', en: '＋ NEW GROUP…', de: '＋ NEUE GRUPPE…' },
    'bank.syncToAir':        { pl: 'SYNC NA ANTENĘ', en: 'SYNC TO AIR', de: 'SYNC AUF SENDUNG' },
    'bank.discard':          { pl: 'ODRZUĆ', en: 'DISCARD', de: 'VERWERFEN' },
    'bank.allOff':           { pl: 'WSZYSTKIE OFF', en: 'ALL OFF', de: 'ALLE AUS' },
    'bank.allOn':            { pl: 'WSZYSTKIE ON', en: 'ALL ON', de: 'ALLE AN' },
    'bank.elements':         { pl: 'EL.', en: 'ITEMS', de: 'EL.' },
    'bank.newGroupPrompt':   { pl: 'Nazwa nowej grupy:', en: 'New group name:', de: 'Name der neuen Gruppe:' },
    'bank.defaultGroupName': { pl: 'Grupa {0}', en: 'Group {0}', de: 'Gruppe {0}' },
    'bank.confirmClearAll':  { pl: 'Czy na pewno chcesz usunąć WSZYSTKIE grafiki z Banku?', en: 'Are you sure you want to delete ALL graphics from the Bank?', de: 'Möchten Sie wirklich ALLE Grafiken aus der Bank löschen?' },

    // ── Inspector ──
    'inspector.title':       { pl: 'Inspektor', en: 'Inspector', de: 'Inspektor' },
    'inspector.selectGraphic': { pl: 'Wybierz grafikę z Shotboxa', en: 'Select a graphic from the Shotbox', de: 'Wählen Sie eine Grafik aus der Shotbox' },
    'inspector.close':       { pl: 'Zamknij inspektor', en: 'Close inspector', de: 'Inspektor schließen' },
    'inspector.tabMain':     { pl: 'WYGLĄD I TREŚĆ', en: 'STYLE & CONTENT', de: 'STIL & INHALT' },
    'inspector.tabAnim':     { pl: 'ANIMACJA', en: 'ANIMATION', de: 'ANIMATION' },
    'inspector.saveChanges': { pl: 'ZAPISZ ZMIANY', en: 'SAVE CHANGES', de: 'ÄNDERUNGEN SPEICHERN' },
    'inspector.saveTemplate': { pl: 'ZAPISZ JAKO\nSZABLON', en: 'SAVE AS\nTEMPLATE', de: 'ALS VORLAGE\nSPEICHERN' },
    'inspector.editCode':    { pl: 'EDYTUJ\nKOD', en: 'EDIT\nCODE', de: 'CODE\nBEARBEITEN' },
    'inspector.exportJson':  { pl: 'EKSPORTUJ\nKOD (JSON)', en: 'EXPORT\nCODE (JSON)', de: 'EXPORTIEREN\nCODE (JSON)' },
    'inspector.deleteGraphic': { pl: 'USUŃ GRAFIKĘ', en: 'DELETE GRAPHIC', de: 'GRAFIK LÖSCHEN' },
    'inspector.typeBar':     { pl: 'BELKA', en: 'LOWER THIRD', de: 'BAUCHBINDE' },
    'inspector.typeTicker':  { pl: 'TICKER', en: 'TICKER', de: 'TICKER' },
    'inspector.typeClock':   { pl: 'ZEGAR', en: 'CLOCK', de: 'UHR' },
    'inspector.typeImage':   { pl: 'GRAFIKA', en: 'IMAGE', de: 'GRAFIK' },

    // ── Inspector sections ──
    'ins.content':           { pl: 'ZAWARTOŚĆ', en: 'CONTENT', de: 'INHALT' },
    'ins.appearance':        { pl: 'WYGLĄD', en: 'APPEARANCE', de: 'AUSSEHEN' },
    'ins.position':          { pl: 'POZYCJA I WYMIARY', en: 'POSITION & SIZE', de: 'POSITION & GRÖSSE' },
    'ins.animation':         { pl: 'ANIMACJA', en: 'ANIMATION', de: 'ANIMATION' },
    'ins.advanced':          { pl: 'ZAAWANSOWANE', en: 'ADVANCED', de: 'ERWEITERT' },
    'ins.attachment':        { pl: 'DOŁĄCZENIE', en: 'ATTACHMENT', de: 'ANHANG' },
    'ins.name':              { pl: 'Nazwa', en: 'Name', de: 'Name' },
    'ins.title':             { pl: 'Tytuł', en: 'Title', de: 'Titel' },
    'ins.subtitle':          { pl: 'Podtytuł', en: 'Subtitle', de: 'Untertitel' },
    'ins.visible':           { pl: 'Widoczność', en: 'Visible', de: 'Sichtbar' },
    'ins.layer':             { pl: 'Warstwa (Z-Index)', en: 'Layer (Z-Index)', de: 'Ebene (Z-Index)' },
    'ins.font':              { pl: 'Czcionka', en: 'Font', de: 'Schriftart' },
    'ins.fontSize':          { pl: 'Rozmiar', en: 'Size', de: 'Größe' },
    'ins.fontWeight':        { pl: 'Grubość', en: 'Weight', de: 'Stärke' },
    'ins.color':             { pl: 'Kolor', en: 'Color', de: 'Farbe' },
    'ins.bgColor':           { pl: 'Kolor tła', en: 'Background color', de: 'Hintergrundfarbe' },
    'ins.width':             { pl: 'Szerokość', en: 'Width', de: 'Breite' },
    'ins.height':            { pl: 'Wysokość', en: 'Height', de: 'Höhe' },
    'ins.posX':              { pl: 'Pozycja X', en: 'Position X', de: 'Position X' },
    'ins.posY':              { pl: 'Pozycja Y', en: 'Position Y', de: 'Position Y' },
    'ins.scale':             { pl: 'Skala', en: 'Scale', de: 'Skalierung' },
    'ins.rotation':          { pl: 'Rotacja', en: 'Rotation', de: 'Rotation' },
    'ins.side':              { pl: 'Strona', en: 'Side', de: 'Seite' },
    'ins.custom':            { pl: 'Niestandardowe', en: 'Custom', de: 'Benutzerdefiniert' },
    'ins.animIn':            { pl: 'Animacja wejścia', en: 'Entry animation', de: 'Eingangsanimation' },
    'ins.animOut':           { pl: 'Animacja wyjścia', en: 'Exit animation', de: 'Ausgangsanimation' },
    'ins.duration':          { pl: 'Czas trwania (ms)', en: 'Duration (ms)', de: 'Dauer (ms)' },
    'ins.delay':             { pl: 'Opóźnienie (ms)', en: 'Delay (ms)', de: 'Verzögerung (ms)' },
    'ins.easing':            { pl: 'Krzywa animacji', en: 'Easing', de: 'Easing' },
    'ins.noFields':          { pl: 'Brak grafik w Banku Grafik', en: 'No graphics in Graphics Bank', de: 'Keine Grafiken in der Grafikbank' },

    // ── Inspector detailed labels ──
    'ins.templateFields':    { pl: 'POLA SZABLONU', en: 'TEMPLATE FIELDS', de: 'VORLAGENFELDER' },
    'ins.tickerSettings':    { pl: 'TICKER USTAWIENIA', en: 'TICKER SETTINGS', de: 'TICKER-EINSTELLUNGEN' },
    'ins.imageUrl':          { pl: 'URL obrazka', en: 'Image URL', de: 'Bild-URL' },
    'ins.uploadFile':        { pl: 'Wgraj z pliku', en: 'Upload from file', de: 'Aus Datei hochladen' },
    'ins.labelText':         { pl: 'Tekst etykiety (Etykieta boczna)', en: 'Label text (Side label)', de: 'Beschriftungstext (Seitenlabel)' },
    'ins.clickToEdit':       { pl: 'Kliknij aby edytować…', en: 'Click to edit…', de: 'Klicken zum Bearbeiten…' },
    'ins.subtitlePlaceholder': { pl: 'Podtytuł, stanowisko...', en: 'Subtitle, position...', de: 'Untertitel, Position...' },
    'ins.imageUrlPlaceholder': { pl: 'https://... lub puste = brak', en: 'https://... or empty = none', de: 'https://... oder leer = keines' },
    'ins.editWysiwyg':       { pl: 'Edytuj w edytorze WYSIWYG', en: 'Edit in WYSIWYG editor', de: 'Im WYSIWYG-Editor bearbeiten' },
    'ins.editText':          { pl: 'Edytuj tekst', en: 'Edit text', de: 'Text bearbeiten' },
    'ins.openQuickEdit':     { pl: 'OTWÓRZ SZYBKĄ EDYCJĘ WIADOMOŚCI', en: 'OPEN QUICK MESSAGE EDIT', de: 'SCHNELLBEARBEITUNG ÖFFNEN' },
    'ins.previewAnim':       { pl: '▶ Podgląd animacji wejścia', en: '▶ Preview entry animation', de: '▶ Eingangsanimation Vorschau' },
    'ins.add':               { pl: 'DODAJ', en: 'ADD', de: 'HINZUFÜGEN' },
    'ins.addItemPlaceholder': { pl: 'Dodaj element...', en: 'Add item...', de: 'Element hinzufügen...' },
    'ins.sideImage':         { pl: 'Grafika boczna', en: 'Side image', de: 'Seitenbild' },
    'ins.wiperSection':      { pl: 'Wiper (Pasek Pilny)', en: 'Wiper (Urgent Bar)', de: 'Wiper (Eilbalken)' },
    'ins.bgAndBars':         { pl: 'Tło i Belki', en: 'Background & Bars', de: 'Hintergrund & Balken' },
    'ins.typography':        { pl: 'Typografia', en: 'Typography', de: 'Typografie' },
    'ins.bgType':            { pl: 'Typ Tła', en: 'Background Type', de: 'Hintergrundtyp' },
    'ins.bgSolid':           { pl: 'Jednolite (Solid)', en: 'Solid', de: 'Einfarbig (Solid)' },
    'ins.bgGradient':        { pl: 'Gradientowe', en: 'Gradient', de: 'Farbverlauf' },
    'ins.bgTransparent':     { pl: 'Transparentne (Brak tła)', en: 'Transparent (No background)', de: 'Transparent (Kein Hintergrund)' },
    'ins.bgColor2':          { pl: 'Kolor Tła 2', en: 'Background Color 2', de: 'Hintergrundfarbe 2' },
    'ins.gradientAngle':     { pl: 'Kąt Gradientu', en: 'Gradient Angle', de: 'Verlaufswinkel' },
    'ins.borderRadius':      { pl: 'Zaokrąglenie', en: 'Border Radius', de: 'Rahmenradius' },
    'ins.borderWidth':       { pl: 'Obramowanie (px)', en: 'Border (px)', de: 'Rahmen (px)' },
    'ins.accentColor':       { pl: 'Kolor Akcentu / Tła Podtytułu (Kolor 2)', en: 'Accent / Subtitle BG Color (Color 2)', de: 'Akzent-/Untertitel-HG-Farbe (Farbe 2)' },
    'ins.opacity':           { pl: 'Ogólna Przezroczystość', en: 'Overall Opacity', de: 'Gesamtdeckkraft' },
    'ins.autoSquash':        { pl: 'Automatyczne ściskanie tekstu', en: 'Automatic text squash', de: 'Automatische Textstauchung' },
    'ins.titleColor':        { pl: 'Kolor Tytułu', en: 'Title Color', de: 'Titelfarbe' },
    'ins.subtitleColor':     { pl: 'Kolor Podtytułu', en: 'Subtitle Color', de: 'Untertitelfarbe' },
    'ins.contentFont':       { pl: 'Krój Czcionki Treści (Wiadomości)', en: 'Content Font (Messages)', de: 'Inhaltsschriftart (Nachrichten)' },
    'ins.offsetY':           { pl: 'Przesunięcie Y (px)', en: 'Offset Y (px)', de: 'Versatz Y (px)' },
    'ins.sidePosition':      { pl: 'Pozycja oparta na stronach', en: 'Side-based position', de: 'Seitenbasierte Position' },
    'ins.customXY':          { pl: 'Niestandardowa (XY)', en: 'Custom (XY)', de: 'Benutzerdefiniert (XY)' },
    'ins.topLeft':           { pl: 'Góra - Lewo', en: 'Top - Left', de: 'Oben - Links' },
    'ins.topCenter':         { pl: 'Góra - Środek', en: 'Top - Center', de: 'Oben - Mitte' },
    'ins.topRight':          { pl: 'Góra - Prawo', en: 'Top - Right', de: 'Oben - Rechts' },
    'ins.centerLeft':        { pl: 'Środek - Lewo', en: 'Center - Left', de: 'Mitte - Links' },
    'ins.center':            { pl: 'Środek (Centrum)', en: 'Center', de: 'Mitte (Zentrum)' },
    'ins.centerRight':       { pl: 'Środek - Prawo', en: 'Center - Right', de: 'Mitte - Rechts' },
    'ins.bottomLeft':        { pl: 'Dół - Lewo', en: 'Bottom - Left', de: 'Unten - Links' },
    'ins.bottomCenter':      { pl: 'Dół - Środek', en: 'Bottom - Center', de: 'Unten - Mitte' },
    'ins.bottomRight':       { pl: 'Dół - Prawo', en: 'Bottom - Right', de: 'Unten - Rechts' },
    'ins.marginX':           { pl: 'Margines X (px)', en: 'Margin X (px)', de: 'Rand X (px)' },
    'ins.marginY':           { pl: 'Margines Y (px)', en: 'Margin Y (px)', de: 'Rand Y (px)' },
    'ins.docking':           { pl: 'Powiązania (Dokowanie)', en: 'Docking (Attachment)', de: 'Andocken (Bindung)' },
    'ins.attachY':           { pl: 'Przyklej po osi Y (Góra/Dół zależy od celu)', en: 'Attach Y-axis (Top/Bottom depends on target)', de: 'Y-Achse anheften (Oben/Unten hängt vom Ziel ab)' },
    'ins.ctrlMultiSelect':   { pl: 'Przytrzymaj Ctrl, aby wybrać wiele elementów', en: 'Hold Ctrl to select multiple items', de: 'Strg halten für Mehrfachauswahl' },
    'ins.noAttachY':         { pl: 'Brak (Niezależna pozycja Y)', en: 'None (Independent Y position)', de: 'Keine (Unabhängige Y-Position)' },
    'ins.noAttachX':         { pl: 'Brak (Niezależna pozycja X)', en: 'None (Independent X position)', de: 'Keine (Unabhängige X-Position)' },
    'ins.groupPrefix':       { pl: 'GRUPA', en: 'GROUP', de: 'GRUPPE' },
    'ins.untitled':          { pl: 'Bez tytułu', en: 'Untitled', de: 'Ohne Titel' },
    'ins.dockEdgeY':         { pl: 'Krawędź dokowania (Y)', en: 'Docking edge (Y)', de: 'Andockkante (Y)' },
    'ins.autoSmart':         { pl: 'Auto (Inteligentna)', en: 'Auto (Smart)', de: 'Auto (Intelligent)' },
    'ins.targetTop':         { pl: 'Góra Celu', en: 'Target Top', de: 'Ziel Oben' },
    'ins.targetBottom':      { pl: 'Dół Celu', en: 'Target Bottom', de: 'Ziel Unten' },
    'ins.manual':            { pl: 'Manual (Relatywny)', en: 'Manual (Relative)', de: 'Manuell (Relativ)' },
    'ins.gapY':              { pl: 'Odstęp Y (px)', en: 'Gap Y (px)', de: 'Abstand Y (px)' },
    'ins.attachX':           { pl: 'Przyklej po osi X (Lewo/Prawo zależy od celu)', en: 'Attach X-axis (Left/Right depends on target)', de: 'X-Achse anheften (Links/Rechts hängt vom Ziel ab)' },
    'ins.dockEdgeX':         { pl: 'Krawędź dokowania (X)', en: 'Docking edge (X)', de: 'Andockkante (X)' },
    'ins.targetLeft':        { pl: 'Lewo Celu', en: 'Target Left', de: 'Ziel Links' },
    'ins.targetRight':       { pl: 'Prawo Celu', en: 'Target Right', de: 'Ziel Rechts' },
    'ins.gapX':              { pl: 'Odstęp X (px)', en: 'Gap X (px)', de: 'Abstand X (px)' },
    'ins.dockingHelp':       { pl: 'System automatycznie wykrywa wymiary celu. Wpisz odstęp w px (np. 10), aby odsunąć element od krawędzi celu. Wartości ujemne zbliżą elementy. Element powróci na swoją pozycję, gdy cele znikną.', en: 'System automatically detects target dimensions. Enter gap in px (e.g. 10) to offset element from target edge. Negative values bring items closer. Element returns to its position when targets disappear.', de: 'System erkennt automatisch Zielabmessungen. Geben Sie den Abstand in px ein (z.B. 10), um das Element vom Zielrand zu verschieben. Negative Werte bringen Elemente näher. Element kehrt zur Position zurück, wenn Ziele verschwinden.' },
    'ins.type':              { pl: 'Typ', en: 'Type', de: 'Typ' },
    'ins.timeS':             { pl: 'Czas (s)', en: 'Time (s)', de: 'Zeit (s)' },
    'ins.delayS':            { pl: 'Opóźnienie (s)', en: 'Delay (s)', de: 'Verzögerung (s)' },
    'ins.easingCurve':       { pl: 'Krzywa (Easing)', en: 'Easing', de: 'Easing-Kurve' },
    'ins.animInLabel':       { pl: 'Wejście (IN)', en: 'Entry (IN)', de: 'Eingang (IN)' },
    'ins.animOutLabel':      { pl: 'Wyjście (OUT)', en: 'Exit (OUT)', de: 'Ausgang (OUT)' },
    'ins.textAnimIn':        { pl: 'Tekst Wejście (TEXT IN)', en: 'Text Entry (TEXT IN)', de: 'Text Eingang (TEXT IN)' },
    'ins.textAnimOut':       { pl: 'Tekst Wyjście (TEXT OUT)', en: 'Text Exit (TEXT OUT)', de: 'Text Ausgang (TEXT OUT)' },
    'ins.gleamEffect':       { pl: 'Efekt Błysku (Gleam)', en: 'Gleam Effect', de: 'Glanz-Effekt (Gleam)' },
    'ins.stagger':           { pl: 'Stagger (Opóźnienie między elementami)', en: 'Stagger (Delay between items)', de: 'Stagger (Verzögerung zwischen Elementen)' },
    'ins.enable':            { pl: 'Włącz', en: 'Enable', de: 'Aktivieren' },
    'ins.tickerMode':        { pl: 'Tryb Tickera', en: 'Ticker Mode', de: 'Ticker-Modus' },
    'ins.tickerWhip':        { pl: 'Whip (Z wycieraczką)', en: 'Whip', de: 'Whip (Mit Wischer)' },
    'ins.tickerHorizontal':  { pl: 'Poziomy (Przewijany)', en: 'Horizontal (Scrolling)', de: 'Horizontal (Scrollend)' },
    'ins.tickerVertical':    { pl: 'Pionowy', en: 'Vertical', de: 'Vertikal' },
    'ins.timePerMessage':    { pl: 'Czas wyświetlania jednej wiadomości (s)', en: 'Display time per message (s)', de: 'Anzeigezeit pro Nachricht (s)' },
    'ins.tickerSpeed':       { pl: 'Prędkość paska (px/s)', en: 'Bar speed (px/s)', de: 'Balkengeschwindigkeit (px/s)' },
    'ins.separatorStyle':    { pl: 'Styl separatora', en: 'Separator style', de: 'Trennzeichenstil' },
    'ins.sepSkewed':         { pl: 'Skośna kreska (Republika)', en: 'Skewed line (Republika)', de: 'Schräger Strich (Republika)' },
    'ins.sepDot':            { pl: 'Kropka', en: 'Dot', de: 'Punkt' },
    'ins.sepSquare':         { pl: 'Kwadrat', en: 'Square', de: 'Quadrat' },
    'ins.sepPipe':           { pl: 'Pionowa kreska', en: 'Pipe', de: 'Senkrechter Strich' },
    'ins.none':              { pl: 'Brak', en: 'None', de: 'Keine' },
    'ins.showWiperLabel':    { pl: 'Pokaż etykietę (Wiper)', en: 'Show label (Wiper)', de: 'Label anzeigen (Wiper)' },
    'ins.wiperLabelBg':      { pl: 'Tło Etykiety Wipera', en: 'Wiper Label Background', de: 'Wiper-Label-Hintergrund' },
    'ins.color1Base':        { pl: 'Kolor 1 / Podstawa', en: 'Color 1 / Base', de: 'Farbe 1 / Basis' },
    'ins.color2Gradient':    { pl: 'Kolor 2 (Gradient)', en: 'Color 2 (Gradient)', de: 'Farbe 2 (Farbverlauf)' },
    'ins.gradientAngleVal':  { pl: 'Kąt gradientu', en: 'Gradient angle', de: 'Verlaufswinkel' },
    'ins.enableGradient':    { pl: 'Włącz gradient', en: 'Enable gradient', de: 'Farbverlauf aktivieren' },
    'ins.sizeInPx':          { pl: 'Rozmiar (px)', en: 'Size (px)', de: 'Größe (px)' },
    'ins.letterSpacing':     { pl: 'Odstępy (px)', en: 'Spacing (px)', de: 'Abstand (px)' },
    'ins.wiperFont':         { pl: 'Krój Czcionki Wipera (Kategorii)', en: 'Wiper (Category) Font', de: 'Wiper-Schriftart (Kategorie)' },
    'ins.layoutDefault':     { pl: 'Domyślna układu', en: 'Layout default', de: 'Layout-Standard' },
    'ins.weightNormal':      { pl: 'Normalna (400)', en: 'Normal (400)', de: 'Normal (400)' },
    'ins.weightBold':        { pl: 'Pogrubiona (700)', en: 'Bold (700)', de: 'Fett (700)' },
    'ins.ocgParams':         { pl: 'PARAMETRY OCG (NIESTANDARDOWE)', en: 'OCG PARAMETERS (CUSTOM)', de: 'OCG-PARAMETER (BENUTZERDEFINIERT)' },
    'ins.uploadError':       { pl: 'Wystąpił błąd podczas wgrywania pliku.', en: 'An error occurred while uploading the file.', de: 'Beim Hochladen der Datei ist ein Fehler aufgetreten.' },
    'ins.sideImageUploadError': { pl: 'Wystąpił błąd podczas wgrywania grafiki bocznej.', en: 'An error occurred while uploading the side image.', de: 'Beim Hochladen des Seitenbildes ist ein Fehler aufgetreten.' },
    'ins.textNone':          { pl: '✕ Brak (Pojawia się z belką)', en: '✕ None (Appears with bar)', de: '✕ Keine (Erscheint mit Balken)' },
    'ins.textReveal':        { pl: 'Odsłonięcie (Reveal / Typewriter)', en: 'Reveal (Typewriter)', de: 'Aufdecken (Reveal / Typewriter)' },
    'ins.textFade':          { pl: 'Zanikanie (Fade Letters)', en: 'Fade (Letters)', de: 'Verblassen (Buchstaben)' },
    'ins.textBlur':          { pl: 'Rozmycie (Blur In)', en: 'Blur In', de: 'Weichzeichnen (Blur In)' },
    'ins.textScale':         { pl: 'Skalowanie (Scale)', en: 'Scale', de: 'Skalierung (Scale)' },
    'ins.textSlideUp':       { pl: 'Wjazd od dołu (Slide Up)', en: 'Slide Up', de: 'Von unten (Slide Up)' },
    'ins.textSlideDown':     { pl: 'Wjazd od góry (Slide Down)', en: 'Slide Down', de: 'Von oben (Slide Down)' },
    'ins.textSlideLeft':     { pl: 'Wjazd od prawej (Slide Left)', en: 'Slide Left', de: 'Von rechts (Slide Left)' },
    'ins.textSlideRight':    { pl: 'Wjazd od lewej (Slide Right)', en: 'Slide Right', de: 'Von links (Slide Right)' },
    'ins.syncAfterBarIn':    { pl: 'Rozpocznij po wejściu belki (Sekwencyjnie)', en: 'Start after bar entry (Sequential)', de: 'Nach Balkeneingang starten (Sequenziell)' },
    'ins.textOutNone':       { pl: '✕ Brak (Razem z belką / Sztywne ucięcie)', en: '✕ None (With bar / Hard cut)', de: '✕ Keine (Mit Balken / Harter Schnitt)' },
    'ins.textOutFade':       { pl: 'Zanikanie (Fade)', en: 'Fade', de: 'Verblassen (Fade)' },
    'ins.textOutBlur':       { pl: 'Rozmycie (Blur Out)', en: 'Blur Out', de: 'Weichzeichnen (Blur Out)' },
    'ins.textOutScale':      { pl: 'Skalowanie (Scale)', en: 'Scale', de: 'Skalierung (Scale)' },
    'ins.textOutSlideUp':    { pl: 'Zjazd do góry (Slide Up)', en: 'Slide Up', de: 'Nach oben (Slide Up)' },
    'ins.textOutSlideDown':  { pl: 'Zjazd do dołu (Slide Down)', en: 'Slide Down', de: 'Nach unten (Slide Down)' },
    'ins.textOutSlideLeft':  { pl: 'Zjazd w lewo (Slide Left)', en: 'Slide Left', de: 'Nach links (Slide Left)' },
    'ins.textOutSlideRight': { pl: 'Zjazd w prawo (Slide Right)', en: 'Slide Right', de: 'Nach rechts (Slide Right)' },
    'ins.textOutHide':       { pl: 'Zasłonięcie (Hide / Clip)', en: 'Hide (Clip)', de: 'Verdecken (Hide / Clip)' },
    'ins.syncBeforeBarOut':  { pl: 'Rozpocznij przed wyjściem belki (Sekwencyjnie)', en: 'Start before bar exit (Sequential)', de: 'Vor Balkenausgang starten (Sequenziell)' },
    'ins.gleamColor':        { pl: 'Kolor Błysku', en: 'Gleam Color', de: 'Glanzfarbe' },
    'ins.gleamDuration':     { pl: 'Czas trwania (s)', en: 'Duration (s)', de: 'Dauer (s)' },
    'ins.gleamHeight':       { pl: 'Wys. (px)', en: 'Height (px)', de: 'Höhe (px)' },
    'ins.gleamFrequency':    { pl: 'Częstotl. (s)', en: 'Freq. (s)', de: 'Freq. (s)' },
    'ins.gleamFrequencyTitle': { pl: 'Przerwa między błyskami', en: 'Gap between gleams', de: 'Pause zwischen Glanzeffekten' },
    'ins.gleamWidth':        { pl: 'Szer. (%)', en: 'Width (%)', de: 'Breite (%)' },
    'ins.gleamWidthTitle':   { pl: 'Szerokość błysku', en: 'Gleam width', de: 'Glanzbreite' },
    'ins.gleamOpacity':      { pl: 'Przezroczystość Błysku', en: 'Gleam Opacity', de: 'Glanz-Deckkraft' },

    // ── Template editor ──
    'tpl.title':             { pl: 'Szablony', en: 'Templates', de: 'Vorlagen' },
    'tpl.new':               { pl: 'Nowy', en: 'New', de: 'Neu' },
    'tpl.newAriaLabel':      { pl: 'Utwórz nowy szablon', en: 'Create new template', de: 'Neue Vorlage erstellen' },
    'tpl.importJsonAriaLabel': { pl: 'Importuj szablon JSON', en: 'Import JSON template', de: 'JSON-Vorlage importieren' },
    'tpl.importOcgAriaLabel': { pl: 'Importuj szablon OCG', en: 'Import OCG template', de: 'OCG-Vorlage importieren' },
    'tpl.importJson':        { pl: 'Import JSON', en: 'Import JSON', de: 'JSON importieren' },
    'tpl.importOcg':         { pl: 'Import OCG (.json)', en: 'Import OCG (.json)', de: 'OCG importieren (.json)' },
    'tpl.selectToEdit':      { pl: 'Wybierz szablon do edycji', en: 'Select a template to edit', de: 'Vorlage zum Bearbeiten auswählen' },
    'tpl.delete':            { pl: 'Usuń', en: 'Delete', de: 'Löschen' },
    'tpl.exportJson':        { pl: 'Eksportuj (.json)', en: 'Export (.json)', de: 'Exportieren (.json)' },
    'tpl.exportOcg':         { pl: 'Eksportuj OCG', en: 'Export OCG', de: 'OCG exportieren' },
    'tpl.save':              { pl: 'Zapisz', en: 'Save', de: 'Speichern' },
    'tpl.tabVars':           { pl: 'Zmienne', en: 'Variables', de: 'Variablen' },
    'tpl.graphicEditTitle':  { pl: 'Edycja kodu grafiki:', en: 'Editing graphic code:', de: 'Grafikcode bearbeiten:' },
    'tpl.overrideToggle':    { pl: 'Nadpisz kod szablonu', en: 'Override template code', de: 'Vorlagencode überschreiben' },
    'tpl.backToTemplate':    { pl: 'Wróć do szablonu', en: 'Back to template', de: 'Zurück zur Vorlage' },
    'tpl.varsTitle':         { pl: 'Parametry Wejściowe (Zmienne Szablonu)', en: 'Input Parameters (Template Variables)', de: 'Eingabeparameter (Vorlagenvariablen)' },
    'tpl.varsDesc':          { pl: 'Definiuj pola danych, które będą widoczne w kafelkach na panelu głównym.', en: 'Define data fields that will be visible in tiles on the main panel.', de: 'Definieren Sie Datenfelder, die in den Kacheln des Hauptpanels sichtbar sind.' },
    'tpl.addVar':            { pl: 'Dodaj Zmienną', en: 'Add Variable', de: 'Variable hinzufügen' },
    'tpl.htmlId':            { pl: 'ID Elementu HTML', en: 'HTML Element ID', de: 'HTML-Element-ID' },
    'tpl.displayName':       { pl: 'Nazwa Wyświetlana', en: 'Display Name', de: 'Anzeigename' },
    'tpl.defaultValue':      { pl: 'Wartość Domyślna', en: 'Default Value', de: 'Standardwert' },
    'tpl.type':              { pl: 'Typ', en: 'Type', de: 'Typ' },
    'tpl.noVarsPrefix':      { pl: 'Brak zmiennych — kliknij', en: 'No variables — click', de: 'Keine Variablen — klicken Sie auf' },
    'tpl.noVarsSuffix':      { pl: 'aby zdefiniować pierwsze pole.', en: 'to define the first field.', de: 'um das erste Feld zu definieren.' },
    'tpl.addVarCta':         { pl: '+ Dodaj Zmienną', en: '+ Add Variable', de: '+ Variable hinzufügen' },
    'tpl.defaultsTitle':     { pl: 'Wartości domyślne szablonu', en: 'Template default values', de: 'Standard-Vorlagenwerte' },
    'tpl.defaultsDesc':      { pl: 'Domyślne ustawienia stosowane przy tworzeniu nowych grafik z tego szablonu.', en: 'Default settings applied when creating new graphics from this template.', de: 'Standardeinstellungen beim Erstellen neuer Grafiken aus dieser Vorlage.' },
    'tpl.confirmDelete':     { pl: 'Czy na pewno chcesz usunąć szablon "{0}"? To działanie jest nieodwracalne.', en: 'Are you sure you want to delete template "{0}"? This action cannot be undone.', de: 'Möchten Sie die Vorlage „{0}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.' },
    'tpl.selectTemplate':    { pl: 'Wybierz Szablon', en: 'Select Template', de: 'Vorlage auswählen' },
    'tpl.exportToJson':      { pl: 'Eksportuj do JSON', en: 'Export to JSON', de: 'Als JSON exportieren' },
    'tpl.invalidFormat':     { pl: 'Nieprawidłowy format pliku szablonu.', en: 'Invalid template file format.', de: 'Ungültiges Vorlagendateiformat.' },
    'tpl.importSuccessWithGraphics': { pl: 'Szablon i {0} elementów graficznych zostały pomyślnie zaimportowane!', en: 'Template and {0} graphic elements imported successfully!', de: 'Vorlage und {0} Grafikelemente erfolgreich importiert!' },
    'tpl.importSuccess':     { pl: 'Szablon został pomyślnie zaimportowany!', en: 'Template imported successfully!', de: 'Vorlage erfolgreich importiert!' },
    'tpl.importJsonError':   { pl: 'Błąd podczas importowania pliku JSON.', en: 'Error importing JSON file.', de: 'Fehler beim Importieren der JSON-Datei.' },
    'tpl.ocgImportSuccess':  { pl: 'Zaimportowano {0} szablonów OCG! Automatyczne poprawki kompatybilności zostały zastosowane.', en: 'Imported {0} OCG templates! Automatic compatibility fixes applied.', de: '{0} OCG-Vorlagen importiert! Automatische Kompatibilitätskorrekturen angewendet.' },
    'tpl.ocgImportNoValid':  { pl: 'Nie znaleziono prawidłowych szablonów OCG w wybranych plikach.', en: 'No valid OCG templates found in selected files.', de: 'Keine gültigen OCG-Vorlagen in den ausgewählten Dateien gefunden.' },
    'tpl.ocgImportError':    { pl: 'Błąd podczas importowania plików OCG JSON.', en: 'Error importing OCG JSON files.', de: 'Fehler beim Importieren der OCG-JSON-Dateien.' },
    'tpl.fieldTypeText':     { pl: 'Krótki tekst', en: 'Short text', de: 'Kurztext' },
    'tpl.fieldTypeRichtext': { pl: 'Edytor tekstu', en: 'Text editor', de: 'Texteditor' },
    'tpl.fieldTypeList':     { pl: 'Lista (JSON)', en: 'List (JSON)', de: 'Liste (JSON)' },
    'tpl.fieldIdPlaceholder': { pl: 'np. f-tytul', en: 'e.g. f-title', de: 'z.B. f-titel' },
    'tpl.fieldLabelPlaceholder': { pl: 'Wyświetlana nazwa', en: 'Display name', de: 'Anzeigename' },
    'tpl.fieldDefaultPlaceholder': { pl: 'Wartość domyślna', en: 'Default value', de: 'Standardwert' },
    'tpl.deleteVariable':    { pl: 'Usuń zmienną', en: 'Delete variable', de: 'Variable löschen' },
    'tpl.defaultsContentSection': { pl: 'Treść', en: 'Content', de: 'Inhalt' },
    'tpl.defaultsTitleLabel': { pl: 'Tytuł', en: 'Title', de: 'Titel' },
    'tpl.defaultsSubtitleLabel': { pl: 'Podtytuł', en: 'Subtitle', de: 'Untertitel' },
    'tpl.defaultTitlePlaceholder': { pl: 'Domyślny tytuł', en: 'Default title', de: 'Standardtitel' },
    'tpl.defaultSubtitlePlaceholder': { pl: 'Domyślny podtytuł', en: 'Default subtitle', de: 'Standarduntertitel' },
    'tpl.defaultsIntroText': { pl: 'Tekst intro / wiper', en: 'Intro text / wiper', de: 'Introtext / Wiper' },
    'tpl.wiperTextPlaceholder': { pl: 'Tekst wipera', en: 'Wiper text', de: 'Wiper-Text' },
    'tpl.defaultsTickerSpeed': { pl: 'Prędkość tickera', en: 'Ticker speed', de: 'Ticker-Geschwindigkeit' },
    'tpl.defaultsTickerMode': { pl: 'Tryb tickera', en: 'Ticker mode', de: 'Ticker-Modus' },
    'tpl.tickerModeHorizontal': { pl: 'Poziomy', en: 'Horizontal', de: 'Horizontal' },
    'tpl.tickerModeVertical': { pl: 'Pionowy', en: 'Vertical', de: 'Vertikal' },
    'tpl.defaultsBgBorder':  { pl: 'Tło i obramowanie', en: 'Background & border', de: 'Hintergrund & Rahmen' },
    'tpl.defaultsBgType':    { pl: 'Typ tła', en: 'Background type', de: 'Hintergrundtyp' },
    'tpl.bgTypeSolid':       { pl: 'Jednolite', en: 'Solid', de: 'Einfarbig' },
    'tpl.bgTypeGradient':    { pl: 'Gradient', en: 'Gradient', de: 'Verlauf' },
    'tpl.bgTypeTransparent': { pl: 'Przezroczyste', en: 'Transparent', de: 'Transparent' },
    'tpl.defaultsBgColor':   { pl: 'Kolor tła', en: 'Background color', de: 'Hintergrundfarbe' },
    'tpl.defaultsBgColor2':  { pl: 'Kolor tła 2', en: 'Background color 2', de: 'Hintergrundfarbe 2' },
    'tpl.defaultsGradientAngle': { pl: 'Kąt gradientu', en: 'Gradient angle', de: 'Verlaufswinkel' },
    'tpl.defaultsBorderColor': { pl: 'Kolor obramowania', en: 'Border color', de: 'Rahmenfarbe' },
    'tpl.defaultsBorderWidth': { pl: 'Grubość obramowania', en: 'Border width', de: 'Rahmenstärke' },
    'tpl.defaultsBorderRadius': { pl: 'Zaokrąglenie', en: 'Border radius', de: 'Abrundung' },
    'tpl.defaultsSubtitleBg': { pl: 'Kolor podtytułu tło', en: 'Subtitle background color', de: 'Untertitel-Hintergrundfarbe' },
    'tpl.defaultsTitleTypography': { pl: 'Typografia — tytuł', en: 'Typography — title', de: 'Typografie — Titel' },
    'tpl.defaultsTextColor': { pl: 'Kolor tekstu', en: 'Text color', de: 'Textfarbe' },
    'tpl.defaultsFontFamily': { pl: 'Czcionka', en: 'Font family', de: 'Schriftart' },
    'tpl.defaultsFontSize':  { pl: 'Rozmiar', en: 'Size', de: 'Größe' },
    'tpl.defaultsFontWeight': { pl: 'Grubość', en: 'Weight', de: 'Schriftstärke' },
    'tpl.defaultsTextTransform': { pl: 'Transformacja', en: 'Transform', de: 'Transformation' },
    'tpl.transformNone':     { pl: 'Brak', en: 'None', de: 'Keine' },
    'tpl.transformUppercase': { pl: 'WIELKIE', en: 'UPPERCASE', de: 'GROSSBUCHSTABEN' },
    'tpl.transformLowercase': { pl: 'małe', en: 'lowercase', de: 'kleinbuchstaben' },
    'tpl.transformCapitalize': { pl: 'Pierwsza Wielka', en: 'Capitalize', de: 'Erster Großbuchstabe' },
    'tpl.defaultsSubtitleTypography': { pl: 'Typografia — podtytuł', en: 'Typography — subtitle', de: 'Typografie — Untertitel' },
    'tpl.defaultsLayout':   { pl: 'Layout domyślny', en: 'Default layout', de: 'Standard-Layout' },
    'tpl.defaultsWidth':     { pl: 'Szerokość', en: 'Width', de: 'Breite' },
    'tpl.defaultsHeight':    { pl: 'Wysokość', en: 'Height', de: 'Höhe' },
    'tpl.defaultsPosX':      { pl: 'Pozycja X', en: 'Position X', de: 'Position X' },
    'tpl.defaultsPosY':      { pl: 'Pozycja Y', en: 'Position Y', de: 'Position Y' },
    'tpl.defaultsScale':     { pl: 'Skala', en: 'Scale', de: 'Skalierung' },
    'tpl.defaultsLayer':     { pl: 'Warstwa (Z-Index)', en: 'Layer (Z-Index)', de: 'Ebene (Z-Index)' },
    'tpl.defaultsAnimIn':    { pl: 'Animacja — wejście', en: 'Animation — in', de: 'Animation — Eingang' },
    'tpl.defaultsAnimType':  { pl: 'Typ', en: 'Type', de: 'Typ' },
    'tpl.defaultsAnimDirection': { pl: 'Kierunek', en: 'Direction', de: 'Richtung' },
    'tpl.dirLeft':           { pl: 'Lewo', en: 'Left', de: 'Links' },
    'tpl.dirRight':          { pl: 'Prawo', en: 'Right', de: 'Rechts' },
    'tpl.dirTop':            { pl: 'Góra', en: 'Top', de: 'Oben' },
    'tpl.dirBottom':         { pl: 'Dół', en: 'Bottom', de: 'Unten' },
    'tpl.defaultsDuration':  { pl: 'Czas trwania (s)', en: 'Duration (s)', de: 'Dauer (s)' },
    'tpl.defaultsDelay':     { pl: 'Opóźnienie (s)', en: 'Delay (s)', de: 'Verzögerung (s)' },
    'tpl.defaultsAnimOut':   { pl: 'Animacja — wyjście', en: 'Animation — out', de: 'Animation — Ausgang' },
    'tpl.saved':             { pl: '✓ Zapisano!', en: '✓ Saved!', de: '✓ Gespeichert!' },
    'tpl.animTypeNone':      { pl: 'Brak', en: 'None', de: 'Keine' },
    'tpl.fontFamilyPlaceholder': { pl: 'np. Inter', en: 'e.g. Inter', de: 'z.B. Inter' },
    'ins.introTextPlaceholder': { pl: 'np. PILNE lub TYLKO U NAS', en: 'e.g. URGENT or EXCLUSIVE', de: 'z.B. EILMELDUNG oder EXKLUSIV' },

    // ── Settings page ──
    'settings.globalTitle':  { pl: 'Ustawienia globalne', en: 'Global Settings', de: 'Globale Einstellungen' },
    'settings.resolution':   { pl: 'Rozdzielczość wyjścia (Program)', en: 'Output resolution (Program)', de: 'Ausgabeauflösung (Programm)' },
    'settings.width':        { pl: 'Szerokość (px)', en: 'Width (px)', de: 'Breite (px)' },
    'settings.height':       { pl: 'Wysokość (px)', en: 'Height (px)', de: 'Höhe (px)' },
    'settings.resolutionHelp': { pl: 'Domyślna rozdzielczość używana na żywo w oknie WYJŚCIE. Odśwież okno wyjścia po każdej zmianie rozdzielczości w celu zastosowania.', en: 'Default resolution used live in the OUTPUT window. Refresh the output window after each resolution change to apply.', de: 'Standardauflösung für das AUSGABE-Fenster im Live-Betrieb. Aktualisieren Sie das Ausgabefenster nach jeder Auflösungsänderung.' },
    'settings.globalFont':   { pl: 'Globalna Czcionka', en: 'Global Font', de: 'Globale Schriftart' },
    'settings.fontFamily':   { pl: 'Krój czcionki (Font Family)', en: 'Font family', de: 'Schriftfamilie' },
    'settings.fontHelp':     { pl: 'Wybierz styl czcionki. Ten styl będzie również domyślnie używany przy dodawaniu nowych elementów.', en: 'Choose font style. This style will also be used by default when adding new elements.', de: 'Wählen Sie den Schriftstil. Dieser Stil wird auch standardmäßig beim Hinzufügen neuer Elemente verwendet.' },
    'settings.fontApplyTo':  { pl: 'Zastosuj wymuszenie globalnej czcionki dla elementów z Banku Grafik:', en: 'Apply global font override for Graphics Bank items:', de: 'Globale Schriftart-Überschreibung für Grafikbank-Elemente anwenden:' },
    'settings.globalRadius': { pl: 'Globalne Zaokrąglenie (Border Radius)', en: 'Global Border Radius', de: 'Globaler Rahmenradius (Border Radius)' },
    'settings.radiusValue':  { pl: 'Promień zaokrąglenia (px)', en: 'Border radius (px)', de: 'Rahmenradius (px)' },
    'settings.radiusHelp':   { pl: 'Wybierz wartość zaokrąglenia, która wymusi obłe krawędzie na wybranych elementach.', en: 'Set the radius value to force rounded corners on selected elements.', de: 'Wählen Sie den Rundungswert, um abgerundete Ecken bei ausgewählten Elementen zu erzwingen.' },
    'settings.radiusApplyTo': { pl: 'Zastosuj wymuszenie zaokrąglenia dla elementów z Banku Grafik:', en: 'Apply radius override for Graphics Bank items:', de: 'Radius-Überschreibung für Grafikbank-Elemente anwenden:' },
    'settings.globalShadow': { pl: 'Globalny Cień (Shadow)', en: 'Global Shadow', de: 'Globaler Schatten (Shadow)' },
    'settings.shadowEnable': { pl: 'Włącz globalny cień dla wszystkich elementów', en: 'Enable global shadow for all elements', de: 'Globalen Schatten für alle Elemente aktivieren' },
    'settings.shadowColor':  { pl: 'Kolor Cienia', en: 'Shadow Color', de: 'Schattenfarbe' },
    'settings.shadowBlur':   { pl: 'Rozmycie', en: 'Blur', de: 'Unschärfe' },
    'settings.database':     { pl: 'Baza Danych', en: 'Database', de: 'Datenbank' },
    'settings.dbHelp':       { pl: 'Możesz wykonać pełną kopię zapasową środowiska (szablonów, banku grafik i ustawień tła) pobierając plik ze stanem aplikacji, lub wgrać swój plik JSON, aby odtworzyć konfigurację.', en: 'You can create a full backup of the environment (templates, graphics bank, and background settings) by downloading the state file, or upload your JSON file to restore the configuration.', de: 'Sie können eine vollständige Sicherung der Umgebung (Vorlagen, Grafikbank und Hintergrundeinstellungen) erstellen, indem Sie die Statusdatei herunterladen, oder Ihre JSON-Datei hochladen, um die Konfiguration wiederherzustellen.' },
    'settings.exportDb':     { pl: 'Eksportuj (Pobierz db.json)', en: 'Export (Download db.json)', de: 'Exportieren (db.json herunterladen)' },
    'settings.importDb':     { pl: 'Importuj Bazę', en: 'Import Database', de: 'Datenbank importieren' },
    'settings.language':     { pl: 'Język interfejsu', en: 'Interface language', de: 'Sprache der Benutzeroberfläche' },
    'settings.networkTitle': { pl: 'Adresy sieciowe', en: 'Network Addresses', de: 'Netzwerkadressen' },
    'settings.networkHelp':  { pl: 'Adresy, pod którymi dostępna jest aplikacja w przeglądarce oraz strona wyjściowa (output) do podpięcia w OBS/vMix.', en: 'Addresses where the app is accessible via browser and the output page for OBS/vMix browser source.', de: 'Adressen, unter denen die App im Browser erreichbar ist, sowie die Ausgabeseite für OBS/vMix-Browserquelle.' },
    'settings.networkPanel': { pl: 'Panel sterowania (Web)', en: 'Control Panel (Web)', de: 'Steuerpanel (Web)' },
    'settings.networkOutput':{ pl: 'Output (OBS / vMix)', en: 'Output (OBS / vMix)', de: 'Ausgabe (OBS / vMix)' },
    'settings.networkError': { pl: 'Nie udało się pobrać informacji o serwerze', en: 'Failed to fetch server info', de: 'Serverinformationen konnten nicht abgerufen werden' },

    // ── WYSIWYG editor ──
    'wysiwyg.title':         { pl: 'Edytor Tekstu', en: 'Text Editor', de: 'Texteditor' },
    'wysiwyg.cancel':        { pl: 'Anuluj', en: 'Cancel', de: 'Abbrechen' },
    'wysiwyg.apply':         { pl: 'Zatwierdź', en: 'Apply', de: 'Übernehmen' },
    'wysiwyg.textColor':     { pl: 'Kolor tekstu', en: 'Text color', de: 'Textfarbe' },
    'wysiwyg.textBg':        { pl: 'Kolor tła tekstu (Highlight)', en: 'Text background (Highlight)', de: 'Texthintergrund (Highlight)' },
    'wysiwyg.clearFormat':   { pl: '✕ Clear', en: '✕ Clear', de: '✕ Löschen' },
    'wysiwyg.bgLabel':       { pl: 'Tło', en: 'BG', de: 'HG' },
    'wysiwyg.showHtml':      { pl: '▶ Pokaż źródło HTML', en: '▶ Show HTML source', de: '▶ HTML-Quelle anzeigen' },
    'wysiwyg.livePreview':   { pl: 'Podgląd na żywo', en: 'Live preview', de: 'Live-Vorschau' },
    'wysiwyg.previewNote':   { pl: 'Zmiany występują w podglądzie • Na antenie pojawi się po kliknięciu TAKE', en: 'Changes shown in preview • Will appear on air after TAKE', de: 'Änderungen in der Vorschau • Erscheint nach TAKE auf Sendung' },
    'wysiwyg.lineHeight':    { pl: 'Interlinia (line-height)', en: 'Line height', de: 'Zeilenhöhe' },
    'wysiwyg.lineHeightTitle': { pl: 'Interlinia (line-height)', en: 'Line height', de: 'Zeilenhöhe (Line-Height)' },
    'wysiwyg.bgPreviewColor': { pl: 'Kolor tła podglądu', en: 'Preview background color', de: 'Vorschau-Hintergrundfarbe' },
    'wysiwyg.clickToEdit':   { pl: 'Kliknij aby edytować…', en: 'Click to edit…', de: 'Klicken zum Bearbeiten…' },
    'wysiwyg.confirmClearFormatting': { pl: 'Czy na pewno chcesz wyczyścić całe formatowanie tekstu?', en: 'Are you sure you want to clear all text formatting?', de: 'Möchten Sie wirklich die gesamte Textformatierung löschen?' },
    'wysiwyg.hideHtmlSource': { pl: '▼ Ukryj źródło HTML', en: '▼ Hide HTML source', de: '▼ HTML-Quelle ausblenden' },
    'wysiwyg.showHtmlSource': { pl: '▶ Pokaż źródło HTML', en: '▶ Show HTML source', de: '▶ HTML-Quelle anzeigen' },

    // ── Ticker editor ──
    'ticker.editTitle':      { pl: 'Szybka Edycja Tickera', en: 'Quick Ticker Edit', de: 'Schnelle Ticker-Bearbeitung' },
    'ticker.addGroup':       { pl: 'Dodaj Grupę', en: 'Add Group', de: 'Gruppe hinzufügen' },
    'ticker.cancel':         { pl: 'Anuluj', en: 'Cancel', de: 'Abbrechen' },
    'ticker.saveChanges':    { pl: 'Zatwierdź Zmiany', en: 'Apply Changes', de: 'Änderungen übernehmen' },
    'ticker.dragHint':       { pl: 'Przeciągnij elementy aby zmienić kolejność lub grupę', en: 'Drag items to reorder or change group', de: 'Elemente ziehen, um die Reihenfolge oder Gruppe zu ändern' },
    'ticker.message':        { pl: 'Wiadomość', en: 'Message', de: 'Nachricht' },
    'ticker.categoryWiper':  { pl: 'Kategoria (Wiper)', en: 'Category (Wiper)', de: 'Kategorie (Wiper)' },
    'ticker.noCategory':     { pl: 'BRAK KATEGORII', en: 'NO CATEGORY', de: 'KEINE KATEGORIE' },
    'ticker.infoCategory':   { pl: 'INFORMACJE', en: 'INFORMATION', de: 'INFORMATIONEN' },
    'ticker.categoryPlaceholder': { pl: 'NAZWA KATEGORII (np. PILNE, SPORT, POGODA)', en: 'CATEGORY NAME (e.g. BREAKING, SPORTS, WEATHER)', de: 'KATEGORIENAME (z.B. EILMELDUNG, SPORT, WETTER)' },
    'ticker.deleteGroup':    { pl: 'Usuń grupę', en: 'Delete group', de: 'Gruppe löschen' },
    'ticker.messagePlaceholder': { pl: 'Wpisz treść wiadomości...', en: 'Enter message content...', de: 'Nachrichteninhalt eingeben...' },
    'ticker.deleteMessage':  { pl: 'Usuń wiadomość', en: 'Delete message', de: 'Nachricht löschen' },
    'ticker.addMessage':     { pl: '+ DODAJ WIADOMOŚĆ', en: '+ ADD MESSAGE', de: '+ NACHRICHT HINZUFÜGEN' },
    'ticker.newCategory':    { pl: 'NOWA KATEGORIA', en: 'NEW CATEGORY', de: 'NEUE KATEGORIE' },
    'ticker.categoryNamePlaceholder': { pl: 'NAZWA KATEGORII', en: 'CATEGORY NAME', de: 'KATEGORIENAME' },
    'ticker.confirmDeleteGroup': { pl: 'Czy na pewno chcesz usunąć całą grupę wraz z wiadomościami?', en: 'Are you sure you want to delete the entire group with all messages?', de: 'Möchten Sie die gesamte Gruppe mit allen Nachrichten wirklich löschen?' },

    // ── Hotkeys modal ──
    'hotkey.title':          { pl: 'Skrót Klawiszowy', en: 'Keyboard Shortcut', de: 'Tastenkürzel' },
    'hotkey.pressKeys':      { pl: 'Naciśnij kombinację klawiszy...', en: 'Press key combination...', de: 'Drücken Sie die Tastenkombination...' },
    'hotkey.current':        { pl: 'Aktualny skrót:', en: 'Current shortcut:', de: 'Aktuelles Kürzel:' },
    'hotkey.none':           { pl: 'Brak', en: 'None', de: 'Keins' },
    'hotkey.assign':         { pl: 'Przypisz', en: 'Assign', de: 'Zuweisen' },
    'hotkey.remove':         { pl: 'Usuń skrót', en: 'Remove shortcut', de: 'Kürzel entfernen' },
    'hotkey.close':          { pl: 'Zamknij', en: 'Close', de: 'Schließen' },
    'hotkeys.none':          { pl: 'brak', en: 'none', de: 'keine' },
    'hotkeys.assignTitle':   { pl: 'Przypisz skrót klawiszowy', en: 'Assign keyboard shortcut', de: 'Tastenkürzel zuweisen' },
    'hotkeys.graphicLabel':  { pl: 'Grafika:', en: 'Graphic:', de: 'Grafik:' },
    'hotkeys.currentShortcut': { pl: 'Obecny skrót:', en: 'Current shortcut:', de: 'Aktuelles Kürzel:' },
    'hotkeys.pressKeyCombination': { pl: 'Naciśnij kombinację klawiszy...', en: 'Press key combination...', de: 'Tastenkombination drücken...' },
    'hotkeys.enterToAssign': { pl: 'Naciśnij <kbd class="bg-gray-700 px-1 rounded text-gray-300">Enter</kbd> aby przypisać &nbsp;·&nbsp; <kbd class="bg-gray-700 px-1 rounded text-gray-300">Esc</kbd> aby zmienić', en: 'Press <kbd class="bg-gray-700 px-1 rounded text-gray-300">Enter</kbd> to assign &nbsp;·&nbsp; <kbd class="bg-gray-700 px-1 rounded text-gray-300">Esc</kbd> to change', de: '<kbd class="bg-gray-700 px-1 rounded text-gray-300">Enter</kbd> zum Zuweisen &nbsp;·&nbsp; <kbd class="bg-gray-700 px-1 rounded text-gray-300">Esc</kbd> zum Ändern' },
    'hotkeys.assign':        { pl: 'Przypisz', en: 'Assign', de: 'Zuweisen' },
    'hotkeys.clearShortcut': { pl: 'Usuń skrót', en: 'Clear shortcut', de: 'Kürzel entfernen' },
    'hotkeys.cancel':        { pl: 'Anuluj', en: 'Cancel', de: 'Abbrechen' },
    'hotkeys.conflictWith':  { pl: 'Konflikt z: {0}', en: 'Conflict with: {0}', de: 'Konflikt mit: {0}' },

    // ── Dialogs / Confirmations ──
    'dialog.confirm':        { pl: 'Potwierdź', en: 'Confirm', de: 'Bestätigen' },
    'dialog.cancel':         { pl: 'Anuluj', en: 'Cancel', de: 'Abbrechen' },
    'dialog.yes':            { pl: 'Tak', en: 'Yes', de: 'Ja' },
    'dialog.no':             { pl: 'Nie', en: 'No', de: 'Nein' },
    'dialog.resetConfirm':   { pl: 'Czy na pewno chcesz zresetować całą bazę danych? Wszystkie grafiki, szablony i ustawienia zostaną usunięte!', en: 'Are you sure you want to reset the entire database? All graphics, templates and settings will be deleted!', de: 'Möchten Sie wirklich die gesamte Datenbank zurücksetzen? Alle Grafiken, Vorlagen und Einstellungen werden gelöscht!' },
    'dialog.importConfirm':  { pl: 'Importowanie bazy nadpisze obecne dane. Czy kontynuować?', en: 'Importing database will overwrite current data. Continue?', de: 'Der Import überschreibt die aktuellen Daten. Fortfahren?' },
    'dialog.exportSuccess':  { pl: 'Baza wyeksportowana pomyślnie.', en: 'Database exported successfully.', de: 'Datenbank erfolgreich exportiert.' },

    // ── Loading ──
    'loading.engine':        { pl: 'Ładowanie CG Engine...', en: 'Loading CG Engine...', de: 'CG Engine wird geladen...' },
    'loading.connectionStatus': { pl: 'Status połączenia: łączenie...', en: 'Connection status: connecting...', de: 'Verbindungsstatus: Verbinden...' },

    // ── init.js ──
    'init.confirmResetDb':   { pl: 'Zresetować DB do db.json? Wszystkie zmiany zostaną utracone.', en: 'Reset DB to db.json? All changes will be lost.', de: 'DB auf db.json zurücksetzen? Alle Änderungen gehen verloren.' },
    'init.invalidDbFormat':  { pl: 'Nieprawidłowy format db.json', en: 'Invalid db.json format', de: 'Ungültiges db.json-Format' },
    'init.resetDbError':     { pl: 'Nie udało się zresetować bazy danych: {0}', en: 'Failed to reset database: {0}', de: 'Datenbankrücksetzung fehlgeschlagen: {0}' },
    'init.confirmClearBank': { pl: 'Czy na pewno chcesz usunąć WSZYSTKIE elementy z banku grafik?', en: 'Are you sure you want to delete ALL elements from the graphics bank?', de: 'Möchten Sie wirklich ALLE Elemente aus der Grafikbank löschen?' },
    'init.confirmClearBankFinal': { pl: 'Jesteś absolutnie pewien? Tej operacji nie można prosto cofnąć.', en: 'Are you absolutely sure? This operation cannot be easily undone.', de: 'Sind Sie absolut sicher? Dieser Vorgang kann nicht einfach rückgängig gemacht werden.' },
    'init.hiddenInDraft':    { pl: 'SCHOWANE W SZKICU (UŻYJ SYNCHR.)', en: 'HIDDEN IN DRAFT (USE SYNC)', de: 'IM ENTWURF VERSTECKT (SYNC VERWENDEN)' },
    'init.saveChanges':      { pl: 'ZAPISZ ZMIANY', en: 'SAVE CHANGES', de: 'ÄNDERUNGEN SPEICHERN' },
    'init.saved':            { pl: '✓ Zapisano!', en: '✓ Saved!', de: '✓ Gespeichert!' },
    'init.sourceTemplateNotFound': { pl: 'Nie znaleziono źródłowego szablonu.', en: 'Source template not found.', de: 'Quellvorlage nicht gefunden.' },
    'init.templateSuffix':   { pl: ' (Szablon)', en: ' (Template)', de: ' (Vorlage)' },
    'init.exportSuffix':     { pl: ' (Eksport)', en: ' (Export)', de: ' (Export)' },
    'init.savedUppercase':   { pl: '✓ ZAPISANO', en: '✓ SAVED', de: '✓ GESPEICHERT' },
    'init.filePrefix':       { pl: 'szablon', en: 'template', de: 'vorlage' },
    'init.saveAsTemplate':   { pl: 'ZAPISZ JAKO\nSZABLON', en: 'SAVE AS\nTEMPLATE', de: 'SPEICHERN ALS\nVORLAGE' },
    'init.confirmDeleteGraphic': { pl: 'Czy na pewno chcesz usunąć grafikę "{0}"?', en: 'Are you sure you want to delete graphic "{0}"?', de: 'Möchten Sie die Grafik „{0}" wirklich löschen?' },
    'init.newTemplateName':  { pl: 'Nowy Szablon', en: 'New Template', de: 'Neue Vorlage' },
    'init.templatesImportedSuccess': { pl: 'Szablony zaimportowane pomyślnie!', en: 'Templates imported successfully!', de: 'Vorlagen erfolgreich importiert!' },
    'init.templateParseError': { pl: 'Błąd parsowania JSON szablonu: {0}', en: 'Template JSON parse error: {0}', de: 'JSON-Analysefehler der Vorlage: {0}' },
    'init.selectTemplateFirst': { pl: 'Wybierz najpierw szablon z listy!', en: 'Select a template from the list first!', de: 'Wählen Sie zuerst eine Vorlage aus der Liste!' },
    'init.confirmDeleteTemplate': { pl: 'Usunąć szablon "{0}"?', en: 'Delete template "{0}"?', de: 'Vorlage „{0}" löschen?' },
    'init.confirmExportDb':  { pl: 'Czy na pewno chcesz pobrać aktualny stan bazy danych (Szablony, Elementy Graficzne i Ustawienia)?', en: 'Are you sure you want to download the current database state (Templates, Graphics, and Settings)?', de: 'Möchten Sie den aktuellen Datenbankstatus (Vorlagen, Grafiken und Einstellungen) herunterladen?' },
    'init.confirmImportDb':  { pl: 'UWAGA! Import bazy spowoduje nadpisanie WSZYSTKICH aktualnych grafik i szablonów. Czy na pewno chcesz kontynuować?', en: 'WARNING! Database import will overwrite ALL current graphics and templates. Are you sure you want to continue?', de: 'ACHTUNG! Datenbankimport überschreibt ALLE aktuellen Grafiken und Vorlagen. Möchten Sie fortfahren?' },
    'init.dbImportSuccess':  { pl: 'Baza Danych została poprawnie zaimportowana!', en: 'Database imported successfully!', de: 'Datenbank erfolgreich importiert!' },
    'init.invalidDbFile':    { pl: 'Nieprawidłowy plik Bazy Danych', en: 'Invalid database file', de: 'Ungültige Datenbankdatei' },
    'init.dbImportError':    { pl: 'Błąd importowania bazy: {0}', en: 'Database import error: {0}', de: 'Datenbankimportfehler: {0}' },
    'init.shortcutsTitle':   { pl: 'Skróty Klawiszowe', en: 'Keyboard Shortcuts', de: 'Tastenkürzel' },
    'init.shortcutTake':     { pl: 'TAKE (Wejdź / Ściągnij)', en: 'TAKE (On / Off)', de: 'TAKE (Ein / Aus)' },
    'init.shortcutSync':     { pl: 'Synchronizuj (Update Active)', en: 'Sync (Update Active)', de: 'Synchronisieren (Aktive aktualisieren)' },
    'init.shortcutKillAll':  { pl: 'Wyczyść Program (Kill All)', en: 'Clear Program (Kill All)', de: 'Programm leeren (Alle beenden)' },
    'init.shortcutDelete':   { pl: 'Usuń wybraną grafikę', en: 'Delete selected graphic', de: 'Ausgewählte Grafik löschen' },
    'init.shortcutPrevNext': { pl: 'Poprzednia / Następna grafika', en: 'Previous / Next graphic', de: 'Vorherige / Nächste Grafik' },
    'init.shortcutDashTemplates': { pl: 'Dashboard / Szablony', en: 'Dashboard / Templates', de: 'Dashboard / Vorlagen' },
    'init.shortcutSetBg':    { pl: 'Ustaw tło (wybrany kolor)', en: 'Set background (selected color)', de: 'Hintergrund setzen (gewählte Farbe)' },
    'init.shortcutTransBg':  { pl: 'Tło przezroczyste / OBS', en: 'Transparent background / OBS', de: 'Transparenter Hintergrund / OBS' },
    'init.shortcutShowHelp': { pl: 'Pokaż tę pomoc', en: 'Show this help', de: 'Diese Hilfe anzeigen' },
    'init.graphicShortcuts': { pl: 'Skróty grafik', en: 'Graphic shortcuts', de: 'Grafik-Tastenkürzel' },
    'init.shortcutsDisabledNote': { pl: 'Skróty nie działają podczas edycji pól tekstowych', en: 'Shortcuts are disabled while editing text fields', de: 'Tastenkürzel sind beim Bearbeiten von Textfeldern deaktiviert' },

    // ── Language Switcher ──
    'settings.language':     { pl: 'Język interfejsu', en: 'Interface Language', de: 'Oberflächensprache' },
    'settings.languageHelp': { pl: 'Wybierz język, w którym wyświetlany będzie interfejs aplikacji.', en: 'Select the language for the application interface.', de: 'Wählen Sie die Sprache für die Anwendungsoberfläche.' },

    // ── Presets (JS) ──
    'presets.none':          { pl: '— brak —', en: '— none —', de: '— keine —' },
    'presets.newPresetName': { pl: 'Nazwa nowego presetu:', en: 'Name for new preset:', de: 'Name für neues Preset:' },
    'presets.selectFromList': { pl: 'Wybierz preset z listy.', en: 'Select a preset from the list.', de: 'Wählen Sie ein Preset aus der Liste.' },
    'presets.confirmLoad':   { pl: 'Załadować preset "{0}"?\n\nWszystkie aktywne grafiki zostaną wyłączone.', en: 'Load preset "{0}"?\n\nAll active graphics will be turned off.', de: 'Preset „{0}" laden?\n\nAlle aktiven Grafiken werden deaktiviert.' },
    'presets.selectToDelete': { pl: 'Wybierz preset do usunięcia.', en: 'Select a preset to delete.', de: 'Wählen Sie ein Preset zum Löschen.' },
    'presets.confirmDelete': { pl: 'Usunąć preset "{0}"? Tej operacji nie można cofnąć.', en: 'Delete preset "{0}"? This cannot be undone.', de: 'Preset „{0}" löschen? Dies kann nicht rückgängig gemacht werden.' },
    'presets.exportName':    { pl: 'Nazwa eksportowanego presetu:', en: 'Name for exported preset:', de: 'Name für exportiertes Preset:' },
    'presets.invalidFile':   { pl: 'Nieprawidłowy plik presetu.', en: 'Invalid preset file.', de: 'Ungültige Preset-Datei.' },
    'presets.importName':    { pl: 'Nazwa presetu po imporcie:', en: 'Name for imported preset:', de: 'Name für importiertes Preset:' },
    'presets.importedDefault': { pl: 'Importowany preset', en: 'Imported preset', de: 'Importiertes Preset' },
    'presets.fileReadError':  { pl: 'Błąd odczytu pliku: {0}', en: 'File read error: {0}', de: 'Dateilesefehler: {0}' },

    // ── Monitor ──
    'monitor.templateNotFound': { pl: 'Szablon nie znaleziony', en: 'Template not found', de: 'Vorlage nicht gefunden' },
    'monitor.rendererUnavailable': { pl: 'Renderer niedostępny', en: 'Renderer unavailable', de: 'Renderer nicht verfügbar' },
    'monitor.takeOff':       { pl: 'ŚCIĄGNIJ (TAKE OFF)', en: 'TAKE OFF', de: 'TAKE OFF' },
    'monitor.takeOn':        { pl: 'WEJDŹ (TAKE)', en: 'TAKE ON', de: 'TAKE ON' },
    'monitor.onAirZeroLayers': { pl: 'NA ŻYWO: 0 WARSTW', en: 'ON AIR: 0 LAYERS', de: 'ON AIR: 0 EBENEN' },
    'monitor.onAirActiveLayers': { pl: 'NA ŻYWO: {0} AKTYWNE', en: 'ON AIR: {0} ACTIVE', de: 'ON AIR: {0} AKTIV' },

    // ── Settings (JS) ──
    'settings.noGraphicsInBank': { pl: 'Brak grafik w Banku Grafik', en: 'No graphics in Graphics Bank', de: 'Keine Grafiken in der Grafikbank' },

    // ── Utils (animation types) ──
    'anim.easingSpring':     { pl: 'Spring — z odbiciem', en: 'Spring — with bounce', de: 'Spring — mit Abprall' },
    'anim.slide':            { pl: '⇔ Przesunięcie (Slide)', en: '⇔ Slide', de: '⇔ Gleiten (Slide)' },
    'anim.fade':             { pl: '◐ Zanikanie (Fade)', en: '◐ Fade', de: '◐ Einblenden (Fade)' },
    'anim.zoom':             { pl: '⊕ Zoom', en: '⊕ Zoom', de: '⊕ Zoom' },
    'anim.wipe':             { pl: '▶ Wipe', en: '▶ Wipe', de: '▶ Wipe' },
    'anim.none':             { pl: '✕ Brak (Cut)', en: '✕ None (Cut)', de: '✕ Keine (Cut)' },

    // ── Shotbox (JS) ──
    'bank.thisGraphic':      { pl: 'tę grafikę', en: 'this graphic', de: 'diese Grafik' },

    // ── HTML static extras ──
    'ui.onAirPrefix':        { pl: 'NA ŻYWO:', en: 'ON AIR:', de: 'ON AIR:' },
    'ui.connectionStatus':   { pl: 'Status połączenia: łączenie...', en: 'Connection status: connecting...', de: 'Verbindungsstatus: verbinden...' },
    'ui.collapseExpand':     { pl: 'Zwiń / Rozwiń', en: 'Collapse / Expand', de: 'Ein-/Ausklappen' },
    'ui.toggleSafeArea':     { pl: 'Przełącz bezpieczny obszar EBU', en: 'Toggle EBU safe area', de: 'EBU-Sicherheitsbereich umschalten' },
    'wysiwyg.textColor':     { pl: 'Kolor tekstu', en: 'Text color', de: 'Textfarbe' },
    'wysiwyg.highlightColor': { pl: 'Kolor tła tekstu (Highlight)', en: 'Text highlight color', de: 'Texthervorhebungsfarbe' },
    'wysiwyg.bgColor':       { pl: 'Kolor tła podglądu', en: 'Preview background color', de: 'Vorschau-Hintergrundfarbe' },
    'wysiwyg.bgLabel':       { pl: 'Tło', en: 'BG', de: 'HG' },
    'wysiwyg.previewNote':   { pl: 'Zmiany występują w podglądzie • Na antenie pojawi się po kliknięciu TAKE', en: 'Changes appear in preview • Will go on air after clicking TAKE', de: 'Änderungen erscheinen in der Vorschau • Wird nach Klick auf TAKE gesendet' },
    'wysiwyg.livePreview':   { pl: 'Podgląd na żywo', en: 'Live Preview', de: 'Live-Vorschau' },
};

// ── Current language ──
let _lang = (() => {
    const stored = localStorage.getItem('cg_lang');
    if (stored === 'pl' || stored === 'en' || stored === 'de') return stored;
    return 'pl';
})();

/**
 * Get or set current language.
 * @param {string} [newLang] - 'pl', 'en', or 'de'
 * @returns {string} current language code
 */
export function lang(newLang) {
    if (newLang && (newLang === 'pl' || newLang === 'en' || newLang === 'de')) {
        _lang = newLang;
        localStorage.setItem('cg_lang', newLang);
        applyStaticTranslations();
    }
    return _lang;
}

/**
 * Translate a key with optional interpolation.
 * @param {string} key - Translation key (e.g. 'bank.delete')
 * @param {...string} args - Replacement values for {0}, {1}, etc.
 * @returns {string} Translated string or key if missing
 */
export function t(key, ...args) {
    const entry = translations[key];
    if (!entry) return key;
    let str = entry[_lang] || entry['en'] || key;
    args.forEach((val, i) => {
        str = str.replace(`{${i}}`, val);
    });
    return str;
}

/**
 * Apply translations to all elements with data-i18n attribute.
 * Supports: text content, title, placeholder, aria-label via data-i18n-attr.
 */
export function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const attr = el.getAttribute('data-i18n-attr');
        const translated = t(key);
        if (attr) {
            attr.split(',').forEach(a => el.setAttribute(a.trim(), translated));
        } else {
            el.textContent = translated;
        }
    });
    document.documentElement.lang = _lang;
}

/**
 * List of available languages with display names.
 */
export const LANGUAGES = [
    { code: 'pl', name: 'Polski' },
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
];

// ── Auto-detect on first load ──
const saved = localStorage.getItem('cg_lang');
if (saved && (saved === 'pl' || saved === 'en' || saved === 'de')) {
    _lang = saved;
} else {
    const browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
    if (browserLang === 'de') _lang = 'de';
    else if (browserLang === 'en') _lang = 'en';
    else _lang = 'pl';
}
