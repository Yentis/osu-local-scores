const path = require('path');
const {GetPP} = require(path.resolve(__dirname, 'assets', 'addon', 'build', 'Release', 'ppCalculator'));
const {execSync} = require('child_process');

const modTable = {
    "None": 0,
    "NoFail": 1<<0,
    "Easy": 1<<1,
    "TouchDevice": 1<<2,
    "Hidden": 1<<3,
    "HardRock": 1<<4,
    "DoubleTime": 1<<6,
    "HalfTime": 1<<8,
    "Nightcore": 1<<9,
    "Flashlight": 1<<10,
    "SpunOut": 1<<12
};

const modText = {
    "None": "NM",
    "Easy":"EZ",
    "NoFail":"NF",
    "HalfTime":"HT",
    "HardRock":"HR",
    "Nightcore": "NC",
    "DoubleTime":"DT",
    "Hidden":"HD",
    "Flashlight":"FL",
    "SpunOut":"SO"
};

let processedReplays, lastReplay;
let failedReplays = [];

process.on('message', (msg) => {
    if(msg.replays) {
        processedReplays = msg.replays;

        for(let i = msg.startIndex; i < msg.mapList.length; i++) {
            processReplayData(msg.mapList[i], msg.deep);
            process.send({index: i+1, total: msg.mapList.length, replay: lastReplay});
        }

        process.send({done: true, failedReplays: failedReplays});
    } else if(msg === 'exit') {
        process.exit();
    }
});

function modsToBit(mods){
    let modArray = mods.split(', ');
    let modList = 0;

    modArray.forEach(function (mod) {
        let convertedMod = modTable[mod];

        if(convertedMod) {
            modList ^= convertedMod;
        }
    });

    return modList;
}

function modsToText(mods){
    let modArray = mods.split(', ');
    let modList = '';

    modArray.forEach(function (mod) {
        let convertedMod = modText[mod];

        if(convertedMod) {
            modList += convertedMod;
        }
    });

    return modList;
}

function oppaiCmd(cmd){
    let stdout = execSync(cmd).toString();

    let ppLine = stdout.split('\n');
    let pp = ppLine[ppLine.length-3].split(' ')[0];
    let max_combo = ppLine[ppLine.length-4].split(' ')[1].split('/')[0];

    return [pp, max_combo];
}

function cmdBuilder(path, mods, count100, count50, countmiss, combo){
    return 'oppai "' + path + '" +' + mods + ' ' + count100 + 'x100 ' + count50 + 'x50 ' + countmiss + 'xmiss ' + combo + 'x';
}

function processReplayData(map, deep) {
    map.replays.forEach(function (data, index) {
        if(!deep && processedReplays[data.ReplayHash]) {
            return;
        }

        let accuracy = getAccuracy(data);
        let oppaiData = getOppaiData(map, data, index);
        let combo = data.Combo;

        //if combo is somehow larger than max combo let's just assume that our combo is an FC (problem with oppai-ng)
        if(oppaiData[1] !== 0 && combo > oppaiData[1]) {
            oppaiData[1] = combo;
        }

        processedReplays[data.ReplayHash] = {
            identifier: map.path.split('Songs\\')[1].replace(/ /g, ''),
            replayHash: data.ReplayHash,
            beatmap_id: map.beatmap_id.toString(),
            beatmapset_id: map.beatmapset_id,
            accuracy: accuracy,
            grade: getGrade(data, accuracy),
            misses: data.CountMiss,
            score: data.Score,
            timestamp: new Date(data.TimePlayed).toLocaleDateString('nl-NL'),
            mods: data.Mods.split(', '),
            mode: data.GameMode,
            name: map.name,
            combo: data.Combo,
            max_combo: oppaiData[1],
            pp: oppaiData[0],
            max_pp: oppaiData[2]
        };

        lastReplay = {hash: data.ReplayHash, replayData: processedReplays[data.ReplayHash]};
    });
}

