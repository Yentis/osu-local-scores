# osu! Score Overview

Process local replays and present them in a filterable way

## Features

- Filtering, search & sort many different fields
- PP values & max combo
- Auto refreshes when you set a score in osu! (may take 2-3 min)

## Building
```bash
yarn install
yarn dev::electron
yarn build::electron
```

After building you will need to do the following steps (suggestions welcome):
- Move the .wasm file from "dist/electron/osu! Score Overview-win32-x64/resources/app" to "dist/electron/osu! Score Overview-win32-x64/resources/app/js"
- Edit "dist/electron/osu! Score Overview-win32-x64/resources/app/js/496.js" and change "js/vendor.js" to "vendor.js"

## Libraries

https://github.com/negamartin/osu-db  
https://github.com/MaxOhn/rosu-pp
