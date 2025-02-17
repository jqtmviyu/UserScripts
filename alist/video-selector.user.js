// ==UserScript==
// @name         视频选择器
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  添加按钮以选择所有视频文件
// @author       Your name
// @match        *://webdav.*/*
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  // 创建选择按钮
  function createSelectButton() {
    const button = document.createElement('button')
    button.textContent = '选择所有视频'
    button.setAttribute('data-selected', 'false')
    button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 60px;
            z-index: 9999;
            padding: 8px 16px;
            background-color: #1785FF;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `

    button.addEventListener('click', () => {
      const isSelected = button.getAttribute('data-selected') === 'true'
      selectAllVideos(!isSelected)
      button.textContent = isSelected ? '选择所有视频' : '取消选择视频'
      button.setAttribute('data-selected', (!isSelected).toString())
    })
    document.body.appendChild(button)
  }

  // 选择或取消选择所有视频文件
  function selectAllVideos(shouldSelect = true) {
    // 视频文件扩展名列表
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm']

    // 获取所有列表项
    const listItems = document.querySelectorAll('.list-item')

    listItems.forEach(item => {
      // 获取url
      const href = item.href

      // 检查是否为视频文件
      const isVideo = videoExtensions.some(ext => href.endsWith(ext))

      if (isVideo) {
        // 找到对应的 checkbox 并选中
        const checkbox = item.querySelector('input[type="checkbox"]')
        if (checkbox && checkbox.checked !== shouldSelect) {
          checkbox.click()
        }
      }
    })
  }

  // 等待页面加载完成后初始化
  window.addEventListener('load', createSelectButton)
})()
