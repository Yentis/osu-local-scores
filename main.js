const url = require('url');
const path = require('path');
const edge = require('electron-edge-js');
const EventEmitter = require('events');
const {GetPP} = require(path.resolve(__dirname, 'assets', 'addon', 'build', 'Release', 'ppCalculator'));
const {execSync} = require('child_process');
const cluster = require('cluster');
const numWorkers = 1;

class DataEmitter extends EventEmitter {}
const dataEmitter = new DataEmitter();

const modTable = {
    "None": 0,
    "NoFail": 1<<0,
    "Easy": 1<<1,
    "TouchDevice": 1<<2,
    "Hidden": 1<<3,
    "HardRock": 1<<4,
    "DoubleTime": 1<<6,
    "HalfTime": 1<<8,
    "Nightcore": 1<<9,
    "Flashlight": 1<<10,
    "SpunOut": 1<<12
};

const modText = {
    "None": "NM",
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

let pressedCancel = false;
let csharpPath, settings, globalError, getScores;

if(cluster.isMaster) {
    const {app, BrowserWindow, Menu, ipcMain} =  require('electron');
    const Store = require('electron-store');
    const store = new Store();
    let processedReplays;

    //process.env.NODE_ENV = 'production';

    if(process.env.NODE_ENV === 'production') {
        csharpPath = path.resolve(__dirname, '..', 'app.asar.unpacked', 'assets', 'csharp');
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

        sendReplayList();
    }

    let mainWindow, processReplayWindow, settingsWindow, errorWindow, modsWindow;

    app.on('ready', function () {
        if(globalError) {
            createErrorWindow();
        } else {
            mainWindow = new BrowserWindow({
                width: 1380,
                height: 600
            });

            mainWindow.loadURL(url.format({
                pathname: path.join(__dirname, 'mainWindow.html'),
                protocol: 'file:',
                slashes: true
            }));

            mainWindow.webContents.once('dom-ready', getData);

            mainWindow.on('closed', function () {
                app.quit();
            });

            const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
            Menu.setApplicationMenu(mainMenu);
        }
    });

    function sendReplayList(){
        if (!processedReplays || Object.keys(processedReplays).length === 0 && processedReplays.constructor === Object) {
            mainWindow.webContents.send('message', 'No replays found, please process them first. (File -> Process Replays)');
        } else {
            mainWindow.webContents.send('replaylist', processedReplays);
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

    function createProcessReplayWindow(deep){
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
                        pressedCancel = false;
                        startWorkers(result, deep);
                    }
                });
            }
        });

        processReplayWindow.on('close', function () {
            processReplayWindow = null;
        });
    }

    function startWorkers(data, deep){
        let arrays = [], size = data.length / numWorkers;

        while (data.length > 0)
            arrays.push(data.splice(0, size));

        for(let i = 0; i < numWorkers; i++) {
            let worker = cluster.fork();

            worker.send({mapList: arrays[i], deep: deep, replays: processedReplays});
        }

        for (const id in cluster.workers) {
            cluster.workers[id].on('message', (message) => {
                let receivedReplays = message.replays;

                if(!receivedReplays) {
                    processReplayWindow.webContents.send('progress', message);
                } else {
                    processedReplays = receivedReplays;
                    dataEmitter.emit('done');
                }
            });
        }
    }

    dataEmitter.on('done', function () {
        store.set('processedReplays', processedReplays);
        if(pressedCancel) {
            mainWindow.webContents.send('message', 'Cancelled processing.');
        } else {
            mainWindow.webContents.send('message', 'Your replays have been processed successfully.');
        }
        processReplayWindow.close();
        sendReplayList();
    });

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

    ipcMain.on('cancelled', function (e) {
        pressedCancel = true;
    });

    const mainMenuTemplate = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Process replays',
                    click(){
                        createProcessReplayWindow(false);
                    }
                },
                {
                    label: 'Reprocess replays',
                    click(){
                        createProcessReplayWindow(true);
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
                    accelerator: 'Ctrl+Q',
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
} else {
    let processedReplays;

    process.on('message', (msg) => {
        processedReplays = msg.replays;

        msg.mapList.forEach(function (map, index) {
            processReplayData(map, msg.deep);
            process.send({index: index, total: msg.mapList.length});
        });

        process.send({replays: processedReplays});
        process.exit();
    });

    function modsToBit(mods){
        let modArray = mods.split(', ');
        let modList = 0;

        modArray.forEach(function (mod) {
            let convertedMod = modTable[mod];

            if(convertedMod) {
                modList ^= convertedMod;
            }
        });

        return modList;
    }

    function modsToText(mods){
        let modArray = mods.split(', ');
        let modList = '';

        modArray.forEach(function (mod) {
            let convertedMod = modText[mod];

            if(convertedMod) {
                modList += convertedMod;
            }
        });

        return modList;
    }

    function oppaiCmd(cmd){
        let stdout = execSync(cmd).toString();

        let ppLine = stdout.split('\n');
        let pp = ppLine[ppLine.length-3].split(' ')[0];
        let max_combo = ppLine[ppLine.length-4].split(' ')[1].split('/')[0];

        return [pp, max_combo];
    }

    function cmdBuilder(path, mods, count100, count50, countmiss, combo){
        return 'oppai "' + path + '" +' + mods + ' ' + count100 + 'x100 ' + count50 + 'x50 ' + countmiss + 'xmiss ' + combo + 'x';
    }

    function processReplayData(map, deep) {
        map.replays.forEach(function (data) {
            if(!deep && processedReplays[data.ReplayHash]) {
                return;
            }

            let accuracy = getAccuracy(data);
            let oppaiData = getOppaiData(map.path, data.Mods, data.Combo, data.Count100, data.Count50, data.CountMiss, data.GameMode);
            let combo = data.Combo;

            //if combo is somehow larger than max combo let's just assume that our combo is an FC (problem with oppai-ng)
            if(oppaiData[1] !== 0 && combo > oppaiData[1]) {
                oppaiData[1] = combo;
            }

            processedReplays[data.ReplayHash] = {
                identifier: map.path.split('Songs\\')[1].replace(/ /g, ''),
                replayHash: data.ReplayHash,
                beatmap_id: map.beatmap_id.toString(),
                beatmapset_id: map.beatmapset_id,
                accuracy: accuracy,
                grade: getGrade(data, accuracy),
                misses: data.CountMiss,
                score: data.Score,
                timestamp: new Date(data.TimePlayed).toLocaleDateString('nl-NL'),
                mods: data.Mods.split(', '),
                mode: data.GameMode,
                name: map.name,
                combo: data.Combo,
                max_combo: oppaiData[1],
                pp: oppaiData[0],
                max_pp: oppaiData[2]
            };
        });
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

    function getOppaiData(path, mods, combo, count100, count50, countmiss, gamemode){
        let pp = 0;
        let max_combo = 0;
        let max_pp = 0;

        if(gamemode === 'Standard') {
            let modBits = modsToBit(mods);
            let oppaiData = GetPP(path, modBits, combo, count100, count50, countmiss);

            if(!Array.isArray(oppaiData)) {
                console.log('Failed to get oppaiData from library.');
                let textMods = modsToText(mods);
                oppaiData = oppaiCmd(cmdBuilder(path, textMods, combo, count100, count50, countmiss));
            }

            pp = oppaiData[0];
            max_combo = oppaiData[1];
            max_pp = oppaiData[2];
        }

        return [pp, max_combo, max_pp];
    }
}