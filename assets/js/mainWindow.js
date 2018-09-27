window.$ = window.jQuery = require('jquery');
const {ipcRenderer} = require('electron');
const baseShow = 100;
const grade = {
    5: 'SS',
    4: 'S',
    3: 'A',
    2: 'B',
    1: 'C',
    0: 'D'
};
const mods = {
    "None":"",
    "Easy":"EZ",
    "NoFail":"NF",
    "HalfTime":"HT",
    "HardRock":"HR",
    "SuddenDeath":"SD",
    "Perfect": "PF",
    "DoubleTime":"DT",
    "FadeIn":"FI",
    "Hidden":"HD",
    "Flashlight":"FL",
    "KeyCoop":"Co-op",
    "Random":"Random",
    "Relax":"RX",
    "Relax2":"AP",
    "SpunOut":"SO",
    "ScoreV2":"Score V2",
    "TouchDevice":"Touch Device / No Video",
    "Key1":"1K",
    "Key2":"2K",
    "Key3":"3K",
    "Key4":"4K",
    "Key5":"5K",
    "Key6":"6K",
    "Key7":"7K",
    "Key8":"8K",
    "Key9":"9K"
};
let filters = {
    scoreMin: 0,
    scoreMax: '',
    accuracyMin: 0,
    accuracyMax: '',
    missesMin: 0,
    missesMax: '',
    comboMin: '',
    comboMax: '',
    gradeMin: 'D',
    gradeMax: 'SS',
    mode: '',
    beatmap_id: '',
    mapName: '',
    dateMin: '',
    dateMax: '',
    excludedMods: [],
    includedMods: [],
    ppMin: 0,
    ppMax: '',
    amountToShow: baseShow,
    orderType: 'name',
    orderDirection: 'asc'
};
let replayList, waitingTypeMods;

