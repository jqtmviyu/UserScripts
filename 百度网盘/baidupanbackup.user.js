// ==UserScript==
// @name        百度网盘回到旧版
// @namespace   Violentmonkey Scripts
// @match       https://pan.baidu.com/disk/main*
// @version     0.1
// @author      -
// @description 8/21/2024, 2:01:46 AM
// ==/UserScript==
(function() {
  'use strict';
  var btn = document.querySelector('.nd-chat-ai-btn');
  if (btn) {
    window.location.href = 'https://pan.baidu.com/disk/home?from=newversion&stayAtHome=true#/all?path=%2F&vmode=list';
  }
})();
