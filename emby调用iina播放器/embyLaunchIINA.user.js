// ==UserScript==
// @name         embyLaunchIINA
// @name:en      embyLaunchIINA
// @name:zh      embyLaunchIINA
// @name:zh-CN   embyLaunchIINA
// @namespace    https://github.com/jqtmviyu/UserScripts
// @version      0.0.12
// @description  emby launch extetnal player
// @description:zh-cn emby调用外部播放器
// @description:en  emby to external player
// @license      MIT
// @match        *://*/web/index.html*
// @downloadURL https://update.greasyfork.org/scripts/495802/embyLaunchIINA.user.js
// @updateURL https://update.greasyfork.org/scripts/495802/embyLaunchIINA.meta.js
// ==/UserScript==

// 修改自 https://github.com/bpking1/embyExternalUrl 自用

;(function () {
  const os = getOS()
  let timeid = null
  let IINAServerPort = 8080

  let externalPlayer = '' // IINA PotPlayer MXPlayer NPlayer VLC Infuse MPV IINAServer
  switch (os) {
    case 'macOS':
      externalPlayer = 'IINA'
      break

    case 'windows':
      externalPlayer = 'PotPlayer'
      break

    case 'android':
    case 'ios':
      externalPlayer = 'NPlayer'
      break

    default:
      externalPlayer = 'MPV'
      break
  }

  function init() {
    if(timeid){
      clearTimeout(timeid)
      timeid = null
    }
    let playBtns = document.getElementById('externalPlayer')
    if (playBtns) {
      playBtns.remove()
    }
    let palyButton = document.querySelector(
      "div[is='emby-scroller']:not(.hide) .mainDetailButtons .btnPlay"
    )
    if (!palyButton) {
      return
    }
    let buttonhtml = `
      <button id="externalPlayer" type="button" class="raised detailButton emby-button detailButton-primary" title="externalPlayer"> <i class="md-icon detailButton-icon button-icon button-icon-left icon-externalPlayer">　</i>  <span class="button-text">${externalPlayer}</span> </button>
    `
    let buttonStyle = `
      background: url(${getIconsExt(
        externalPlayer
      )})no-repeat;background-size: 100% 100%;font-size: 1.4em;
    `
    palyButton.insertAdjacentHTML('afterend', buttonhtml)
    document.querySelector(
      "div[is='emby-scroller']:not(.hide) .icon-externalPlayer"
    ).style.cssText += buttonStyle
    document.querySelector("div[is='emby-scroller']:not(.hide) #externalPlayer").onclick = () => {
      // 调用外部播放器
      eval('emby'+externalPlayer+'()')
    }
  }

  function showFlag() {
    // itemMiscInfo-primary
    // 评分,上映日期信息栏
    let mediaInfoPrimary = document.querySelector(
      "div[is='emby-scroller']:not(.hide) .mediaInfoPrimary:not(.hide)"
    )
    // 创建录制按钮
    let btnManualRecording = document.querySelector(
      "div[is='emby-scroller']:not(.hide) .btnManualRecording:not(.hide)"
    )
    return !!mediaInfoPrimary || !!btnManualRecording
  }

  async function getItemInfo() {
    let userId = ApiClient._serverInfo.UserId;
    let itemId = /\?id=([A-Za-z0-9]+)/.exec(window.location.hash)[1];
    let response = await ApiClient.getItem(userId, itemId);
    // 继续播放当前剧集的下一集
    if (response.Type == "Series") {
        let seriesNextUpItems = await ApiClient.getNextUpEpisodes({ SeriesId: itemId, UserId: userId });
        if (seriesNextUpItems.Items.length > 0) {
            console.log("nextUpItemId: " + seriesNextUpItems.Items[0].Id);
            return await ApiClient.getItem(userId, seriesNextUpItems.Items[0].Id);
        }
    }
    // 播放当前季season的第一集
    if (response.Type == "Season") {
        let seasonItems = await ApiClient.getItems(userId, { parentId: itemId });
        console.log("seasonItemId: " + seasonItems.Items[0].Id);
        return await ApiClient.getItem(userId, seasonItems.Items[0].Id);
    }
    // 播放当前集或电影
    if (response.MediaSources?.length > 0) {
        console.log("itemId:  " + itemId);
        return response;
    }
    // 默认播放第一个,集/播放列表第一个媒体
    let firstItems = await ApiClient.getItems(userId, { parentId: itemId, Recursive: true, IsFolder: false, Limit: 1 });
    console.log("firstItemId: " + firstItems.Items[0].Id);
    return await ApiClient.getItem(userId, firstItems.Items[0].Id);
}

  function getSeek(position) {
    let ticks = position * 10000
    let parts = [],
      hours = ticks / 36e9
    ;(hours = Math.floor(hours)) && parts.push(hours)
    let minutes = (ticks -= 36e9 * hours) / 6e8
    ;(ticks -= 6e8 * (minutes = Math.floor(minutes))),
      minutes < 10 && hours && (minutes = '0' + minutes),
      parts.push(minutes)
    let seconds = ticks / 1e7
    return (
      (seconds = Math.floor(seconds)) < 10 && (seconds = '0' + seconds),
      parts.push(seconds),
      parts.join(':')
    )
  }

  function getSubPath(mediaSource) {
    let selectSubtitles = document.querySelector(
      "div[is='emby-scroller']:not(.hide) select.selectSubtitles"
    )
    let subTitlePath = ''
    //返回选中的外挂字幕
    if (selectSubtitles && selectSubtitles.value > 0) {
      let SubIndex = mediaSource.MediaStreams.findIndex(
        m => m.Index == selectSubtitles.value && m.IsExternal
      )
      if (SubIndex > -1) {
        let subtitleCodec = mediaSource.MediaStreams[SubIndex].Codec
        subTitlePath = `/${mediaSource.Id}/Subtitles/${selectSubtitles.value}/Stream.${subtitleCodec}`
      }
    } else {
      //默认尝试返回第一个外挂中文字幕
      let chiSubIndex = mediaSource.MediaStreams.findIndex(m => m.Language == 'chi' && m.IsExternal)
      if (chiSubIndex > -1) {
        let subtitleCodec = mediaSource.MediaStreams[chiSubIndex].Codec
        subTitlePath = `/${mediaSource.Id}/Subtitles/${chiSubIndex}/Stream.${subtitleCodec}`
      } else {
        //尝试返回第一个外挂字幕
        let externalSubIndex = mediaSource.MediaStreams.findIndex(m => m.IsExternal)
        if (externalSubIndex > -1) {
          let subtitleCodec = mediaSource.MediaStreams[externalSubIndex].Codec
          subTitlePath = `/${mediaSource.Id}/Subtitles/${externalSubIndex}/Stream.${subtitleCodec}`
        }
      }
    }
    return subTitlePath
  }

  async function getEmbyMediaInfo() {
    let itemInfo = await getItemInfo()
    console.log('待播放的媒体信息:', itemInfo)
    let mediaSourceId = itemInfo.MediaSources[0].Id
    let selectSource = document.querySelector(
      "div[is='emby-scroller']:not(.hide) select.selectSource:not([disabled])"
    )
    if (selectSource && selectSource.value.length > 0) {
      mediaSourceId = selectSource.value
    }
    //let selectAudio = document.querySelector("div[is='emby-scroller']:not(.hide) select.selectAudio:not([disabled])");
    let mediaSource = itemInfo.MediaSources.find(m => m.Id == mediaSourceId)
    console.log('mediaSource:', mediaSource)
    let domain = `${ApiClient._serverAddress}/emby/videos/${itemInfo.Id}`
    console.log('domain:', domain)
    let subPath = getSubPath(mediaSource)
    console.log('subPath:', subPath)
    let subUrl = subPath.length > 0 ? `${domain}${subPath}?api_key=${ApiClient.accessToken()}` : ''
    console.log('subUrl:', subUrl)
    let streamUrl = ''
    if (itemInfo.FileName.endsWith('.strm') && mediaSource.Path?.startsWith('http')){
      streamUrl = mediaSource.Path
    } else if (mediaSource.IsInfiniteStream) {
      streamUrl = `${domain}/master.m3u8`
      streamUrl += `?api_key=${ApiClient.accessToken()}&Static=true&MediaSourceId=${mediaSourceId}&DeviceId=${ApiClient._deviceId}`
    } else {
      streamUrl = `${domain}/stream.${mediaSource.Container}`
      streamUrl += `?api_key=${ApiClient.accessToken()}&Static=true&MediaSourceId=${mediaSourceId}&DeviceId=${ApiClient._deviceId}`
    }
    let position = parseInt(itemInfo.UserData.PlaybackPositionTicks / 10000)
    let intent = await getIntent(mediaSource, position)
    console.log(streamUrl, subUrl, intent)
    return {
      streamUrl: streamUrl,
      subUrl: subUrl,
      intent: intent,
    }
  }


  async function getIntent(mediaSource, position) {
    // 直播节目查询items接口没有path
    let title = mediaSource.IsInfiniteStream ? mediaSource.Name : mediaSource.Path.split('/').pop()
    let externalSubs = mediaSource.MediaStreams.filter(m => m.IsExternal == true)
    let subs = '' //要求是android.net.uri[] ?
    let subs_name = ''
    let subs_filename = ''
    let subs_enable = ''
    if (externalSubs) {
      subs_name = externalSubs.map(s => s.DisplayTitle)
      subs_filename = externalSubs.map(s => s.Path.split('/').pop())
    }
    return {
      title: title,
      position: position,
      subs: subs,
      subs_name: subs_name,
      subs_filename: subs_filename,
      subs_enable: subs_enable,
    }
  }

  // 60秒后打勾标记已观看
  function setPlayed() {
    const btnPlaystateElement = document.querySelector(
      "div[is='emby-scroller']:not(.hide) .mainDetailButtons .btnPlaystate"
    )
    if (!btnPlaystateElement) {
      return
    }
    const playstate = btnPlaystateElement.getAttribute('data-played')
    if (playstate === 'false') {
      timeid = setTimeout(() => {
        btnPlaystateElement.click()
      }, 60000)
    }
  }

  //https://github.com/iina/iina/issues/1991
  async function embyIINA() {
    let mediaInfo = await getEmbyMediaInfo()
    let iinaUrl = `iina://weblink?url=${encodeURIComponent(mediaInfo.streamUrl)}&new_window=1`
    console.log(`iinaUrl= ${iinaUrl}`)
    window.open(iinaUrl, '_blank')
    setPlayed()
  }

  async function embyIINAServer() {
    let mediaInfo = await getEmbyMediaInfo()
    let url = `http://localhost:${IINAServerPort}/play?video=${encodeURI(mediaInfo.streamUrl)}`
    if (!!mediaInfo.subUrl) {
      url += `&subtitle=${encodeURI(mediaInfo.subUrl)}`
    }
    console.log(url)
    fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error('本地服务器没有响应')
        }
        return res.text()
      })
      .then(text => {
        if (text.startsWith('正在播放视频')) {
          setPlayed()
        }
      })
      .catch(error => {
        console.error('Error:', error)
      })
  }

  async function embyPotPlayer() {
    let mediaInfo = await getEmbyMediaInfo()
    let intent = mediaInfo.intent
    let poturl = `potplayer://${encodeURI(mediaInfo.streamUrl)} /sub=${encodeURI(mediaInfo.subUrl)} /current /seek=${getSeek(intent.position)} /title=${intent.title}`;
    console.log(poturl)
    window.open(poturl, '_blank')
    setPlayed()
  }

  //https://wiki.videolan.org/Android_Player_Intents/
  async function embyVLC() {
    let mediaInfo = await getEmbyMediaInfo()
    let intent = mediaInfo.intent
    //android subtitles:  https://code.videolan.org/videolan/vlc-android/-/issues/1903
    let vlcUrl = `intent:${encodeURI(
      mediaInfo.streamUrl
    )}#Intent;package=org.videolan.vlc;type=video/*;S.subtitles_location=${encodeURI(
      mediaInfo.subUrl
    )};S.title=${encodeURI(intent.title)};i.position=${intent.position};end`
    if (os == 'windows') {
      //桌面端需要额外设置,参考这个项目: https://github.com/stefansundin/vlc-protocol
      vlcUrl = `vlc://${encodeURI(mediaInfo.streamUrl)}`
    }
    if (os == 'ios') {
      //https://code.videolan.org/videolan/vlc-ios/-/commit/55e27ed69e2fce7d87c47c9342f8889fda356aa9
      vlcUrl = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(
        mediaInfo.streamUrl
      )}&sub=${encodeURIComponent(mediaInfo.subUrl)}`
    }
    console.log(vlcUrl)
    window.open(vlcUrl, '_blank')
    setPlayed()
  }

  //https://sites.google.com/site/mxvpen/api
  async function embyMXPlayer() {
    let mediaInfo = await getEmbyMediaInfo()
    let intent = mediaInfo.intent
    //mxPlayer free
    let mxUrl = `intent:${encodeURI(
      mediaInfo.streamUrl
    )}#Intent;package=com.mxtech.videoplayer.ad;S.title=${encodeURI(intent.title)};i.position=${
      intent.position
    };end`
    //mxPlayer Pro
    //let mxUrl = `intent:${encodeURI(mediaInfo.streamUrl)}#Intent;package=com.mxtech.videoplayer.pro;S.title=${encodeURI(intent.title)};i.position=${intent.position};end`;
    console.log(mxUrl)
    window.open(mxUrl, '_blank')
    setPlayed()
  }

  async function embyNPlayer() {
    let mediaInfo = await getEmbyMediaInfo()
    let nUrl =
      os == 'macOS'
        ? `nplayer-mac://weblink?url=${encodeURIComponent(mediaInfo.streamUrl)}&new_window=1`
        : `nplayer-${encodeURI(mediaInfo.streamUrl)}`
    console.log(nUrl)
    window.open(nUrl, '_blank')
    setPlayed()
  }

  //infuse
  async function embyInfuse() {
    let mediaInfo = await getEmbyMediaInfo()
    let infuseUrl = `infuse://x-callback-url/play?url=${encodeURIComponent(mediaInfo.streamUrl)}`
    console.log(`infuseUrl= ${infuseUrl}`)
    window.open(infuseUrl, '_blank')
    setPlayed()
  }

  //MPV
  async function embyMPV() {
    let mediaInfo = await getEmbyMediaInfo()
    //桌面端需要额外设置,使用这个项目: https://github.com/akiirui/mpv-handler
    let streamUrl64 = btoa(mediaInfo.streamUrl)
      .replace(/\//g, '_')
      .replace(/\+/g, '-')
      .replace(/\=/g, '')
    let MPVUrl = `mpv://play/${streamUrl64}`
    if (mediaInfo.subUrl.length > 0) {
      let subUrl64 = btoa(mediaInfo.subUrl)
        .replace(/\//g, '_')
        .replace(/\+/g, '-')
        .replace(/\=/g, '')
      MPVUrl = `mpv://play/${streamUrl64}/?subfile=${subUrl64}`
    }

    if (os == 'ios' || os == 'android'  || os == 'macOS') {
      MPVUrl = `mpv://${encodeURI(mediaInfo.streamUrl)}`
    }

    console.log(MPVUrl)
    window.open(MPVUrl, '_blank')
    setPlayed()
  }

  function getOS() {
    let u = navigator.userAgent
    if (!!u.match(/compatible/i) || u.match(/Windows/i)) {
      return 'windows'
    } else if (!!u.match(/Macintosh/i) || u.match(/MacIntel/i)) {
      return 'macOS'
    } else if (!!u.match(/iphone/i) || u.match(/Ipad/i)) {
      return 'ios'
    } else if (u.match(/android/i)) {
      return 'android'
    } else if (u.match(/Ubuntu/i)) {
      return 'Ubuntu'
    } else {
      return 'other'
    }
  }

  // monitor dom changements
  document.addEventListener('viewbeforeshow', function (e) {
    console.log('viewbeforeshow', e)
    if (e.detail.contextPath.startsWith('/item?id=')) {
      const mutation = new MutationObserver(function () {
        if (showFlag()) {
          init()
          mutation.disconnect()
        }
      })
      mutation.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    }
  })

  function getIconsExt(type) {
    const iconsExt = {
      IINA: `
            data:image/webp;base64,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
        `,
      IINAServer: `
            data:image/webp;base64,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
        `,
      PotPlayer : `
          data:image/webp;base64,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
        `,
      VLC: `
            data:image/webp;base64,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
        `,
      NPlayer: `
            data:image/webp;base64,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
        `,
      MXPlayer: `
            data:image/webp;base64,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
        `,
      Infuse: `
            data:image/webp;base64,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
        `,
      MPV: `
            data:image/webp;base64,UklGRqYTAABXRUJQVlA4WAoAAAAQAAAA4AAA4AAAQUxQSAUGAAABoMZq2/K2uSUnhVhWMSCXGVxmCJSZU7nMzNxuy+qSh6m8MlpZSR7zVmbmNlMZ5TEm0pifH6bP3/e+zzNWREwANJhCcbWB/QntRz0Zn76lktiWULHzuJfOfEMmvHtox6S+rrLMKtVs1PJrZPIH63Pc6VzKeHTbNbLo+TWLstO54xg1e3eQrJ0fyHFxJcFRvPjyICnxwdGnu7DERUo98dIybjQa9xKpNhhcX50RFWcfJiVfe3W0iwXVuq8NkrrPPN1de45G20jx56e69ObeTxo8kdNBW47Ox38lPZ55uome2r9FGj3vSdLQxs9Jr58NSdXMsG9Iv+/0smmk2Uuk50Wpuijlvke69g8pq4VWr5HOl1XRwOQg6T0/uyhQVGUZ/l9J+74sKLyU+zhxML+DwpYTE4Pziyqq2mHi4xqXihL6HCZO7uiuoGHEzN0u1SRM/pwbdHSIWpyLiaH5M1SSsZ9YGsytoozOu4mrT9sU0eg14qvXqYJSoy4QZ31JChhFzN3hsFy1M9yhnLIWy/ATf31OS7X6mDjsSbJQylvE403WSdlITP5+UpJVRhGfR1jEfY9R19yWGHCPOH20lwVaXSBeH00131vEba/ZHIuJ3UFPKXNNJ46PMFXGGZYdamAixzbiecBEi4npBX1Nk/Ex1yjgMknx48T3XJMsIMb/1N0Uk3/lHJ1vYIZdxHuPCboXMC+/VfyuEff9peI1nfjvjVOzjwVwrUp8dpEEvXFpTzJ0xKHifiHsi4ObhFjQyrCEt6RAO4xKqEZifNDcKBKk36ABkjjvMsYvCfIa4vxYFEcbGLGcZDnDgGrXhHHJADcJ85sOsW2TBvliSiF51o5lrUC8sZBA78ZQSyKUHt1zIsmN7nORHIqqFYm0oHY0z8qEvFEkXBPK7ii6k1AfVIn0pFRoRKTdYsmNVCCWdyI4Saz5VcINkwv1DfesYOaEuyCYo2Eq/iCYYNkQN0k2PWS5aEaE7BbN+pB7otkHoDiJtiAJcMqGnEA14TQA+ginL/CscDzAfuE8D3wjnN0oTsL9DCTev0U55fP/2r+uIJ5vIJ5C2M4J5wNgj3DuAJuFsxd4Ujh5wEzhPA6MFM4ooKRwKgN24SQDiUdEc7UYgFdFcxQApolmZohbNANDmoqmbki5K5JxhGCXYHbawywTzHyEzRZMh3BN8+XSMBy2i2VnYgSvWB5FxGyxpEdqKpVTFSI5AkLZhigXCmVmNA1ui+T9utHgLZGcQpQ2zBTJzGiAzEKBfF01OlwRyFnE6P9UHjtjwUfi+LRkTBvEsQEx1/xRGF9kxYZ3hfEKDJwojFFGlDkpiqtpRiBHFFNgaNs9grhfwRhME8RCGNxKDmfTjbKtFMMzMLzjQyF8kG4cVgthLeLY6J4IfmwYD/hFsBVxtV8TQGHV+CD7I/4NRLxfZ1+gctz6HGPenf6Iv4d5a2HCym+x7kWnGdCHdWNgSruPcR6HOVDxJNtONYFZ3Q+Z9sUkmHcd01bAxDXPsexQspngDnJsEMz9KMNmwuT2lexaYTcbqm1m1uo0mL/Lq6zKqwordrnCqOtdYc0pfLo0CBa159zm0nhY18OkbYkWKudjUcABK9uXMWitE9ZO9j7kzs7SsPxq5hyqDOuX87BmW0mosKSHMauTocaSG37kSqAylLmaJ1/nQaG2mRwpXAalJs48wo47M6HangeZ8V4vqDfzVVZsagIVV1vHiLwKULNt4adM+O3RRCg7+10WnG0DlTfd/o32Ps6rD8VPPKK5U+Oh/kYrH+psU0NoceRNbR2dUhKadPiCWrq0qSo02ueYhgLp0OycHzVTON4J7Sav/lEjhYE0aLncS19oonBtQ2i7VeC2Bt7f1AFa77L5nOIuBbKg/abegwq79WR9sNA2Zd8varo00AE+tlv3o3oCWWBm8sLbSjnvqwWOZvqOfKOGvfPb2MDWzNV7rlnsxIvzm5cGc0tmP/n6basceKZHLTC59pCFr5qs8IvXH+9U3w5WJya72s7bfs8Ut47mjqkLB7ie2G7YMv+xe8b8+OmbO3MfTXbYIMW0GNKgTwBWUDggeg0AABBJAJ0BKuEA4QA+kT6ZSCWjoqEwFBoQsBIJZW7ZRtsAcg06nTGoOxtONdlgCtZDuJ/1/mT11gunarLXB/colWzoAeKvoa/O/9d7Cf8x6dH7r+xD+2iQlEzmM8vxUwra1YTDK/1nOp+lFqzDgo4WMI8FvsAC4bxexmCGFyG2gSncQXXcqUm1zJ3qsGMlbYrzbR5ygILonkH+goC0SzIrBl7BcilfUg2w/+ihP7b5feNA8ktgXzJuFvbTE06CU0ZNXVcNeGptALKH1PH5r8oN9scI6tCSNCQ1XHFqUzGBBc0fbFa7cXJPgkJKhyiEQc3g3PlhdgGRHXfUD5alDg6C7sQswqyOx1vBL8joi/HGqWW/eDxNfR+hubbHUT0YM6e2B3istLqs7gZFmracfVjshDNdLM6g1YdsVZe6RYhdMv41Jsm8tdVcDELgtQQWd7NtiaYlEKrlfO26wdyb9a5J/Er1gAb5mvGKfYZ3DkAWL6+eOCM5Gf73+pXKeG7DBSSPFHGkaAzWFdz1ZAKWoPwkTulrnmUEJsiG3z7L4MwS6XnLC3Zxn8GIpmYexQdobP5IM/DSNmPPOtBUDnkrZc4l43Z1kqmV4DYcIoaHNVFK2ZBFdxfiKbXvginZKp6WoQY7oAyBNjD1dtZ2AL0H2z5q/RYI4nlEVPVcjILyBsybacKKob0jc1t0Bn4Ww3n8ooi2hRYZXR33nOLSC8wqPyVNwn/X8r5Ac4iBdsI+PrFhLtOcX2Bxw5y8N8RSAPRIb0Z4gQYqW1OnXwnDjq+cmZ1A32wAAP7H/AA7euPUbr5ni8E3M6hZGXmTEqes3n9ncXGcg7nXAPlxGLVe3AYXZqAFzC2HkNUC24/EAOpXj7mOmEDmVNX72p9kSTSJfG4bSCiCLUZ55W5gUuRb7cQ9hLRsHSdyH4iQf0ymtvhskRL+VrDVbqg4SCiuqvlPH4xN10vy64pn75aFJFLPsx/8jRNJegZ8wCa+qAngG0m42fXZdDeRlmrB35i2m+rscB1AewRGCYBwzSMO64S8kXEYNzFyond07qhG7DsKZ6Csi/477tzadreHVAxE8cLUciuZyzTaDNV1b9YZM6NjrMtA/WjKWcTpejtRHrrjn6WADt1UKxJdCf7K3XoiLcgr71+s9jW3ffJh8oiY2jIOwEBnQs0Ddf1NYdzvlkMH48eKawBum4iBZf9yCVmHXDwPr+RVawHCqEyIWe8PrG5XERDJYC4gSXqaA6ma+5kA8FInPD+SQ4vgYC8WB6DKOJg4eFjYT53MaxRrXoQaNQJ6jF18NbASN0ee1e78OjstbaM7pGq3mLA9ML4v3G18Q9xjgd4+PB+msgyDzK+dq02OeOqU/fUxAC25Zr98byN8ufYcecOyqdCGk+qwRLRSdIe9y4C9Eed81Sug6joohrvk6MHSyELPfULAOH2Ra56GiI7D0LF/T5nX4EF6LqAweeG64rss7TdTuYBR7hxpg8R4QmMHGIVJhLHtVLrxTUBipnYsSYA2A95xDKwac/zKzSudMBCFUq/jagmjTmrysqUsT2MvQdNQRT1uvrXkvFlpDmW2WIHaaYWL67ciDxL8x76yAhi2l+qvjjPTXXMDFAIv0rASU/sNVr2CbQoWow/KPlCifGwr7zlS4CUbBzW1XaRiBcsCPyddv64YBqfrZs3rRzo2czPntwbC9l3wHaTqo9DLIBE7D3lO6koyoRU2KSHgWRGVzwRigzbsvdDZ38uubHFkOqcoFy1lU0AwnTmeUXXieIDnJRCZrLBv5GQ0ABvqtfD/Bh/ajkHVQkCWgf28H0ERoNPubsV5LUVdC9DzfSXy1TLhjTJRYIYizTpNljQm1dsHYTh2jrjAwmNXjEECKadZ9vfQdkkgapWWlv5217tsJHmvGsc6B2Y0++t5G3XwXL/rGhsrKmKDymO46XXVqvvl5wYCxgkCTnc+9t9Xz4naIL1ooToMsbIFQsdTOOazxfAdqAgRa2H6KzCXdiEQcgriQt2I1tdcfvxB4wfCmp/Rt/oAhdFuVCwVmyAbAJ/7VeoxjE4Y9bIJcVGwNIicL7PmUuw3Aa9rP259F3GcsYfx0H7WTjwHCBwjmPsZxcALgyecGKj/g8celpKzf6O8Q1g36UmKNQmARj1umNZi4mGneC1kEw1FYjnnSaHTQeqVFSbhNlIktJ8ZbvLYG7h9tiUbzkYfkSW40lYtiWxHSacH6HrWdvyM8XBDGP4XW+5h5gpCB1ZWytrVhWXI+JPxEFHXSzk0k98YbIS/KBRTI7Ru3LANBH/CsUajZZOJIDN22DsFhxXOOogACUP4UrYjLG2A4GLl93lZM3eKd1LhfyAq4ZfQeqLJGKd+528gktLGHLBduBN+QqEn2cBp5KTYjdaOS8lw9VSF1fay/t5j6YFCEUXBOe8DXTuGeSD2xN/wqiF4egFuv78Nlp8jFEtwLMXcqn2Ehx+7BCe8Pg2lYGxnX/x5Q3UWR33Y55BMuNXF4W7PX29cGJu9G6mVQVk+GeKTecaIR9nLKRZYO7fckjVLLmEMqtR9M8G0skvHZFRQr0euVpiWLZ6FA8I98kLD8u9/Kc3QNwjNnjP+c6JPMH5apuOniC6hnYE7dC/zmtBf9TVf0nz7AwTDf+2foXfPITZOVhPYQhaqVhpuYS/hlfh62b5tO1Y3bLR7UP10ODdvLmxYQNqbKVpyMNFwP64RmmvwVR7XSsJsw3cYuULMeRWymDRwJOYwj+VU71YsSv0HKEY8o8tzXIv7zpyUw6br1UWRxfK2co0GLKE4IK+ymu+TESCiC5c1GE19f4g3ZLh6AG/YGsjQFoj2yysHHXDav3G81lIEd50vzv2xmMyAu7n7anu0ylyCXgDJc0BUw9W5azPDAnc7+sFILHizFLMsv/zkUrkoWNArqXiraBZdHfjzSxKdFqnI74vzJ0nqYyRDU9A/74ijEd18cJMV7GaLuTx+UbkBLc14UMgrPIDqTj27wlc7WB8XrGveV9BxLNHfZfRy7ss2BCgidKnyw6o7hCCwQi+HmEEl/a+EGW7ubfseSyMDwMQfyNYNxPa045MEGKqhtSPcTd7C7q97Kk53ye/be37aFOEa6fx0+UNpjyPHf/SHYzzBJ8LGScfrfOe3/K9iKPr71p7EH094S7/1EPRt83A5FKAJoJ2/W9+qQ936b5Dcdf4+kZjJ1sQIdIxpNSgEIXH0EyZEFO5+0ax6ebGJafX6kC4jynXeRDzcHyc/MIR8umbmzrRzr5fb2zoMiK/E8APThgSgVAolDp8gNyypcDlm+o1I+73PeRsvliw2YT+lGXh+LNt8i86XwCFUehmXu/AzLLKaokUW7uDO+g6GkT9thg87lQYr6g82WYohG6XNBVVWNx0MzXEFc6DqVUPKiR6/yk2prim1QxM0zsoHEhrMbRV/my0ckfwGMhxRenq4A8vrqt4N8R+XfdE3tT74ueuLf8rmokKWm7d7oPidl8Egn9JtalPcYhVuFHY8wLY7K64fPK8jntN3iICKCkpiNztsv8s6BxAyGoFkWjcfqz2ydAYQybYddMbGpTcGyZWJPiisXVMVV2+3bPahxjCMntyzwyyL22yL4aWXS9JxCYaPzmMTiYG8eYVuRTnfUMiaR+ECt+BsFL52bfNDq0qlhyCuMqQbgd5vDSZppYGHuxUujTl7w8ZH7OtHzsD1g/n02L5tTPqzRKmIFTd9krHhSHKfStll6WjsT5VDHgEXAtZDPkw9axPJT2tky/jvgw7mQ9j0qmdGqy/VlQ1Bh8EK2fW0ZIbd2x4Cz/yri8CsSXcLztfRBJ+/WWxLlDBffhQzuCi2lnm222BpdbIRUrN6h2lZSpzE24k/YVPlmHs5DCpaKYNKpy8VRI3aUJTWepigjelKcy4cJd7i8XvkCafhKy06j2iqhpEKb9qN953cUCWLGVm65eRbuoQmK98v/OBwQDPH/9XsQNpIH1Vy2iDYFQx/9Cmhgo7GgUcfzwuHN4sOsimOQuXUbh/gClretNwOsVJEn4Yf3oCa6eN3Q4dF3m60HTM0z7c3X9FRR21NSy8Hxepl5nAsesSGaYM6SEUzN/ge2hJgqRf3WhYL98GjNaAunNS70BmnmzX9iaRQgxwCbXr+u9He6eoFUc/DVbWQvo4byGJD9UPQ+cI13UND8ywfc/Tx5hRToSKMshC1RTEIL6f/48VpePUqNM9+kR/yFuJXFrjAAgSwyjbgnvlQZ7kdbP6l+gSReD4eu9xcc5ZugDyn/Uxn5Yczi9aqdcelilIQjG5E12B/VokPlxXYf0Xu+eV3HAdzrr8+Ce7ZgB5wu+XYVBdrDOffZo0pr/PpeWm02uxkc1AT2DM1W1s50k5HUgNEZh7GJ3VvZXxuQ48VEGji0F6KOX3Ogvx0/YlQZ8HjCWr8qelh86fI9h7x6Oaf/kPeQg38PVq6epU9WJ8SbkIoCqIN9J4xWrjt8TJn9oLvcO4y33w+WA38f+JBLRTSFVC9YBPLSG2GOO1QArntlnqksmo2HSIw5Erz52K8VXATju11Ak91+QCNE2POf6LGB/AHT5AAAAAAAl1znT1Dxo1fFLpVIRvrWYBj5UmZ7OaZ1UmNr3vALZAAAA==
        `,
    }
    return iconsExt[type]
  }
})()