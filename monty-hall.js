var five = require("johnny-five");
var Particle = require("particle-io");

var stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();

// I'm using a Proton board, and registered it to the Particle cloud to get the access token and setup the device name.
// If starting fresh, flash your board with the voodoospark framework as instructed here https://github.com/voodootikigod/voodoospark
var board = new five.Board({
    io: new Particle({
        token: '<< Your Proton access token here>>',
        deviceName: '<<Your device name here>>'
    })
});

var Party;
(function (Party) {
    Party[Party["None"] = 0] = "None";
    Party[Party["Host"] = 1] = "Host";
    Party[Party["Player"] = 2] = "Player";
})(Party || (Party = {}));

var Prize = function (servo, isWinner) {
    var _isWinner = isWinner || false;
    var _servo = servo;
    var _party = Party.None;

    var _show = function () {
        if (_isWinner) {
            _servo.max();
        }
        else {
            _servo.min();
        }
    };

    var _tryChooseAsPlayer = function () {
        if (_party == Party.Host) { return false; }
        _party = Party.Player
        return true;
    };

    var _tryChooseAsHost = function () {
        if (_party == Party.Player || _isWinner) { return false; }
        _party = Party.Host;
        return true;
    };

    return {
        show: _show,
        report: function () { console.log("\n*** Winner = ", _isWinner, ". You got ", _isWinner ? '<<< Bacon !!! >>>' : 'Broccoli'); },
        party: function () { return _party },
        tryChooseAsPlayer: _tryChooseAsPlayer,
        tryChooseAsHost: _tryChooseAsHost
    }
}

function randomDoorId() {
    return Math.floor(Math.random() * 3);
}

var Game = function () {
    var _stage,
        _prizes,
        _servos = [new five.Servo({ pin: 'D0', center: true }),new five.Servo({ pin: 'D1', center: true }),new five.Servo({ pin: 'D2', center: true })];

    var _reset = function () {
        var winnerId = randomDoorId();
        _stage = 0;
        _prizes = [];

        _servos.forEach(function(s){s.center();});

        for (var i = 0; i < 3; i++) {
            _prizes[i] = Prize(_servos[i], i == winnerId);
        }

    }

    var _guess = function (doorId) {
        var prize = _prizes[doorId - 1];
        if (prize.tryChooseAsPlayer()) {
            return true;
        }
        console.log("\nYou can't choose door ", doorId);
        return false;
    };

    var _hostPlay = function () {
        var prize = null;
        while (true) {
            var offset = randomDoorId();
            prize = _prizes[offset];
            if (prize.tryChooseAsHost()) {
                prize.show();
                console.log("\nHost opens door ", offset + 1, " and shows you non-winning prize... Now make your final choice:");
                break;
            }
        }
    }
    
    var _score = function (doorId) {
        var prize = _prizes[doorId - 1];
        prize.show();
        prize.report();
    }

    var _play = function (doorId) {
        // console.log(_prizes);
        switch (_stage) {
            case 0:
                _guess(doorId, Party.Player);
                _stage++;
                _hostPlay();
                _stage++;
                break;
            case 1:
                console.log('\nInconceivable! how did we get here?');
                break;
            case 2:
                if (_guess(doorId, Party.Player)) {
                    _score(doorId);
                    _stage++;
                }
                break;
        }
    }

    return {
        reset: _reset,
        play: _play,
        isDone: function () { return _stage == 3; }
    }
};



board.on("ready", function () {
    var game = Game();
    game.reset();

    var keyMap = {
        '1': function() { game.play(1) },
        '2': function() { game.play(2) },
        '3': function() { game.play(3) },
        'r': function() { game.reset(); console.log("\n\nOk, play again!\n"); },
        'q': function() { game.reset(); process.exit()}
    };

    console.log("Created game.\n");
    console.log("Please choose door number 1, 2, or 3:");

    stdin.on("keypress", function (chunk, key) {
        if (!key || !keyMap[key.name]) return;

        keyMap[key.name]();

    });
});
