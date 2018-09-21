const electron = require('electron');
const {ipcRenderer} = electron;
let saveButton = document.getElementById('save');

document.getElementById('settings').addEventListener('submit', function (e) {
    e.preventDefault();
    let osuPath = document.getElementById('osuPath').value;
    let apikey = document.getElementById('apikey').value;

    saveButton.disabled = true;
    ipcRenderer.send('settings', {osuPath: osuPath, apikey: apikey});
});

ipcRenderer.on('unlock', function (e, val) {
    saveButton.disabled = val;
});

ipcRenderer.on('settings', function (e, settings) {
    document.getElementById('osuPath').value = settings.osuPath;
    document.getElementById('apikey').value = settings.apikey;
});
