window.$ = window.jQuery = require('jquery');
const {ipcRenderer} = require('electron');
const nextMod = {
    'Suddendeath': 'Perfect',
    'Perfect': 'Suddendeath-lastmod',
    'Doubletime': 'Nightcore',
    'Nightcore': 'Doubletime-lastmod'
};
const nextId = {
    'SuddenDeath': 'Perfect',
    'Perfect': 'SuddenDeath-lastmod',
    'DoubleTime': 'Nightcore',
    'Nightcore': 'DoubleTime-lastmod'
};
let curGamemode = 'standard';

$(document).on('change', 'select', setGamemode);

$(document).on('click', '.mods', function (e) {
    e.preventDefault();
    let elem = $(this);
    let nextModName = nextMod[this.value];
    let nextModId = nextId[this.id];

    if(!elem.hasClass('selected')) {
        elem.addClass('selected');

        return;
    }

    if(nextModName && nextModId) {
        let split = nextModName.split('-');
        let splitId = nextModId.split('-');
        if(split[1]) {
            elem.removeClass('selected');
        }
        this.value = split[0];
        this.id = splitId[0];
    } else {
        elem.removeClass('selected');
    }
});

$(document).on('click', '#sendModInfo', function (e) {
    e.preventDefault();
    let modlist = [];
    $('.selected').each(function (i, elem) {
        modlist.push(elem.id);
    });
    ipcRenderer.send('modsResult', modlist)
});

setGamemode();

function setGamemode(){
    if(this.options){
        curGamemode = this.options[this.selectedIndex].value;
    }

    let modButtons = $('.mods');

    modButtons.hide();
    $('.selected').removeClass('selected');
    modButtons.each(function (i, elem) {
        if(elem.classList.length === 1) {
            $(elem).show();
        }
    });
    $('.' + curGamemode).show();
}
