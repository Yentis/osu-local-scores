const fs = require('fs');
const https = require('https');
const {app, BrowserWindow, Menu, ipcMain} =  require('electron');
const url = require('url');
const path = require('path');
const Store = require('electron-store');
const store = new Store();
const edge = require('electron-edge-js');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const {Hello} = require('./build/Release/addon');
const modTable = {
    "Easy":"EZ",
    "NoFail":"NF",
    "HalfTime":"HT",
    "HardRock":"HR",
    "Nightcore": "NC",
    "DoubleTime":"DT",
    "Hidden":"HD",
    "Flashlight":"FL",
    "SpunOut":"SO"
};
let csharpPath, processedReplays, settings, globalError, getScores;

console.log(Hello());

//process.env.NODE_ENV = 'production';

if(process.env.NODE_ENV === 'production') {
    csharpPath = path.resolve(__dirname, '..', 'csharp');
} else {
    csharpPath = path.resolve(__dirname, 'assets', 'csharp');
}

try {
    getScores = edge.func({
        source: csharpPath + '/ScoresDb.cs',
        references: [csharpPath + '/osu-database-reader.dll', csharpPath + '/osu.Shared.dll', csharpPath + '/OppaiSharp.dll']
    });
} catch(ex) {
    globalError = ex;
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

function processReplayData(map) {
    const start = async () => {
        asyncForEach(map.replays, async (data) => {
            let accuracy = getAccuracy(data);
            let pp = await getPP(map.path, data, accuracy);

            processedReplays[data.ReplayHash] = {
                replayHash: data.ReplayHash,
                beatmap_id: map.beatmap_id.toString(),
                beatmapset_id: map.beatmapset_id.toString(),
                accuracy: accuracy,
                grade: getGrade(data, accuracy),
                misses: data.CountMiss,
                score: data.Score,
                timestamp: new Date(data.TimePlayed).toLocaleDateString('nl-NL'),
                mods: data.Mods.split(', '),
                mode: data.GameMode,
                name: map.name,
                combo: parseInt(data.Combo),
                max_combo: map.max_combo > 0 ? Math.max(parseInt(map.max_combo), parseInt(data.Combo)) : 0,
                pp: pp
            };
        }).catch(function (err) {
            console.log(err);
        });
    };
    start();
}

function getPP(path, data, accuracy){
    let mods = modsConverter(data.Mods) + ' ';

    (async () => {
        return await runOppai('oppai ' + '"' + path + '"' + mods + accuracy + '%');
    })();
}

function modsConverter(mods){
    let modArray = mods.split(', ');
    let convertedString = '';

    modArray.forEach(function (mod) {
        let convertedMod = modTable[mod];

        if(convertedMod) {
            convertedString += convertedMod;
        }
    });

    if(convertedString.length > 0) {
        convertedString = ' +' + convertedString;
    }

    return convertedString;
}

async function runOppai(args){
    const {stdout, stderr} = await exec(args);

    if(stderr) {
        console.log(stderr);
        return;
    }

    let ppLine = stdout.split('\n');
    let pp = ppLine[ppLine.length-3].split(' ');
    return(pp[0]);
}

function getAccuracy(replay) {
    let accuracy = 0;

    switch(replay.GameMode) {
        case 'Standard':
            accuracy = ((replay.Count300) * 300 + (replay.Count100) * 100 + (replay.Count50) * 50)/((replay.Count300+replay.Count100+replay.Count50+replay.CountMiss)*300);
            break;
        case 'Taiko':
            accuracy = (((0.5*replay.Count100) + replay.Count300) / (replay.CountMiss + replay.Count100 + replay.Count300));
            break;
        case 'CatchTheBeat':
            accuracy = ((replay.Count300 + replay.Count100 + replay.Count50) / (replay.CountKatu + replay.CountMiss + replay.Count50 + replay.Count100 + replay.Count300));
            break;
        case 'Mania':
            accuracy = (((50*replay.Count50) + (100*replay.Count100) + (200*replay.CountKatu) + (300*(replay.Count300 + replay.CountGeki))) / (300*(replay.CountMiss + replay.Count50 + replay.Count100 + replay.CountKatu + replay.Count300 + replay.CountGeki)));
            break;
    }

    return parseFloat((accuracy * 100).toFixed(2));
}

function getGrade(replay, accuracy){
    if(accuracy === 100) {
        return 5;
    }

    switch(replay.GameMode) {
        case 'Standard':
            let amountOfNotes = replay.Count300 + replay.Count100 + replay.Count50 + replay.CountMiss;
            let percent300 = replay.Count300 / amountOfNotes;
            let percent50 =  replay.Count50 / amountOfNotes;

            if(percent300 > 0.9 && percent50 < 0.01 && replay.CountMiss === 0) {
                return 4;
            } else if((percent300 > 0.8 && replay.CountMiss === 0) || percent300 > 0.9) {
                return 3;
            } else if((percent300 > 0.7 && replay.CountMiss === 0) || percent300 > 0.8) {
                return 2;
            } else if(percent300 > 0.6) {
                return 1;
            } else {
                return 0;
            }
        case 'Taiko':
        case 'Mania':
            if(accuracy > 95) {
                return 4;
            } else if(accuracy > 90) {
                return 3;
            } else if(accuracy > 80) {
                return 2;
            } else if(accuracy > 70) {
                return 1;
            } else {
                return 0;
            }
        case 'CatchTheBeat':
            if(accuracy > 98) {
                return 4;
            } else if(accuracy > 94) {
                return 3;
            } else if(accuracy > 90) {
                return 2;
            } else if(accuracy > 85) {
                return 1;
            } else {
                return 0;
            }
    }
}

function getData(){
    processedReplays = store.get('processedReplays');
    settings = store.get('settings');

    if(!settings) {
        store.set('settings', {});
        settings = {};
    }

    if(!processedReplays) {
        store.set('processedReplays', {});
        processedReplays = {};
    }
}

getData();

let mainWindow, processReplayWindow, settingsWindow, errorWindow, modsWindow;
let token = {};

app.on('ready', function () {
    if(globalError) {
        createErrorWindow();
    } else {
        mainWindow = new BrowserWindow({
            width: 1450,
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
    }
});

function makeReplayList(){
    if (!processedReplays || Object.keys(processedReplays).length === 0 && processedReplays.constructor === Object) {
        mainWindow.webContents.send('message', 'No replays found, please process them first. (File -> Process Replays)');
    } else {
        let replayList = [];

        for (let key in processedReplays) {
            if (processedReplays.hasOwnProperty(key)) {
                let currentReplay = processedReplays[key];
                let beatmapid = currentReplay.beatmap_id;

                if (!replayList[beatmapid] || (replayList[beatmapid] && replayList[beatmapid].score < currentReplay.score)) {
                    replayList[beatmapid] = currentReplay;
                }
            }
        }

        mainWindow.webContents.send('replaylist', replayList);
    }
}

function createErrorWindow(){
    errorWindow = new BrowserWindow({
        width: 300,
        height: 200,
        title: 'Error!'
    });

    errorWindow.setMenu(null);

    errorWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'errorWindow.html'),
        protocol: 'file:',
        slashes: true
    }));

    errorWindow.on('closed', function () {
        app.quit();
    });

    errorWindow.webContents.once('dom-ready', function () {
        errorWindow.webContents.send('message', JSON.stringify(globalError));
    });
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
        if(!settings.osuPath) {
            createSettingsWindow();
            processReplayWindow.close();
        } else {
            getScores(settings.osuPath, function (error, result) {
                if(error) {
                    globalError = error;
                    createErrorWindow();
                    processReplayWindow.close();
                } else {
                    processedReplays = {};

                    let testdata = [];

                    for(let i = 0; i < 10; i++) {
                        testdata[i] = result[i];
                    }

                    const start = async () => {
                        asyncForEach(testdata, async (file) => {
                            processReplayData(file);
                        }).then(function () {
                            console.log(processedReplays);
                        }).catch(function (err) {
                            console.log(err);
                        });
                    };
                    start();

                    /*result.forEach(function (map) {
                        processReplayData(map);
                    });*/

                    //store.set('processedReplays', processedReplays);

                    mainWindow.webContents.send('message', 'Your replays have been processed successfully.');
                    processReplayWindow.close();
                    makeReplayList();
                }
            });
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

function createModsWindow(){
    modsWindow = new BrowserWindow({
        width: 550,
        height: 250,
        title: 'Mods'
    });

    modsWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'modsWindow.html'),
        protocol: 'file:',
        slashes: true
    }));
    modsWindow.setMenu(null);

    modsWindow.webContents.once('dom-ready', function () {

    });

    modsWindow.on('close', function () {
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

ipcMain.on('mods', function (e) {
    createModsWindow();
});

ipcMain.on('modsResult', function (e, modsResult) {
    mainWindow.webContents.send('modsResult', modsResult);
    modsWindow.close();
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
