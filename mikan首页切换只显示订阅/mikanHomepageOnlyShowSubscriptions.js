// ==UserScript==
// @name         mikan首页只显示订阅
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  The mikan Home only shows subscriptions.
// @match        https://mikanani.me/
// @match        https://mikanime.tv/
// @description  切换mikan首页只显示订阅,纵向显示番剧信息
// ==/UserScript==

;(function () {
  'use strict'
  var styles = `
    /*屏蔽未订阅*/
    .sk-bangumi .an-ul > li:not(:has(div.active)) {
      display: none;
    }
    .an-box:not(:has(div.active)) {
      display: none;
    }
    .sk-bangumi:not(:has(div.active)) {
      display: none!important;
    }
    /*纵向布局*/
    #sk-data-nav,
    k-data-nav .container {
      height: 38px;
    }
    .list-inline.data-nav-ul {
      visibility: hidden;
      height: 0px;
    }
    .navbar-nav.date-select {
      margin-top: 5px;
    }
    #sk-body {
      display: flex;
      flex-wrap: nowrap;
    }
    #sk-body .sk-bangumi {
      display: flex;
      flex-direction: column;
      flex-wrap: nowrap;
      width: 14.3%;
      padding: unset;
    }
    .sk-bangumi > .row:first-child {
      margin: 0!important;
      padding: 0!important;
      text-align: center;
      color: #fff;
    }
    #data-row-1 {
      background-color: #ff530e;
    }
    #data-row-2 {
      background-color: #fe9b36;
    }
    #data-row-3 {
      background-color: #edcf00;
    }
    #data-row-4 {
      background-color: #32b16c;
    }
    #data-row-5 {
      background-color: #00b8ee;
    }
    #data-row-6 {
      background-color: #546fb4;
    }
    #data-row-0 {
      background-color: #8956a1;
    }
    #sk-body .an-box {
      margin-top: 5px;
      height: unset;
    }
    .an-ul {
      width: 100%;
      display: inline-block;
      margin: 0;
      padding: 0;
    }
    .an-ul li {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: unset;
      margin-right: 0;
      margin-top: 5px;
      position: relative;
    }
    .an-ul li span {
      width: 100%;
      padding-bottom: 100%;
      margin: 0px;
      height: auto;
      position: unset;
    }
    .an-ul li .an-info {
      display: flex;
      width: 100%;
      position: unset;
      margin-top: 5px;
      padding-left: 5px;
    }
    .an-ul li .an-info .an-info-icon {
      margin: 0;
    }
    .an-ul li .an-info .an-info-icon i {
      width: 30px;
    }
    .an-ul li .an-info .tooltip {
      width: 40px;
    }
    .num-node {
      top: 0;
      right: 0;
    }
    /*弹出层*/
    #sk-body .an-res-row-frame {
      width: unset;
      height: unset;
    }
    .an-res-row {
      background-color: #dcd4d6;
    }
    #sk-body .an-res-row .res-left-bg {
      display:none;
    }
    #sk-body .an-res-row .res-left {
      position: unset;
    }
    #sk-body .list-inline>li.active {
      background-color: orange;
    }

    #sk-body .an-res-row .res-left .res-ul-pagination .page-dock {
      display: block;
      bottom: 0;
      right: 0;
      transform: translate(50%, 50%);
    }
    #sk-body .an-res-row .res-left .res-ul-pagination .page-dock .dock-left {
      margin-left: 0px;
    }
    #sk-body .an-res-row .res-left .res-ul-pagination .page-dock div.dock-right {
      margin-left: 8px;
    }

    #sk-body .an-res-row-frame {
      position: fixed;
      top:0;
      left: 0;
      transform: translateX(-50%)!important;
      z-index:999999;
    }
  `
  var button = document.createElement('button')
  button.textContent = ''
  button.style.position = 'fixed'
  button.style.bottom = '200px'
  button.style.right = '30px'
  button.style.zIndex = '1000'
  button.style.width = '60px'
  button.style.height = '60px'
  button.style.border = 'none'
  button.style.backgroundColor = '#767777'
  button.style.cursor = 'pointer'
  button.innerHTML = '<i class="fa fa-cog" style="font-size: 36px; color: #fff; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></i>'
  document.body.appendChild(button)
  var applied = localStorage.getItem('stylesApplied') === 'true'
  if (applied) {
    applyStyles()
  }
  button.addEventListener('click', function () {
    if (applied) {
      removeStyles()
      localStorage.setItem('stylesApplied', 'false')
    } else {
      applyStyles()
      localStorage.setItem('stylesApplied', 'true')
    }
    applied = !applied
  })
  function applyStyles() {
    var styleElement = document.createElement('style')
    styleElement.textContent = styles
    document.head.appendChild(styleElement)
  }
  function removeStyles() {
    // location.reload()
    var styleElements = document.querySelectorAll('style')
    for (var i = 0; i < styleElements.length; i++) {
      if (styleElements[i].textContent === styles) {
        styleElements[i].remove()
        break
      }
    }
    const lazyElements = document.querySelectorAll('.b-lazy:not(.b-loaded)')
    lazyElements.forEach(element => {
    const src = element.getAttribute('data-src')
    element.style.backgroundImage = `url(${src})`
    element.classList.add('b-loaded')
})
  }
})()
