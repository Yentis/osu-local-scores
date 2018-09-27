const electron = require('electron');
const {ipcRenderer} = electron;

document.getElementById('cancel').addEventListener('click', function (e) {
    e.preventDefault();
    ipcRenderer.send('cancelled');
});

ipcRenderer.on('progress', function (e, data) {
    document.getElementById('currentReplay').innerHTML = 'Progress: ' + data.index + ' of ' + data.total;
    document.getElementById('progressBar').value = document.getElementById('progressBar').value + 1;
});
