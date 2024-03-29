// ==UserScript==
// @name         Cell Loader
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Fully loads cells to the highest details
// @author       Krzysztof Kruk
// @match        https://*.eyewire.org/*
// @exclude      https://*.eyewire.org/1.0/*
// @downloadURL  https://raw.githubusercontent.com/ChrisRaven/EyeWire-Cell-Loader/main/cell_loader.user.js
// ==/UserScript==

/*jshint esversion: 6, bitwise: false */
/*globals $, account, tomni */

let LOCAL = false;
if (LOCAL) {
  console.log('%c--== TURN OFF "LOCAL" BEFORE RELEASING!!! ==--', "color: red; font-style: italic; font-weight: bold;");
}


(function() {
  'use strict';
  'esversion: 6';

  let K = {
    gid: function (id) {
        return document.getElementById(id);
    },

    qS: function (sel) {
        return document.querySelector(sel);
    },

    qSa: function (sel) {
        return document.querySelectorAll(sel);
    },


    addCSSFile: function (path) {
        $("head").append('<link href="' + path + '" rel="stylesheet" type="text/css">');
    },

    injectJS: function (text, sURL) {
      let
        tgt,
        scriptNode = document.createElement('script');

      scriptNode.type = "text/javascript";
      if (text) {
        scriptNode.textContent = text;
      }
      if (sURL) {
        scriptNode.src = sURL;
      }

      tgt = document.getElementsByTagName('head')[0] || document.body || document.documentElement;
      tgt.appendChild(scriptNode);
    },

    // localStorage
    ls: {
      get: function (key) {
        let item = localStorage.getItem(account.account.uid + '-ews-' + key);
        if (item) {
          if (item === 'true') {
            return true;
          }
          if (item === 'false') {
            return false;
          }
        }

        return item;
      },

      set: function (key, val) {
        localStorage.setItem(account.account.uid + '-ews-' + key, val);
      },

      remove: function (key) {
        localStorage.removeItem(account.account.uid + '-ews-' + key);
      }
    }
  };

  function main() {
    if (LOCAL) {
      K.addCSSFile('http://127.0.0.1:8887/styles.css');
    }
    else {
      K.addCSSFile('https://chrisraven.github.io/EyeWire-Cell-Loader/styles.css?v=6');
    }

    $('#gameTools').after('<span id="fully-load-cell-counter" title="Fully load a cell"></span>');

    K.injectJS(`
      $(window)
        .on('cell-info-ready', function (e, data) {
          let cellInfoReadyEvent = new CustomEvent("cell-info-ready-triggered.fully-loaded", {detail: data});
          document.dispatchEvent(cellInfoReadyEvent);
      })
    `);

    let menuId = 'cell-loader-menu';
    let menu = document.createElement('div');
    menu.id = menuId;
    menu.classList.add("help-menu");
    menu.innerHTML = `
      <input type="radio" name="cell-loader-menu-level-selection" id="cell-loader-lvl1" value="level1">
        <label for="cell-loader-lvl1">Level 1 (highest details)</label><br>
      <input type="radio" name="cell-loader-menu-level-selection" id="cell-loader-lvl2" value="level2">
        <label for="cell-loader-lvl2">Level 2</label><br>
      <input type="radio" name="cell-loader-menu-level-selection" id="cell-loader-lvl3" value="level3">
        <label for="cell-loader-lvl3">Level 3 (lowest details)</label><br>
      <input type="radio" name="cell-loader-menu-level-selection" id="cell-loader-auto" value="auto">
        <label for="cell-loader-auto">auto (EW default)</label><br>
      <input type="checkbox" id="cell-loader-turn-off-for-zfish">
        <label for="cell-loader-turn-off-for-zfish">Turn off for ZFish</label><br>
      <input type="checkbox" id="cell-loader-turn-off-starting-cell">
        <label for="cell-loader-turn-off-starting-cell">Turn off loading starting cell</label>
    `;
    document.body.appendChild(menu);
    menu = K.gid(menuId);
 
    let lsLevelOfDetailsName = 'level-of-details';
    let levelOfDetails = K.ls.get(lsLevelOfDetailsName); // 1000 - highest, 3000 - lowest, -1 - turned off

    if (levelOfDetails === null) {
      levelOfDetails = 1000;
      K.ls.set(lsLevelOfDetailsName, levelOfDetails);
      K.gid('cell-loader-lvl1').checked = true;
    }
    else {
      if (levelOfDetails != -1) {
        K.gid('cell-loader-lvl' + levelOfDetails / 1000).checked = true;
      }
      else {
        K.gid('cell-loader-auto').checked = true;
      }
    }
    
    let lsTurnOffForZFish = 'turn-off-for-zfish';
    let turnOffForZFish = K.ls.get(lsTurnOffForZFish);

    if (turnOffForZFish === null) {
      turnOffForZFish = false;
      K.ls.set(lsTurnOffForZFish, turnOffForZFish);
      K.gid('cell-loader-turn-off-for-zfish').checked = false;
    }
    else {
      K.gid('cell-loader-turn-off-for-zfish').checked = turnOffForZFish;
    }

    // we are doing the check in the code before the UI has been loaded
    K.gid('cell-loader-turn-off-starting-cell').checked = turnOffStartingCell;

    let cubeLoadedEvent = new CustomEvent("cube loaded");

    let cellSize;
    let counter = K.gid('fully-load-cell-counter');
    let numberOfLoadedCubes = 0;

    let originalDistanceFromCamera = tomni.threeD.distanceFromCamera;
    let originalMeshForInterleavedData = tomni.threeD.meshForInterleavedData;

    let newDistanceFromCamera = function (coords) {
      if (turnOffForZFish && tomni.getCurrentCell().info.dataset_id == 11) {
        return originalDistanceFromCamera(coords);
      }

      // zfish has different dimensions, hence the ternary
      return levelOfDetails * (tomni.getCurrentCell().info.dataset_id == 1 ? 1 : 4);
    };

    let newMeshForInterleavedData = function (data, material) {
      document.dispatchEvent(cubeLoadedEvent);
      return originalMeshForInterleavedData(data, material);
    };

    function setState() {
      if (levelOfDetails !== -1) {
        tomni.threeD.distanceFromCamera = newDistanceFromCamera;
        tomni.threeD.meshForInterleavedData = newMeshForInterleavedData;
      }
      else {
        tomni.threeD.distanceFromCamera = originalDistanceFromCamera;
        tomni.threeD.meshForInterleavedData = originalMeshForInterleavedData;
      }
    }
    
    function updateCounter() {
      counter.innerHTML = cellSize + ' / ' + numberOfLoadedCubes;
    }

    document.addEventListener('cube loaded', function() {
      numberOfLoadedCubes++;
      updateCounter();
    });

    document.addEventListener('cell-info-ready-triggered.fully-loaded', function (data) {
      // for some reason, count is available only for the first loaded cell. When switching via the menu, only size is available
      // and count and size are slightly different
      cellSize = data.detail.info.count || data.detail.info.size;
      numberOfLoadedCubes = 0;
      updateCounter();
    });

    document.addEventListener('click', function (event) {
      if (event.target.id !== menuId && event.target.parentNode.id !== menuId && event.target !== counter) {
        menu.style.display = 'none';
      }
    });

    counter.addEventListener('click', function (event) {
      event.preventDefault();
      menu.style.display = 'block';
    });

    menu.addEventListener('change', function (event) {
      switch (event.target.value) {
        case 'level1':
          levelOfDetails = 1000;
          break;
        case 'level2':
          levelOfDetails = 2000;
          break;
        case 'level3':
          levelOfDetails = 3000;
          break;
        case 'auto':
          levelOfDetails = -1;
          break;
      }
      K.ls.set(lsLevelOfDetailsName, levelOfDetails);
      setState();
    });

    K.gid('cell-loader-turn-off-for-zfish').addEventListener('change', function (event) {
      K.ls.set(lsTurnOffForZFish, event.target.checked);
      turnOffForZFish = event.target.checked;
    });

    K.gid('cell-loader-turn-off-starting-cell').addEventListener('change', function (event) {
      localStorage.setItem(lsTurnOffStartingCell, event.target.checked);
      turnOffStartingCell = event.target.checked;
    });

    setState();
  }

      
  let lsTurnOffStartingCell = 'ews-turn-off-starting-cell';
  let turnOffStartingCell = localStorage.getItem(lsTurnOffStartingCell);
  if (turnOffStartingCell === null) {
    turnOffStartingCell = false;
  }
  else {
    if (turnOffStartingCell === 'false') {
      turnOffStartingCell = false;
    }
    else if (turnOffStartingCell === 'true') {
      turnOffStartingCell = true;
    }
  }
  
  if (turnOffStartingCell) {
    tomni.gotoPlayableCell = function () {
      console.log('Loading random starting cell disabled');
    };
  }

  let intv = setInterval(function () {
    if (typeof account === 'undefined' || !account.account.uid) {
      return;
    }
    clearInterval(intv);

    if (account.can('scout', 'scythe', 'mystic', 'admin')) {
      main();
    }
  }, 100);

})();
