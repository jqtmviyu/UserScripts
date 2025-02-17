// ==UserScript==
// @name         NGA优化摸鱼体验插件-标记整页(自用)
// @namespace    https://github.com/jqtmviyu/UserScripts
// @version      1.0.0
// @author       jqtmviyu
// @description  自动标记整页用户
// @license      MIT
// @match        *://bbs.nga.cn/read.php*
// @match        *://ngabbs.com/read.php*
// @match        *://nga.178.com/read.php*
// @match        *://g.nga.cn/read.php*
// @grant        unsafeWindow
// @run-at       document-start
// @inject-into  page
// ==/UserScript==

;(function (registerPlugin) {
  'use strict'
  // 获取当前页面的tid
  let currentTid = new URLSearchParams(window.location.search).get('tid')
  console.log('当前页面tid:', currentTid)

  // let uidEls = document.querySelectorAll('a[name="uid"]')
  // let uidList = []
  // uidEls.forEach(el => {
  //   uidList.push(el.textContent.trim()) // 获取文本内容并去除首尾空白
  // })
  // console.log('uidList: ', uidList)

  const PageMark = {
    name: 'PageMark', // 插件唯一KEY
    title: '标记整页', // 插件名称
    desc: '一键对整页用户上标记,点击右边设置按钮使用', // 插件说明
    settings: [
      {
        key: 'tid',
        title: '只会在该tid的页面标记',
        desc: '清空不启用',
        default: '',
      },
      {
        key: 'autoPagination',
        title: '自动翻页(毫秒)F9开始F10暂停',
        desc: '0或者为空不启动,建议1000',
        default: '0',
      },
      {
        key: 'defColor',
        title: '使用默认颜色#1f72f1',
        desc: '默认色表没有颜色#1f72f1',
        default: false,
      },
      {
        key: 'markColor',
        title: '自定义颜色',
        desc: '默认蓝色，下面的色表里没有这个颜色，需要默认颜色请勾选上方按钮',
        default: '#1f72f1',
      },
      {
        key: 'hiddenImg',
        title: '精简样式',
        desc: '减少渲染,加快响应速度',
        default: false,
      },
      {
        key: 'markInput',
        title: '输入你要挂的标记',
        desc: '在此处填写，不宜过长',
        default: '',
      },
    ],
    preProcFunc() {
      // console.log('已运行: 前置函数')
    },
    initFunc() {
      const $ = this.mainScript.libs.$
      // 调用标准模块authorMark初始化颜色选择器
      this.mainScript
        .getModule('AuthorMark')
        .initSpectrum(`[plugin-id="${this.pluginID}"][plugin-setting-key="markColor"]`)
      /* console.log($.trim(' '))
          console.log('已运行: 标记整页')
          console.log('插件ID: ', this.pluginID)
          console.log('插件配置: ', this.pluginSettings)
          console.log('主脚本: ', this.mainScript)
          console.log('主脚本引用库: ', this.mainScript.libs) */
    },
    postProcFunc() {
      // console.log('已运行: 后置函数')
      const _this = this

      if (!!_this.pluginSettings['autoPagination'] && currentTid == _this.pluginSettings['tid']) {
        // 绑定翻页功能
        let intervalId = null
        let isRunning = false
        let interval = parseInt(_this.pluginSettings['autoPagination'] || 0)
        console.log('自动翻页间隔(毫秒): ', interval)

        function clickNextPage() {
          const nextPageElement = document.querySelector('[title="下一页"]')
          if (nextPageElement) {
            nextPageElement.click()
          } else {
            stopAutoClick()
            alert('已到最后一页')
          }
        }

        function startAutoClick() {
          if (!isRunning) {
            alert('F10停止')
            intervalId = setInterval(clickNextPage, interval)
            isRunning = true
          }
        }

        function stopAutoClick() {
          if (isRunning) {
            clearInterval(intervalId)
            isRunning = false
          }
        }
        if (interval > 0) {
          document.addEventListener('keydown', function (event) {
            if (event.key === 'F9') {
              startAutoClick()
            } else if (event.key === 'F10') {
              stopAutoClick()
            }
          })
        }

        // 精简样式
        if (_this.pluginSettings['hiddenImg']) {
          let styleElement = document.createElement('style')
          // 定义样式内容
          let styleContent = `
          /* 左边用户信息 */
          [id^="posterinfo"] .stat > div:not(.hld__marks-container)  {
            display: none;
          }
          /*置顶评论*/
          #hightlight_for_0 {
              display: none;
          }
          /*楼层内容*/
          [id^="postcontentandsubject"]   {
            display: none;
          }
          `
          // 将样式内容添加到 style 元素中
          styleElement.innerHTML = styleContent
          console.log('styleElement:', styleElement)
          // 将 style 元素添加到文档的头部，使其成为嵌入式样式
          document.head.appendChild(styleElement)
        }
      }
    },
    renderThreadsFunc($el) {
      // 帖子列表页
      console.log('列表项 (JQuery) => ', $el)
      //console.log('列表项 (JS) => ', $el.get(0))
    },
    // 帖子详情页，每检测到一个回复楼层运行一次
    renderFormsFunc($el) {
      //console.log('回复项 (JQuery) => ', $el)
      //console.log('回复项 (JS) => ', $el.get(0))

      if (!this.pluginSettings['tid'] || currentTid !== this.pluginSettings['tid']) {
        console.log('未设置tid或tid不符合，直接return')
        return
      }

      const currentUid = $el.find('[name=uid]').text() + '' // 获取uid，具体什么方式是复制的本体，能用就行。
      //console.log(currentUid);
      // 判断是否匿名
      if (parseInt(currentUid) < 0) {
        console.log('本楼匿名，直接return')
        return
      }
      const preMark = this.pluginSettings['markInput'] // 获取设置内自己填写的标记（准备标记）
      let preColor = this.pluginSettings['defColor'] ? '#1f72f1' : this.pluginSettings['markColor']

      // 获取设置内自己填写的标记（准备标记）
      // console.log(preMark+"(premark)");
      // const userObj = ({uid: currentUid}); // 创建一个对象，属性是uid，刚获取到的，用来接收标签Array数组。
      /*
      获取标签对象用来比较重复标记，如果获取的对象为空那么可以直接标记
      有标记的话会比较对象里的marks然后比较，没重复的就标，有重复的就直接return结束
      try用来抓报错
      */

      try {
        let markArray = this.mainScript.getModule('MarkAndBan').getUserMarks({ uid: currentUid })
        // 判断是否为空
        if (!markArray) {
          // 空的直接标
          // console.log("没被标记过，可以直接标");
          // 定义标记对象
          let markObj = {
            marks: [{ mark: preMark, text_color: '#ffffff', bg_color: preColor, desc: '' }],
            name: '',
            uid: currentUid,
          }
          this.mainScript.getModule('MarkAndBan').setUserMarks(markObj) // 调用标记函数
          console.log('无标记者标记成功')
        } else {
          // console.log(markArray.marks[0].mark);
          // 使用find函数找重复，有的话if判断为true接return
          if (
            markArray.marks.find(element => {
              return preMark === element.mark
            })
          ) {
            console.log('有重复，无需标记')
            return
          }

          // console.log("没重复，添加标记");
          // 没有重复那么直接标记
          // let markList = markArray.marks; // 接收标记数组
          markArray.marks.push({
            mark: preMark,
            text_color: '#ffffff',
            bg_color: preColor,
            desc: '',
          }) // 在末尾插入标记 默认颜色是#1f72f1 作者为什么不在封装的取色列表里加入这个默认颜色，我不理解
          // 写明标记对象并调用标记函数
          // let markObj = {marks: markArray.marks, name: '', uid: currentUid};
          this.mainScript
            .getModule('MarkAndBan')
            .setUserMarks({ marks: markArray.marks, name: '', uid: currentUid })
          console.log('有标记者标记成功')
        }
      } catch (e) {
        console.log(e)
      }
    },
    renderAlwaysFunc() {
      // console.log('循环运行: renderAlwaysFunc()')
    },
    // async defColor(){
    //     // this.pluginInputs['markColor'].val = "#1f72f1"
    //     this.mainScript.popNotification(this.pluginInputs['markColor']);
    // },
    // 动态异步样式
    asyncStyle() {
      return `#ngascript_plugin_${this.pluginID} {color: red}`
    },
    style: `
      #ngascript_plugin_test {color: red}
      `,
  }
  registerPlugin(PageMark)
})(function (plugin) {
  plugin.meta = GM_info.script
  unsafeWindow.ngaScriptPlugins = unsafeWindow.ngaScriptPlugins || []
  unsafeWindow.ngaScriptPlugins.push(plugin)
})
