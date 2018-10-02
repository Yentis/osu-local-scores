const url = require('url');
const path = require('path');
const edge = require('electron-edge-js');
const EventEmitter = require('events');
const {GetPP} = require(path.resolve(__dirname, 'assets', 'addon', 'build', 'Release', 'ppCalculator'));
const {fork} = require('child_process');
const {app, BrowserWindow, Menu, ipcMain} =  require('electron');
const Store = require('electron-store');
const store = new Store();

class DataEmitter extends EventEmitter {}
const dataEmitter = new DataEmitter();

let pressedCancel = false;
let processedReplays, csharpPath, settings, globalError, getScores;

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
                    startWorker(result, deep);
                }
            });
        }
    });

    processReplayWindow.on('close', function () {
        processReplayWindow = null;
    });
}

let processProgress = 0;
function startWorker(data, deep, startIndex = 0){
    let worker = fork(path.resolve(__dirname, 'worker.js'));
    worker.send({mapList: data, startIndex: startIndex, deep: deep, replays: processedReplays});

    worker.on('message', (message) => {
        if(!message.done) {
            processReplayWindow.webContents.send('progress', {index: message.index, total: message.total});
            processedReplays = message.replays;
            processProgress = message.index;
        } else {
            processProgress = 0;
            dataEmitter.emit('done', message.failedReplays);
            worker.send('exit');
        }
    });

    worker.on('exit', (code) => {
        //it crashed, create another one
        if(code !== 0) {
            startWorker(data, deep, processProgress+1);
        }
    });
}

dataEmitter.on('done', function (failedReplays) {
    store.set('processedReplays', processedReplays);
    if(pressedCancel) {
        mainWindow.webContents.send('message', 'Cancelled processing.');
    } else if(failedReplays.length > 0) {
        let failString = '\n';

        failedReplays.forEach((replay) => {
            failString += replay + '\n';
        });

        mainWindow.webContents.send('message', 'Some replays failed to calculate: ' + failedReplays);
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
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    });
}
