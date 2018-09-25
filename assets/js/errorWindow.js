const electron = require('electron');
const {ipcRenderer} = electron;
const fs = require('fs');

ipcRenderer.on('message', function (e, error) {
    document.getElementById('error').innerHTML = error;
});
