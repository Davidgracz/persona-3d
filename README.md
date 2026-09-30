# Persona 3D — figurka ze zdjęcia

Kompletna strona do zamawiania cyfrowej figurki 3D ze zdjęcia. Klient wybiera styl realistyczny albo chibi, dodaje zdjęcia, przechodzi przez płatność BLIK, a po wygenerowaniu ogląda model 3D i pobiera pliki GLB oraz STL.

Ta paczka ma bezpieczny lokalny tryb testowy płatności. Nie pobiera pieniędzy i nie wymaga konta Stripe. Generowanie modelu pozostaje prawdziwe i wymaga własnego klucza `MESHY_API_KEY`.

## Wymagania

- Windows 10/11
- Node.js `22.13.0` lub nowszy
- co najmniej 4 GB wolnego miejsca na dysku
- klucz API Meshy, jeżeli chcesz uruchomić rzeczywiste generowanie 3D

Nie uruchamiaj `corepack enable`, jeżeli PowerShell zwraca błąd `EPERM`. W poleceniach poniżej używamy `npx.cmd`, dzięki czemu nie trzeba zmieniać polityki wykonywania skryptów PowerShell.

## Pierwsze uruchomienie na Windows — krok po kroku

Rozpakuj paczkę najlepiej do krótkiej ścieżki, na przykład `C:\persona-3d`. Następnie otwórz ten folder w PowerShellu.

1. Zainstaluj zależności:

```powershell
npx.cmd -y pnpm@11.25.0 install --frozen-lockfile
```

2. Utwórz lokalny plik ustawień:

```powershell
Copy-Item .dev.vars.example .dev.vars
notepad .dev.vars
```

W pliku `.dev.vars` zostaw:

```dotenv
DUMMY_PAYMENTS=true
```

Zastąp `tu_wklej_klucz_meshy` swoim kluczem:

```dotenv
MESHY_API_KEY=msy_twoj_prawdziwy_klucz
```

3. Zbuduj projekt. Ten krok tworzy lokalną konfigurację bazy D1:

```powershell
npx.cmd -y pnpm@11.25.0 run build
```

4. Tylko przy pierwszym uruchomieniu utwórz lokalne tabele:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fast_shocker.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_milky_rhino.sql
```

Nie powtarzaj punktu 4 przy każdym uruchomieniu. Komunikat, że tabela już istnieje, oznacza, że migracja została wcześniej wykonana.

5. Uruchom stronę:

```powershell
npx.cmd -y pnpm@11.25.0 run dev
```

Otwórz adres pokazany w terminalu, zwykle [http://localhost:5173](http://localhost:5173).

## Jak przetestować dummy BLIK

1. Wejdź na `/generator`.
2. Wybierz styl i dodaj zdjęcie lub zdjęcia.
3. Podaj e-mail, zaznacz zgodę i kliknij przycisk BLIK.
4. Na żółto oznaczonym ekranie testowym wpisz kod `123456`.
5. Kliknij „Symuluj udaną płatność”.
6. Po potwierdzeniu strona uruchomi prawdziwe generowanie w Meshy, a następnie pokaże podgląd 3D oraz pobieranie GLB i STL.

Tryb dummy jest dodatkowo ograniczony po stronie serwera do lokalnych hostów: `localhost`, `127.0.0.1`, `0.0.0.0` i `terminal.local`. Nie da się go włączyć na publicznej domenie samym parametrem w adresie.

## Przejście na prawdziwe płatności

W publicznym środowisku ustaw:

```dotenv
DUMMY_PAYMENTS=false
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
MESHY_API_KEY=msy_...
```

Stripe Checkout jest ograniczony do metody `blik`. Webhook Stripe potwierdza płatność przed przekazaniem zdjęć do Meshy.

## Najczęstsze problemy

### `ENOSPC: no space left on device`

Na dysku zabrakło miejsca. Usuń niepotrzebne stare kopie projektu wraz z ich folderami `node_modules` i `.sites-runtime`, zwolnij co najmniej 4 GB, a potem ponownie wykonaj instalację w tej paczce.

### `npx.ps1 cannot be loaded because running scripts is disabled`

Używaj `npx.cmd`, dokładnie jak w poleceniach powyżej. Nie musisz zmieniać `ExecutionPolicy`.

### `read ECONNRESET`

Połączenie zostało przerwane podczas pobierania lub budowania. Uruchom ponownie tę samą komendę. Menedżer pakietów wykorzysta już pobrane pliki.

### BLIK działa, ale generowanie nie startuje

Sprawdź, czy `.dev.vars` zawiera prawidłowy `MESHY_API_KEY`, a po zmianie pliku zrestartuj serwer developerski.

## Przydatne polecenia

```powershell
npx.cmd -y pnpm@11.25.0 run dev
npx.cmd -y pnpm@11.25.0 run build
npx.cmd -y pnpm@11.25.0 run lint
```

Zdjęcia są przechowywane w lokalnym R2 tylko na potrzeby zadania. Po pomyślnym zapisaniu gotowych modeli zdjęcia źródłowe są usuwane przez pipeline.
