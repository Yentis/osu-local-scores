const electron = require('electron');
const {ipcRenderer} = electron;
let curPercentage = 0;
let curReplay = '';

ipcRenderer.on('error', function (e, message) {
    document.getElementById('errorMessage').innerHTML = message;
});

ipcRenderer.on('replay', function (e, replay) {
    if(curReplay !== replay.name) {
        document.getElementById('currentReplay').innerHTML = replay.name;
    }
    if(curPercentage !== replay.percentage) {
        document.getElementById('progressBar').value = replay.percentage;
    }
});

document.getElementById('cancel').addEventListener('click', function (e) {
    e.preventDefault();
    ipcRenderer.send('replays:cancel');
});