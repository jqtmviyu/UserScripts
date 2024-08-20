// ==UserScript==
// @name        百度网盘回到旧版
// @namespace   Violentmonkey Scripts
// @match       https://pan.baidu.com/disk/main*
// @version     0.1
// @author      -
// @run-at      document-idle
// @description 检测到ai助手,自动跳转回旧版网页
// ==/UserScript==
(function() {
  'use strict';
  var btn = document.querySelector('.nd-chat-ai-btn');
  if (btn) {
    window.location.href = 'https://pan.baidu.com/disk/home?from=newversion&stayAtHome=true#/all?path=%2F&vmode=list';
  }
})();
