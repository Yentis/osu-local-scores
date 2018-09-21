const osuReplayParser = require('osureplayparser');
const fs = require('fs');
const processed = require('./processedReplays.json');
const settingsFile = require('./settings.json');
const dataPath = '/Data/r/';
const readline = require('readline');
const https = require('https');
const {app, BrowserWindow, Menu, ipcMain} =  require('electron');
const url = require('url');
const path = require('path');
let processedReplays, settings;

function getReplayData(path){
    let fullPath = settings.osuPath + dataPath + path;
    let replay = osuReplayParser.parseReplay(fullPath);
    return new Promise(resolve => {
        resolve(getRelevantData(replay));
    });
}

function getRelevantData(replay){
    return new Promise(resolve => {
        let accuracy = (((replay.number_300s) * 300 + (replay.number_100s) * 100 + (replay.number_50s) * 50)/((replay.number_300s+replay.number_100s+replay.number_50s+replay.misses)*300));

        https.get('https://osu.ppy.sh/api/get_beatmaps?k=' + settings.apikey + '&h=' + replay.beatmapMD5, (resp) => {
            let data = '';

            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                let beatmapdata = JSON.parse(data)[0];

                resolve({
                    beatmapdata: beatmapdata,
                    accuracy: accuracy,
                    number_300s: replay.number_300s,
                    number_100s: replay.number_100s,
                    number_50s: replay.number_50s,
                    misses: replay.misses,
                    score: replay.score,
                    max_combo: replay.max_combo,
                    timestamp: replay.timestamp,
                    mods: replay.mods,
                    mode: replay.gameMode
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
                let promise = asyncForEach(files, async (file, index) => {
                    if(cancelled) {
                        throw 'Cancelled';
                    }

                    if(file.endsWith('osr') && !processedReplays[file]) {
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
                    json = JSON.stringify(processedReplays);

                    fs.writeFile('processedReplays.json', json, 'utf8', function () {
                        resolve('Your replays have been processed successfully.');
                    }); // write it back
                }).catch(function () {
                    resolve('Replay processing has been cancelled.');
                });
            };

            start();
        });
    });
}

fs.readFile('processedReplays.json', 'utf8', function readFileCallback(err, data){
    if (err){
        console.log(err);
    } else {
        processedReplays = JSON.parse(data);
        fs.readFile('settings.json', 'utf8', function readFileCallback(err, data){
            if (err){
                console.log(err);
            } else {
                settings = JSON.parse(data);
            }
        });
    }
});

let mainWindow, processReplayWindow, settingsWindow;

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
    let replayList = [];

    for (let key in processedReplays) {
        if (processedReplays.hasOwnProperty(key)) {
            let currentReplay = processedReplays[key];

            if(currentReplay.beatmapdata) {
                let beatmapid = currentReplay.beatmapdata.beatmap_id;

                if(!replayList[beatmapid] || (replayList[beatmapid] && replayList[beatmapid].score < currentReplay.score)) {
                    replayList[beatmapid] = currentReplay;
                    replayList[beatmapid]['name'] = currentReplay.beatmapdata.artist + ' - ' + currentReplay.beatmapdata.title + ' [' + currentReplay.beatmapdata.version + ']';
                    replayList[beatmapid]['grade'] = calcGrade(currentReplay);
                }
            }
        }
    }

    mainWindow.webContents.send('replaylist', replayList);
}

function calcGrade(replay){
    let amountOfNotes = replay.number_300s + replay.number_100s + replay.number_50s + replay.misses;
    let percent300 = replay.number_300s / amountOfNotes;
    let percent50 =  replay.number_50s / amountOfNotes;

    if(replay.accuracy == 1) {
        return 5;
    } else if(percent300 > 0.9 && percent50 < 0.01 && replay.misses == 0) {
        return 4;
    } else if((percent300 > 0.8 && replay.misses == 0) || percent300 > 0.9) {
        return 3;
    } else if((percent300 > 0.7 && replay.misses == 0) || percent300 > 0.8) {
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

    processReplayWindow.webContents.once('dom-ready', function () {
        (async () => {
            mainWindow.webContents.send('message', await processReplays(token));
            processReplayWindow.close();
            makeReplayList();
        })();
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

    settingsWindow.webContents.once('dom-ready', function () {
        settingsWindow.webContents.send('settings', settings);
    });

    settingsWindow.on('close', function () {
        settingsWindow = null;
    });
}

let token = {};

ipcMain.on('replays:cancel', function (e) {
    token.cancel();
});

ipcMain.on('settings', function (e, newSettings) {
    settings = newSettings;
    fs.writeFile('settings.json', JSON.stringify(newSettings), 'utf8', function () {
        settingsWindow.close();
    });
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

if(process.platform == 'darwin') {
    mainMenuTemplate.unshift({});
}

if(process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Developer Tools',
        submenu: [
            {
                label: 'Toggle DevTools',
                accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
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

app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});
