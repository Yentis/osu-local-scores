const osuReplayParser = require('osureplayparser');
const fs = require('fs');
const dataPath = '/Data/r/';
const https = require('https');
const {app, BrowserWindow, Menu, ipcMain} =  require('electron');
const url = require('url');
const path = require('path');
const jsonPath = path.resolve(__dirname, 'assets', 'json');
const csharpPath = path.resolve(__dirname, 'assets', 'csharp');
const Store = require('electron-store');
const store = new Store();
const edge = require('electron-edge-js');
let processedReplays, settings;

process.env.NODE_ENV = 'production';

let test = edge.func({
    source: csharpPath + '/ScoresDb.cs',
    references: [csharpPath + '/osu-database-reader.dll', csharpPath + '/osu.Shared.dll']
});

test('', function (error, result) {
    console.log(result);
});

function getReplayData(path){
    let fullPath = settings.osuPath + dataPath + path;
    let replay = osuReplayParser.parseReplay(fullPath);
    return new Promise(resolve => {
        resolve(getRelevantData(replay));
    });
}

function getRelevantData(replay){
    return new Promise(resolve => {
        let accuracy = (((replay.number_300s) * 300 + (replay.number_100s) * 100 + (replay.number_50s) * 50)/((replay.number_300s+replay.number_100s+replay.number_50s+replay.misses)*300) * 100);

        https.get('https://osu.ppy.sh/api/get_beatmaps?k=' + settings.apikey + '&h=' + replay.beatmapMD5, (resp) => {
            let data = '';

            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                let beatmapdata = JSON.parse(data)[0];
                let name;

                if(beatmapdata) {
                    name = beatmapdata.artist + ' - ' + beatmapdata.title + ' [' + beatmapdata.version + ']';
                }

                resolve({
                    beatmapdata: beatmapdata,
                    accuracy: accuracy,
                    number_300s: replay.number_300s,
                    number_100s: replay.number_100s,
                    number_50s: replay.number_50s,
                    misses: replay.misses,
                    score: replay.score,
                    max_combo: replay.max_combo,
                    timestamp: new Date(replay.timestamp).toLocaleDateString('nl-NL'),
                    mods: replay.mods,
                    mode: replay.gameMode,
                    grade: calcGrade(replay),
                    name: name
                });
            });

        }).on("error", (err) => {
            resolve({error: err.message});
        });
    });
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

async function processReplays(token){
    return new Promise(function(resolve, reject) {
        let json;
        let cancelled = false;

        token.cancel = function () {
            cancelled = true;
        };

        fs.readdir(settings.osuPath + dataPath, (err, files) => {
            const start = async () => {
                asyncForEach(files, async (file, index) => {
                    if(cancelled) {
                        throw 'Cancelled';
                    }

                    if(isUnprocessed(file)) {
                        let replayData = await getReplayData(file);

                        if(replayData) {
                            if(replayData.error){
                                processReplayWindow.webContents.send('error', replayData.error);
                            } else {
                                processedReplays[file] = replayData;
                                let dataToSend = {
                                    name: file.split('-')[0],
                                    percentage: Math.round((index / files.length) * 100)
                                };
                                processReplayWindow.webContents.send('replay', dataToSend);
                            }
                        }
                    }
                }).then(function () {
                    store.set('processedReplays', processedReplays);
                    resolve('Your replays have been processed successfully.');
                }).catch(function () {
                    resolve('Replay processing has been cancelled.');
                });
            };

            start();
        });
    });
}

function isUnprocessed(file){
    return !!(file.endsWith('osr') && !processedReplays[file]);
}

function getData(){
    processedReplays = store.get('processedReplays');
    settings = store.get('settings');

    if(!processedReplays) {
        store.set('processedReplays', {});
        processedReplays = {};
    }

    if(!settings) {
        store.set('settings', {});
        settings = {};
    }
}

getData();

let mainWindow, processReplayWindow, settingsWindow;
let token = {};

app.on('ready', function () {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 600
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file:',
        slashes: true
    }));

    mainWindow.on('closed', function () {
        app.quit();
    });

    mainWindow.webContents.once('dom-ready', makeReplayList);

    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);
});

