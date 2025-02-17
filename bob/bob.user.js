// ==UserScript==
// @name         bob划词翻译
// @namespace    https://github.com/jqtmviyu/UserScripts
// @version      0.1
// @description  Show popup on text selection and trigger keyboard shortcut
// @author       jqtmviyu
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==

;(function () {
  'use strict'

  let popup = null

  // 创建弹出提示
  function createPopup() {
    // console.log('创建弹出框')
    const div = document.createElement('div')
    div.textContent = 'B'
    div.style.cssText = `
            position: fixed;
            background: #333;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            z-index: 10000;
            font-size: 14px;
        `
    return div
  }


  // 清理选中和弹出框
  function cleanup() {
    // console.log('清理选中和弹出框')
    if (popup && popup.parentNode) {
      popup.parentNode.removeChild(popup)
    }
    window.getSelection().removeAllRanges()
  }

  // 监听选中文本事件
  document.addEventListener('mouseup', e => {
    const selection = window.getSelection()
    // console.log('mouseup 事件触发')

    // 检查是否有有效的选区
    if (selection.anchorNode) {
      const selectedText = selection.toString().trim()
      // console.log('选中的文本:', selectedText)

      // 如果有选中文本
      if (selectedText) {
        // 移除旧的弹出框
        if (popup && popup.parentNode) {
          // console.log('移除旧的弹出框')
          popup.parentNode.removeChild(popup)
        }

        // 创建新的弹出框
        popup = createPopup()
        document.body.appendChild(popup)

        // 设置弹出框位置
        const rect = selection.getRangeAt(0).getBoundingClientRect()
        popup.style.left = `${rect.right}px`
        popup.style.top = `${rect.top - 30}px`
        // console.log('弹出框位置:', rect.right, rect.top - 30)

        // 点击弹出框发送请求
        popup.addEventListener('mousedown', e => {
          // console.log('弹出框 mousedown 事件触发')
          e.preventDefault()
          e.stopPropagation()
          // console.log('选中的文本:', selectedText)
          GM_xmlhttpRequest({
            method: 'POST',
            url: 'http://localhost:8081/translate',
            headers: {
              'Content-Type': 'application/json'
            },
            data: JSON.stringify({ data: selectedText }),
            onload: function(response) {
              console.log('翻译请求已发送')
            },
            onerror: function(error) {
              console.error('请求失败:', error)
            }
          })
          cleanup()
        })
      } else {
        cleanup()
      }
    }
  })
})()
