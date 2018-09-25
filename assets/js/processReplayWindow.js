const electron = require('electron');
const {ipcRenderer} = electron;

ipcRenderer.on('error', function (e, message) {
    document.getElementById('errorMessage').innerHTML = message;
});

document.getElementById('cancel').addEventListener('click', function (e) {
    e.preventDefault();
    ipcRenderer.send('replays:cancel');
});