function makeReplayList(){
    if(Object.keys(processedReplays).length === 0 && processedReplays.constructor === Object) {
        mainWindow.webContents.send('message', 'No replays found, please process them first. (File -> Process Replays)');
    } else {
        let replayList = [];

        (async () => {
            if(await isMissingReplays()) {
                mainWindow.webContents.send('message', 'Unprocessed replays found, please process them. (File -> Process Replays)');
            }

            for (let key in processedReplays) {
                if (processedReplays.hasOwnProperty(key)) {
                    let currentReplay = processedReplays[key];

                    if(currentReplay.beatmapdata) {
                        let beatmapid = currentReplay.beatmapdata.beatmap_id;

                        if(!replayList[beatmapid] || (replayList[beatmapid] && replayList[beatmapid].score < currentReplay.score)) {
                            replayList[beatmapid] = currentReplay;
                        }
                    }
                }
            }

            mainWindow.webContents.send('replaylist', replayList);
        })();
    }
}

function isMissingReplays(){
    return new Promise(function (resolve) {
        fs.readdir(settings.osuPath + dataPath, (err, files) => {
            files.forEach(function (file) {
                if(isUnprocessed(file)) {
                    resolve(true);
                }
            });

            resolve(false);
        });
    });
}

function calcGrade(replay){
    let amountOfNotes = replay.number_300s + replay.number_100s + replay.number_50s + replay.misses;
    let percent300 = replay.number_300s / amountOfNotes;
    let percent50 =  replay.number_50s / amountOfNotes;

    if(replay.accuracy === 100) {
        return 5;
    } else if(percent300 > 0.9 && percent50 < 0.01 && replay.misses === 0) {
        return 4;
    } else if((percent300 > 0.8 && replay.misses === 0) || percent300 > 0.9) {
        return 3;
    } else if((percent300 > 0.7 && replay.misses === 0) || percent300 > 0.8) {
        return 2;
    } else if(percent300 > 0.6) {
        return 1;
    } else {
        return 0;
    }
}

function createProcessReplayWindow(){
    processReplayWindow = new BrowserWindow({
        width: 300,
        height: 200,
        title: 'Processing Replays...'
    });

    processReplayWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'processReplayWindow.html'),
        protocol: 'file:',
        slashes: true
    }));
    processReplayWindow.setMenu(null);

    processReplayWindow.webContents.once('dom-ready', function () {
        if(!settings.osuPath || !settings.apikey) {
            createSettingsWindow();
            processReplayWindow.close();
        } else {
            (async () => {
                mainWindow.webContents.send('message', await processReplays(token));
                processReplayWindow.close();
                makeReplayList();
            })();
        }
    });

    processReplayWindow.on('close', function () {
        processReplayWindow = null;
    });
}

function createSettingsWindow(){
    settingsWindow = new BrowserWindow({
        width: 300,
        height: 200,
        title: 'Settings'
    });

    settingsWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'settingsWindow.html'),
        protocol: 'file:',
        slashes: true
    }));
    settingsWindow.setMenu(null);

    settingsWindow.webContents.once('dom-ready', function () {
        settingsWindow.webContents.send('settings', settings);
    });

    settingsWindow.on('close', function () {
        settingsWindow = null;
    });
}

ipcMain.on('replays:cancel', function (e) {
    token.cancel();
    store.set('processedReplays', processedReplays);
});

ipcMain.on('settings', function (e, newSettings) {
    settings = newSettings;
    store.set('settings', newSettings);
    settingsWindow.webContents.send('unlock', false);
});

const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Process replays',
                click(){
                    createProcessReplayWindow();
                }
            },
            {
                label: 'Settings',
                click(){
                    createSettingsWindow();
                }
            },
            {
                label: 'Quit',
                accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click(){
                    app.quit();
                }
            }
        ]
    }
];

if(process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Developer Tools',
        submenu: [
            {
                label: 'Toggle DevTools',
                accelerator: 'Ctrl+I',
                click(item, focusedWindow){
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    });
}
