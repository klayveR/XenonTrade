const cp = require("child-process-es6-promise");
const os = require("os");
const path = require("path");
const spawn = require("child_process").spawn;
const request = require("request-promise-native");
const ffi = require('ffi');

class Helpers {
  /**
  * Returns `true` if the number is a float
  *
  * @param {number} number Number that should be checked for float type
  * @return {boolean}
  */
  static isFloat(number) {
    return Number(number) === number && number % 1 !== 0;
  }

  /**
  * Returns `true` if the object is empty
  *
  * @param {Object} object The object to be checked for emptiness
  * @return {boolean}
  */
  static isEmpty(obj) {
    for(var key in obj) {
      if(obj.hasOwnProperty(key)) {
        return false;
      }
    }

    return true;
  }

  /**
  * Generates a random ID
  * https://stackoverflow.com/a/2117523
  *
  * @return {number}
  */
  static generateRandomId() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  /**
  * Checks whether a package is installed on Linux
  *
  * @param {string} package Package to be checked for installation
  */
  static isPackageInstalled(pkg) {
    return new Promise(function(resolve, reject) {
      // APT based
      cp.exec("dpkg-query -W -f='${Status} ${Version}\n' " + pkg)
      .then((output) => {
        return resolve(true);
      })
      .catch((error) => {
        return cp.exec("rpm -qa | grep " + pkg);
      })
      // RPM based
      .then((output) => {
        // Check if there's any output at all
        if(output && !output.trim()) {
          return resolve(true);
        } else {
          return reject(new Error("Package " + pkg + " is not installed"));
        }
      })
      .catch((error) => {
        return reject(error);
      });
    });
  }

  /**
  * Checks if Python is installed and added to PATH on windows
  * Currently unused
  */
  static isPythonInstalled() {
    return new Promise(function(resolve, reject) {
      cp.exec("python --version")
      .then((output) => {
        resolve(output);
      })
      .catch((error) => {
        reject(error);
      });
    });
  }

  /**
  * Fixes path for asar unpack
  *
  * @param {path} path Path to fix
  */
  static fixPathForAsarUnpack(path) {
    return path.replace("app.asar", "app.asar.unpacked");
  }

  /**
  * Focuses the Path of Exile window based on the OS
  */
  static focusPathOfExile() {
    var nirCmd = this.fixPathForAsarUnpack(path.join(__dirname, "../", "/resource/executables/nircmdc.exe"));

    if(os.platform() === "linux") {
      cp.exec("WID=$(xdotool search --desktop 0 --name 'Path of Exile' | head -n1) && xdotool windowactivate $WID")
      .catch((error) => {
        console.error("Tried to focus Path of Exile but failed, either xdotool is not installed or Path of Exile is not running");
      });
    } else if(os.platform() === "win32") {
      console.log("Trying to focus PoE via ffi");
      var user32 = new ffi.Library('user32', {
        'GetTopWindow': ['long', ['long']],
        'FindWindowA': ['long', ['string', 'string']],
        'SetActiveWindow': ['long', ['long']],
        'SetForegroundWindow': ['bool', ['long']],
        'BringWindowToTop': ['bool', ['long']],
        'ShowWindow': ['bool', ['long', 'int']],
        'SwitchToThisWindow': ['void', ['long', 'bool']],
        'GetForegroundWindow': ['long', []],
        'AttachThreadInput': ['bool', ['int', 'long', 'bool']],
        'GetWindowThreadProcessId': ['int', ['long', 'int']],
        'SetWindowPos': ['bool', ['long', 'long', 'int', 'int', 'int', 'int', 'uint']],
        'SetFocus': ['long', ['long']]
      });

      var kernel32 = new ffi.Library('Kernel32.dll', {
        'GetCurrentThreadId': ['int', []]
      });

      var winToSetOnTop = user32.FindWindowA(null, "Path of Exile")
      var foregroundHWnd = user32.GetForegroundWindow()
      var currentThreadId = kernel32.GetCurrentThreadId()
      var windowThreadProcessId = user32.GetWindowThreadProcessId(foregroundHWnd, null)
      var showWindow = user32.ShowWindow(winToSetOnTop, 9)
      var setWindowPos1 = user32.SetWindowPos(winToSetOnTop, -1, 0, 0, 0, 0, 3)
      var setWindowPos2 = user32.SetWindowPos(winToSetOnTop, -2, 0, 0, 0, 0, 3)
      var setForegroundWindow = user32.SetForegroundWindow(winToSetOnTop)
      var attachThreadInput = user32.AttachThreadInput(windowThreadProcessId, currentThreadId, 0)
      var setFocus = user32.SetFocus(winToSetOnTop)
      var setActiveWindow = user32.SetActiveWindow(winToSetOnTop)
    }
  }

  /**
  * Gets Path of Exile leagues that are non-SSF from GGG API and returns the names
  */
  static getPathOfExileLeagues() {
    return new Promise(function(resolve, reject) {
      request("http://api.pathofexile.com/leagues?type=main", {json: true})
      .then((body) => {
        var leagues = [];
        var leaguesCount = 0;
        // Iterate through each league
        for(var i = 0; i < body.length; i++) {
          var league = body[i];
          var ssf = false;
          leaguesCount++;

          if(!Helpers._isSoloLeague(league)) { leagues.push(league.id); }

          // When done with every league
          if(leaguesCount === body.length) {
            resolve(leagues);
          }
        }
      })
      .catch((error) => {
        reject(error);
      });
    });
  }

  /**
  * Returns `true` if the league rules have a solo rules
  *
  * @return {boolean}
  */
  static _isSoloLeague(league) {
    if(league.rules.length > 0) {
      for(var j = 0; j < league.rules.length; j++) {
        if(league.rules[j].name === "Solo") {
          return true;
        }
      }
    }

    return false;
  }
}

module.exports = Helpers;
