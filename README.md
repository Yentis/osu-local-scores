# osu! Score Overview

Process local replays and present them in a filterable way

## Features

- Filter, search & sort many different fields
- PP values & max combo
- Auto refreshes when you set a score in osu! (every 10~ min)

## Download
https://github.com/Yentis/osu-local-scores/releases

## Preview
![Preview](https://i.imgur.com/tg5kU2z.png)

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
