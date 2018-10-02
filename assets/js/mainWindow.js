$(document).ready(function () {
    const {ipcRenderer, shell} = require('electron');
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
        "Nightcore":"NC",
        "Target":"Target Practice",
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
    const mode = {
        "Standard": 0,
        "Taiko": 1,
        "CatchTheBeat": 2,
        "Mania": 3
    };
    const invalidScoreSort = ['name', 'beatmap_id'];

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
        modeName: '',
        beatmap_idNum: '',
        mapName: '',
        dateMin: '',
        dateMax: '',
        excludedMods: [],
        includedMods: [],
        ppMin: 0,
        ppMax: '',
        max_ppMin: 0,
        max_ppMax: '',
        amountToShow: baseShow,
        orderType: 'name',
        orderDirection: 'asc',
        comboFilterType: 'percent'
    };
    let lastFilter = 'name';
    let replayList, mapList, waitingTypeMods;

    const numberWithCommas = function(x){
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    $('select').formSelect();
    $('.datepicker').datepicker();
    $('.collapsible').collapsible();

    function sortList(list, replayObj, orderType = filters.orderType, orderDirection = filters.orderDirection){
        return list.sort(function (a, b) {
            if(replayObj) {
                return getOrder(replayObj[a], replayObj[b], orderType, orderDirection);
            } else {
                return getOrder(a, b, orderType, orderDirection);
            }
        });
    }

    function getOrder(a, b, orderType, orderDirection) {
        if(orderDirection === 'desc') {
            let c = a;
            a = b;
            b = c;
        }

        if(orderType === 'name') {
            return a[orderType].localeCompare(b[orderType]);
        } else if(orderType === 'timestamp') {
            return getDate(a[orderType]) - getDate(b[orderType]);
        } else if(orderType === 'combo') {
            let aPercent = a[orderType] / a.max_combo || 0;
            let bPercent = b[orderType] / b.max_combo || 0;

            return aPercent - bPercent;
        } else if(orderType === 'mode') {
            return mode[a[orderType]] - mode[b[orderType]];
        } else {
            return a[orderType] - b[orderType];
        }
    }

    function applyFilters(replay, regexName, regex_id){
        return !!((filters.gradeMin === '' || (gradeToIndex(filters.gradeMin.toUpperCase()) != null && replay.grade >= gradeToIndex(filters.gradeMin.toUpperCase())))
            && (filters.gradeMax === '' || (gradeToIndex(filters.gradeMax.toUpperCase()) != null && replay.grade <= gradeToIndex(filters.gradeMax.toUpperCase())))
            && (regex_id == null || replay.beatmap_id.match(regex_id))
            && (regexName == null || replay.name.toLowerCase().match(regexName))
            && replay.score >= filters.scoreMin
            && (filters.scoreMax === '' || replay.score <= filters.scoreMax)
            && replay.accuracy >= filters.accuracyMin
            && (filters.accuracyMax === '' || replay.accuracy <= filters.accuracyMax)
            && replay.misses >= filters.missesMin
            && (filters.missesMax === '' || replay.misses <= filters.missesMax)
            && (filters.modeName === '' || replay.mode.toLowerCase() === filters.modeName.toLowerCase())
            && (filters.dateMin === '' || (getDate(replay.timestamp) - new Date(filters.dateMin)) >= 0)
            && (filters.dateMax === '' || (getDate(replay.timestamp) - new Date(filters.dateMax)) <= 0)
            && (filters.excludedMods.length === 0 || hasNoMod(filters.excludedMods, replay.mods))
            && (filters.includedMods.length === 0 || hasMod(filters.includedMods, replay.mods))
            && (filters.ppMax === '' || replay.pp <= filters.ppMax)
            && replay.pp >= filters.ppMin
            && (filters.comboMax === '' || filterCombo(replay.combo, replay.max_combo, filters.comboMax, 1))
            && (filters.comboMin === '' || filterCombo(replay.combo, replay.max_combo, filters.comboMin, -1))
            && (filters.max_ppMax === '' || replay.max_pp <= filters.max_ppMax)
            && replay.max_pp >= filters.max_ppMin);
    }

    function filterCombo(combo, max_combo, filterCombo, direction) {
        let comboToCompare = 0;


        if(filters.comboFilterType === 'percent') {
            comboToCompare = max_combo > 0 ? (combo / max_combo) * 100 : parseInt(filterCombo) + direction;
        } else {
            comboToCompare = combo;
        }

        if(direction === 1) {
            return comboToCompare <= parseInt(filterCombo);
        } else {
            return comboToCompare >= parseInt(filterCombo);
        }
    }

    function hasMod(source, target) {
        let matchCount = 0;

        source.forEach(function (mod) {
            if(target.includes(mod)) {
                matchCount++;
            }
        });

        return matchCount === source.length;
    }

    function hasNoMod(source, target) {
        let result = true;

        source.forEach(function (mod) {
            if(target.includes(mod)) {
                result = false;
            }
        });

        return result;
    }

    function addHtml(replay) {
        let mode = replay.mode;
        if(mode === 'CatchTheBeat') {
            mode = 'fruits';
        } else if(mode === 'Standard') {
            mode = 'osu';
        }

        let html = '';
        html += '<td><a href="https://osu.ppy.sh/beatmapsets/' + replay.beatmapset_id + '#' + mode + '/' + replay.beatmap_id + '"><img src="http://b.ppy.sh/thumb/' + replay.beatmapset_id + '.jpg" onerror="this.src=\'assets/images/image-not-found.png\'" height="60"></a></td>';
        html += '<td><a href="osu://b/' + replay.beatmap_id + '">' + replay.name + '</a></td>';
        html += '<td>' + replay.mode + '</td>';
        html += '<td>' + replay.beatmap_id + '</td>';
        html += '<td>' + numberWithCommas(replay.score) + '</td>';
        html += '<td>' + grade[replay.grade] + '</td>';
        html += '<td>' + replay.accuracy + '%</td>';
        html += '<td>' + replay.misses + '</td>';
        html += '<td>' + replay.combo + ' / ' + (replay.max_combo === 0 ? '?' : replay.max_combo) + '</td>';
        html += '<td>' + getModString(replay) + '</td>';
        html += '<td style="width: 100px">' + replay.timestamp + '</td>';
        html += '<td>' + getPP(replay.pp) + ' / ' + getPP(replay.max_pp) + '</td>';
        html += '</tr>';
        return html;
    }

    function getPP(pp) {
        if(pp == null) {
            return '∞';
        } else {
            return pp.toFixed(2);
        }
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

    function sortMapReplays(array) {
        if(invalidScoreSort.indexOf(filters.orderType) === -1) {
            return sortList(array);
        } else {
            return sortList(array, null, 'score', 'desc');
        }
    }

    function updateReplayList(){
        let html = '<tbody>';

        filters.amountToShow = baseShow;

        //add scores to maps and sort them by valid filter or score
        mapList = {};
        for(let key in replayList) {
            if(replayList.hasOwnProperty(key)) {
                let curReplay = replayList[key];
                let curMapList = mapList[curReplay.identifier];

                if(curMapList) {
                    curMapList.push(curReplay);
                    mapList[curReplay.identifier] = sortMapReplays(curMapList);
                } else {
                    mapList[curReplay.identifier] = [curReplay];
                }
            }
        }

        //get scores to display
        let displayList = [];
        for(let key in mapList) {
            if(mapList.hasOwnProperty(key)) {
                let map = mapList[key];
                let regexName, regex_id;

                if(filters.mapName !== '') {
                    regexName = new RegExp('.*' + filters.mapName.toLowerCase() + '.*');
                }

                if(filters.beatmap_idNum !== '') {
                    regex_id = new RegExp('.*' + filters.beatmap_idNum + '.*');
                }

                let highestValidIndex = getValidScore(key, regexName, regex_id);

                if(highestValidIndex !== null) {
                    let toShowMap = map[highestValidIndex];
                    toShowMap.index = highestValidIndex;

                    displayList.push(toShowMap);
                }
            }
        }

        //sort the scores
        displayList = sortList(displayList);

        //display the scores
        displayList.forEach((score) => {
            if(mapList[score.identifier].length > 1) {
                html += '<tr hidden class="scoreDisplay ' + score.identifier + ' ' + score.index + '">';
            } else {
                html += '<tr hidden class="' + score.identifier + '">';
            }
            html += addHtml(score);
        });

        html += '</tbody>';

        $('tbody').remove();
        $('#replayTable').append(html);
        unhideElements();
    }

    function getValidScore(identifier, regexName, regex_id) {
        let highestValidIndex = null;

        mapList[identifier].forEach(function (score, index) {
            if(highestValidIndex !== null && highestValidIndex < index) {
                return;
            }
            let filtersFit = applyFilters(score, regexName, regex_id);

            if(filtersFit) {
                highestValidIndex = index;
            }
        });

        return highestValidIndex;
    }

    function unhideElements(){
        let replayElements = $('tbody').children();
        let amountToShow = Math.min(replayElements.length, filters.amountToShow);

        $('#showmore').remove();
        for(let i = 0; i < amountToShow; i++) {
            let elem = replayElements[i];
            elem.removeAttribute('hidden');
        }

        if(filters.amountToShow < replayElements.length) {
            $('#replayTable').append('<a id="showmore" href="#">Show more</a>');
        }

        $('#showamount').html('Showing ' + amountToShow + ' of ' + replayElements.length);
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

    $(document).on('click', '.scoreDisplay', function () {
        $('.otherScores').remove();
        if(this.classList.contains('showingAll')) {
            this.classList.remove('showingAll');
        } else {
            $('.showingAll').removeClass('showingAll');
            this.classList.add('showingAll');

            let identifier = this.classList[1];
            let shownIndex = parseInt(this.classList[2]);
            let html = '';

            for(let i = 0; i < mapList[identifier].length; i++) {
                if(i !== shownIndex) {
                    html += '<tr class="otherScores">';
                    html += addHtml(mapList[identifier][i]);
                }
            }

            $(this).after(html);
        }
    });

    $(document).on('click', 'td a', function (e) {
        e.stopPropagation();
        e.preventDefault();
        shell.openExternal(this.href);
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

    $(document).on('click', 'th a', function () {
        let firstChar = this.innerHTML[0];
        if(firstChar !== '▲' && firstChar !== '▼') {
            let lastFilterElem = $('#' + lastFilter);
            lastFilterElem.html(lastFilterElem.html().substring(1, lastFilterElem.html().length));
            lastFilter = this.id;
            this.innerHTML = '▲ ' + this.innerHTML;
            filters.orderDirection = 'asc';
        } else if(firstChar === '▲') {
            this.innerHTML = '▼ ' + this.innerHTML.substring(1, this.innerHTML.length);
            filters.orderDirection = 'desc';
        } else {
            this.innerHTML = '▲ ' + this.innerHTML.substring(1, this.innerHTML.length);
            filters.orderDirection = 'asc';
        }

        filters.orderType = this.id;
        updateReplayList();
    });

    ipcRenderer.on('message', function (e, message) {
        $('#message').html(message).delay(5000).fadeOut();
    });

    ipcRenderer.on('replaylist', function (e, list) {
        replayList = list;
        updateReplayList();
    });

    ipcRenderer.on('modsResult', function (e, modsResult) {
        filters[waitingTypeMods] = modsResult;
        updateReplayList();
    });
});
