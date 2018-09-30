const electron = require('electron');
const {ipcRenderer} = electron;
const {dialog} = electron.remote;
let saveButton = document.getElementById('save');

document.getElementById('settings').addEventListener('submit', function (e) {
    e.preventDefault();
    let osuPath = document.getElementById('osuPath').value;

    document.getElementById('message').innerHTML = '';
    saveButton.disabled = true;
    ipcRenderer.send('settings', {osuPath: osuPath});
});

document.getElementById('btn-chooseFolder').addEventListener('click', function () {
    dialog.showOpenDialog({properties: ['openDirectory']},(dirname) => {
        if(dirname !== undefined) {
            document.getElementById('osuPath').value = dirname[0];
        }
    })
});

ipcRenderer.on('unlock', function (e, val) {
    saveButton.disabled = val;
    document.getElementById('message').innerHTML = 'Settings saved.';
});

ipcRenderer.on('settings', function (e, settings) {
    if(settings.osuPath) {
        document.getElementById('osuPath').value = settings.osuPath;
    }
});
