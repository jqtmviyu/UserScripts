// ==UserScript==
// @name        百度网盘回到旧版
// @namespace   Violentmonkey Scripts
// @match       https://pan.baidu.com/disk/main*
// @version     0.2
// @author      -
// @description 检测到ai助手,自动跳转回旧版网页
// ==/UserScript==
function redirectToHomeWithPath() {
  // 获取当前页面的 URL
  const currentUrl = window.location.href
  // 使用 URL 构造函数解析当前 URL
  const url = new URL(currentUrl)
  // 获取 path 参数
  const pathParam = url.searchParams.get('path')
  // 构建新的 URL
  const newUrl = `https://pan.baidu.com/disk/home?from=newversion&stayAtHome=true#/all?path=${encodeURIComponent(
    pathParam
  )}&vmode=list`
  // 重定向到新的 URL
  window.location.href = newUrl
}

// 调用
redirectToHomeWithPath()