function getAccuracy(replay) {
    let accuracy = 0;

    switch(replay.GameMode) {
        case 'Standard':
            accuracy = ((replay.Count300) * 300 + (replay.Count100) * 100 + (replay.Count50) * 50)/((replay.Count300+replay.Count100+replay.Count50+replay.CountMiss)*300);
            break;
        case 'Taiko':
            accuracy = (((0.5*replay.Count100) + replay.Count300) / (replay.CountMiss + replay.Count100 + replay.Count300));
            break;
        case 'CatchTheBeat':
            accuracy = ((replay.Count300 + replay.Count100 + replay.Count50) / (replay.CountKatu + replay.CountMiss + replay.Count50 + replay.Count100 + replay.Count300));
            break;
        case 'Mania':
            accuracy = (((50*replay.Count50) + (100*replay.Count100) + (200*replay.CountKatu) + (300*(replay.Count300 + replay.CountGeki))) / (300*(replay.CountMiss + replay.Count50 + replay.Count100 + replay.CountKatu + replay.Count300 + replay.CountGeki)));
            break;
    }

    return parseFloat((accuracy * 100).toFixed(2));
}

function getGrade(replay, accuracy){
    if(accuracy === 100) {
        return 5;
    }

    switch(replay.GameMode) {
        case 'Standard':
            let amountOfNotes = replay.Count300 + replay.Count100 + replay.Count50 + replay.CountMiss;
            let percent300 = replay.Count300 / amountOfNotes;
            let percent50 =  replay.Count50 / amountOfNotes;

            if(percent300 > 0.9 && percent50 < 0.01 && replay.CountMiss === 0) {
                return 4;
            } else if((percent300 > 0.8 && replay.CountMiss === 0) || percent300 > 0.9) {
                return 3;
            } else if((percent300 > 0.7 && replay.CountMiss === 0) || percent300 > 0.8) {
                return 2;
            } else if(percent300 > 0.6) {
                return 1;
            } else {
                return 0;
            }
        case 'Taiko':
        case 'Mania':
            if(accuracy > 95) {
                return 4;
            } else if(accuracy > 90) {
                return 3;
            } else if(accuracy > 80) {
                return 2;
            } else if(accuracy > 70) {
                return 1;
            } else {
                return 0;
            }
        case 'CatchTheBeat':
            if(accuracy > 98) {
                return 4;
            } else if(accuracy > 94) {
                return 3;
            } else if(accuracy > 90) {
                return 2;
            } else if(accuracy > 85) {
                return 1;
            } else {
                return 0;
            }
    }
}

function getOppaiData(map, data, index){
    let pp = 0;
    let max_combo = 0;
    let max_pp = 0;

    if(data.GameMode === 'Standard' || data.GameMode === 'Taiko') {
        let modBits = modsToBit(data.Mods);
        let oppaiData = GetPP(map.path, modBits, data.Combo, data.Count100, data.Count50, data.CountMiss,
            data.GameMode === 'Standard' ? 0 : 1,
            data.GameMode === 'Taiko' ? map.starRatingsTaiko[index] : 0,
            map.hitCircles, map.overallDifficulty);

        if(!Array.isArray(oppaiData)) {
            console.log('Failed to get oppaiData from library.');
            let textMods = modsToText(data.Mods);
            oppaiData = oppaiCmd(cmdBuilder(map.path, textMods, data.Combo, data.Count100, data.Count50, data.CountMiss));

            if(!oppaiData || oppaiData[0] <= -1) {
                console.log('Failed to get oppaiData from cmd.');
                failedReplays.push(map.path);
            }
        }

        pp = oppaiData[0];
        max_combo = oppaiData[1];
        max_pp = oppaiData[2];
    } else if(data.GameMode === 'Mania') {
        let oppaiData = map.maniaPPData[index];

        pp = oppaiData[0];
        max_pp = oppaiData[1];
    }

    return [pp, max_combo, max_pp];
}