const numberWithCommas = function(x){
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

function sortList(){
    replayList = replayList.sort(function (a, b) {
        if(filters.orderDirection === 'desc') {
            let c = a;
            a = b;
            b = c;
        }

        if(filters.orderType === 'name' || filters.orderType === 'mode') {
            return a[filters.orderType].localeCompare(b[filters.orderType]);
        } else if(filters.orderType === 'timestamp') {
            return getDate(a[filters.orderType]) - getDate(b[filters.orderType]);
        } else if(filters.orderType === 'combo') {
            let aPercent = a[filters.orderType] / a.max_combo || 0;
            let bPercent = b[filters.orderType] / b.max_combo || 0;

            return aPercent - bPercent;
        } else {
            return a[filters.orderType] - b[filters.orderType];
        }
    });
}

function applyFilters(replay, regexName, regex_id){
    return !!(replay.grade >= gradeToIndex(filters.gradeMin)
        && (filters.gradeMax === '' || replay.grade <= gradeToIndex(filters.gradeMax))
        && (regex_id == null || replay.beatmap_id.match(regex_id))
        && (regexName == null || replay.name.toLowerCase().match(regexName))
        && replay.score >= filters.scoreMin
        && (filters.scoreMax === '' || replay.score <= filters.scoreMax)
        && replay.accuracy >= filters.accuracyMin
        && (filters.accuracyMax === '' || replay.accuracy <= filters.accuracyMax)
        && replay.misses >= filters.missesMin
        && (filters.missesMax === '' || replay.misses <= filters.missesMax)
        && (filters.mode === '' || replay.mode.toLowerCase() === filters.mode.toLowerCase())
        && (filters.dateMin === '' || (getDate(replay.timestamp) - new Date(filters.dateMin)) >= 0)
        && (filters.dateMax === '' || (getDate(replay.timestamp) - new Date(filters.dateMax)) <= 0)
        && (filters.excludedMods.length === 0 || !hasMod(filters.excludedMods, replay.mods))
        && (filters.includedMods.length === 0 || hasMod(filters.includedMods, replay.mods))
        && (filters.ppMax === '' || replay.pp <= filters.ppMax)
        && replay.pp >= filters.ppMin
        && (filters.comboMax === '' || (replay.max_combo > 0 ? (replay.combo / replay.max_combo) * 100 : parseInt(filters.comboMax) + 1) <= parseInt(filters.comboMax))
        && (filters.comboMin === '' || (replay.max_combo > 0 ? (replay.combo / replay.max_combo) * 100 : parseInt(filters.comboMin) - 1) >= parseInt(filters.comboMin)));
}

function hasMod(source, target) {
    let result = false;

    source.forEach(function (mod) {
        if(target.includes(mod)) {
            result = true;
        }
    });

    return result;
}

function addHtml(replay) {
    let html = '';
    html += '<tr hidden style="border: 2px solid;">';
    html += '<td><img src="http://b.ppy.sh/thumb/' + replay.beatmapset_id + '.jpg" height="60"></td>';
    html += '<td><a href="osu://b/' + replay.beatmap_id + '">' + replay.name + '</a></td>';
    html += '<td>' + replay.mode + '</td>';
    html += '<td>' + replay.beatmap_id + '</td>';
    html += '<td>' + numberWithCommas(replay.score) + '</td>';
    html += '<td>' + grade[replay.grade] + '</td>';
    html += '<td>' + replay.accuracy + '%</td>';
    html += '<td>' + replay.misses + '</td>';
    html += '<td>' + replay.combo + '/' + (replay.max_combo === 0 ? '?' : replay.max_combo) + '</td>';
    html += '<td>' + getModString(replay) + '</td>';
    html += '<td style="width: 100px">' + replay.timestamp + '</td>';
    html += '<td>' + replay.pp + '</td>';
    html += '</tr>';
    return html;
}

function getModString(replay) {
    let modString = '';

    replay.mods.forEach(function (mod, i) {
        modString += mods[mod];

        if(i < replay.mods.length - 1) {
            modString += ', ';
        }
    });

    return modString;
}

function updateReplayList(){
    let html = '';

    filters.amountToShow = baseShow;
    sortList();

    replayList.forEach(function (replay) {
        let regexName, regex_id;

        if(filters.mapName !== '') {
            regexName = new RegExp('.*' + filters.mapName.toLowerCase() + '.*');
        }

        if(filters.beatmap_id !== '') {
            regex_id = new RegExp('.*' + filters.beatmap_id + '.*');
        }

        if(applyFilters(replay, regexName, regex_id)) {
            html += addHtml(replay);
        }
    });

    $('tr:not(.originalTable)').remove();
    $('#replayTable').append(html);
    unhideElements();
}

function unhideElements(){
    let replayTable = $('#replayTable');
    let origTableLength = $('.originalTable').length;
    let replayElements = replayTable[0].children[0].children;
    let showAmount = Math.min(filters.amountToShow, replayElements.length - origTableLength);

    $('#showmore').remove();
    for(let i = 0; i < origTableLength + showAmount; i++) {
        let elem = replayElements[i];
        elem.removeAttribute('hidden');
    }

    if(filters.amountToShow < replayElements.length) {
        replayTable.append('<a id="showmore" href="#">Show more</a>');
    }

    $('#showamount').html('Showing ' + showAmount + ' of ' + (replayElements.length - origTableLength));
}

function gradeToIndex(letter){
    for (let key in grade) {
        if (grade.hasOwnProperty(key)) {
            if(grade[key] === letter) {
                return key;
            }
        }
    }

    return null;
}

function getDate(dateString){
    let dateArray = dateString.split('-');

    return new Date(dateArray[2], dateArray[1]-1, dateArray[0]);
}

$(document).on('click', '#includeMods', function (e) {
    e.preventDefault();
    waitingTypeMods = 'includedMods';
    ipcRenderer.send('mods', '');
});

$(document).on('click', '#excludeMods', function (e) {
    e.preventDefault();
    waitingTypeMods = 'excludedMods';
    ipcRenderer.send('mods', '');
});

$(document).on('click', '#showmore', function (e) {
    e.preventDefault();
    filters.amountToShow += 100;
    unhideElements();
});

$(document).on('keyup', 'input:not(#dateMin, #dateMax)', function () {
    filters[this.id] = this.value;
    updateReplayList();
});

$(document).on('change', '#dateMin, #dateMax', function () {
    filters[this.id] = this.value;
    updateReplayList();
});

$(document).on('change', 'select', function () {
    filters[this.id] = this.options[this.selectedIndex].value;
    updateReplayList();
});

ipcRenderer.on('message', function (e, message) {
    document.getElementById('message').innerHTML = message;
});

ipcRenderer.on('replaylist', function (e, list) {
    replayList = list;
    updateReplayList();
});

ipcRenderer.on('modsResult', function (e, modsResult) {
    filters[waitingTypeMods] = modsResult;
    updateReplayList();
});
