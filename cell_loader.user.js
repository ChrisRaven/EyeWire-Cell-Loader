// ==UserScript==
// @name         Cell Loader
// @namespace    http://tampermonkey.net/
// @version      1.0.0.0
// @description  Fully loads cells to the highest details
// @author       Krzysztof Kruk
// @match        https://*.eyewire.org/*
// @exclude      https://*.eyewire.org/1.0/*
// @downloadURL  https://raw.githubusercontent.com/ChrisRaven/EyeWire-Cell-Loader/master/cell_loader.user.js
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
      K.addCSSFile('https://chrisraven.github.io/EyeWire-Cubes/styles.css?v=1');
    }

    $('#gameTools').after('<span id="fully-load-cell-counter" title="Fully load a cell"></span>');

    K.injectJS(`
      

      $(window)
        .on('cell-info-ready', function (e, data) {
          let cellInfoReadyEvent = new CustomEvent("cell-info-ready-triggered.fully-loaded", {detail: data});
          document.dispatchEvent(cellInfoReadyEvent);
      })
    `);

    let originalDistanceFromCamera;
    let originalMeshForInterleavedData;

    let newDistanceFromCamera = function () {
        return 1000;
    };

    let newMeshForInterleavedData;
    let cubeLoadedEvent = new CustomEvent("cube loaded");

    let lsStateName = 'cell-loader-state';
    let turnedOn = K.ls.get(lsStateName);

    if (turnedOn === null) {
      turnedOn = true;
      K.ls.set(lsStateName, turnedOn);
    }

    let cellSize;
    let counter = K.gid('fully-load-cell-counter');
    let numberOfLoadedCubes = 0;


    originalDistanceFromCamera = tomni.threeD.distanceFromCamera;
    originalMeshForInterleavedData = tomni.threeD.meshForInterleavedData;

    newMeshForInterleavedData = function (data, material) {
      document.dispatchEvent(cubeLoadedEvent);
      return originalMeshForInterleavedData(data, material);
    };


    function setState() {
      if (turnedOn) {
        tomni.threeD.distanceFromCamera = newDistanceFromCamera;
        tomni.threeD.meshForInterleavedData = newMeshForInterleavedData;
        counter.style.color = 'white';
      }
      else {
        tomni.threeD.distanceFromCamera = originalDistanceFromCamera;
        tomni.threeD.meshForInterleavedData = originalMeshForInterleavedData;
        counter.style.color = 'gray';
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

    counter.addEventListener('click', function () {
      turnedOn = !turnedOn;
      K.ls.set(lsStateName, turnedOn);
      setState();
    });


    setState();
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
