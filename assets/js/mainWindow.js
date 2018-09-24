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
    None: 0,
    NoFail: 1,
    Easy: 2,
    TouchDevice: 4,
    Hidden: 8,
    HardRock: 16,
    SuddenDeath: 32,
    DoubleTime: 64,
    Relax: 128,
    HalfTime: 256,
    Nightcore: 512, // Only set along with DoubleTime. i.e: NC only gives 576
    Flashlight: 1024,
    Autoplay: 2048,
    SpunOut: 4096,
    Relax2: 8192,	// Autopilot
    Perfect: 16384, // Only set along with SuddenDeath. i.e: PF only gives 16416
    Key4: 32768,
    Key5: 65536,
    Key6: 131072,
    Key7: 262144,
    Key8: 524288,
    FadeIn: 1048576,
    Random: 2097152,
    Cinema: 4194304,
    Target: 8388608,
    Key9: 16777216,
    KeyCoop: 33554432,
    Key1: 67108864,
    Key3: 134217728,
    Key2: 268435456,
    ScoreV2: 536870912,
    LastMod: 1073741824
};
let filters = {
    scoreMin: 0,
    scoreMax: '',
    accuracyMin: 0,
    accuracyMax: '',
    missesMin: 0,
    missesMax: '',
    gradeMin: 'D',
    gradeMax: 'SS',
    gamemode: '',
    beatmap_id: '',
    mapName: '',
    dateMin: '',
    dateMax: '',
    amountToShow: baseShow,
    orderType: 'name',
    orderDirection: 'asc'
};
let replayList;

echo.init({
    offset: 100,
    throttle: 250,
    unload: false
});

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

        if(filters.orderType === 'name') {
            return a[filters.orderType].localeCompare(b[filters.orderType]);
        } else if(filters.orderType === 'beatmap_id') {
            return a.beatmapdata[filters.orderType] - b.beatmapdata[filters.orderType];
        } else if(filters.orderType === 'timestamp') {
            return getDate(a[filters.orderType]) - getDate(b[filters.orderType]);
        } else {
            return a[filters.orderType] - b[filters.orderType];
        }
    });
}

function applyFilters(replay, regexName, regex_id){
    return !!((replay.mods & mods.ScoreV2) !== mods.ScoreV2
        && replay.grade >= gradeToIndex(filters.gradeMin)
        && (filters.gradeMax === '' || replay.grade <= gradeToIndex(filters.gradeMax))
        && (regex_id == null || replay.beatmapdata.beatmap_id.match(regex_id))
        && (regexName == null || replay.name.toLowerCase().match(regexName))
        && replay.score >= filters.scoreMin
        && (filters.scoreMax === '' || replay.score <= filters.scoreMax)
        && replay.accuracy >= filters.accuracyMin
        && (filters.accuracyMax === '' || replay.accuracy <= filters.accuracyMax)
        && replay.misses >= filters.missesMin
        && (filters.missesMax === '' || replay.misses <= filters.missesMax)
        && (filters.gamemode === '' || replay.mode === filters.gamemode)
        && (filters.dateMin === '' || (getDate(replay.timestamp) - new Date(filters.dateMin)) >= 0)
        && (filters.dateMax === '' || (getDate(replay.timestamp) - new Date(filters.dateMax)) <= 0));
}

function addHtml(replay) {
    let html = '';
    html += '<tr hidden style="border: 2px solid;">';
    html += '<td><img data-echo="http://b.ppy.sh/thumb/' + replay.beatmapdata.beatmapset_id + '.jpg" height="60"></td>';
    html += '<td><a href="osu://b/' + replay.beatmapdata.beatmap_id + '">' + replay.name + '</a></td>';
    html += '<td>' + numberWithCommas(replay.score) + '</td>';
    html += '<td>' + grade[replay.grade] + '</td>';
    html += '<td>' + replay.accuracy + '%</td>';
    html += '<td>' + replay.misses + '</td>';
    html += '<td>' + replay.mode + '</td>';
    html += '<td>' + replay.beatmapdata.beatmap_id + '</td>';
    html += '<td style="width: 100px">' + replay.timestamp + '</td>';
    html += '</tr>';
    return html;
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

    echo.render();
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