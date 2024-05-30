function init(pluginManager, dialog) {
  class PotPlayer {
    constructor() {
      this.id = 'potplayer'
      this.type = 'mediaplayer'
      this.name = 'Pot Player'

      function dummy() {}

      for (const k of ['volume', 'isMuted', 'paused', 'currentTime', 'currentSrc']) {
        this[k] = dummy;
      }
    }

    canPlayMediaType() {
      return true;
    }

    getPlayerUrl(url) {
      if (navigator.userAgent.includes('Macintosh')) {
        return `iina://open?url=${encodeURIComponent(url+"&Static=true")}`;
      }

      return `potplayer://${encodeURI(url)}`;
    }

    async play(item, options) {
      console.log('item');
      console.log(item);
      console.log('option');
      console.log(options);

      const playerUrl = this.getPlayerUrl(item.url);
      window.open(playerUrl, '_self');

      if (item.textTracks.length === 0) {
        return;
      }

      const mediaStreams = item.mediaSource.MediaStreams;
      const html = item.textTracks.map(track => {
        return `<p><a href="${track.url}" target="_blank">${mediaStreams[track.index].DisplayTitle}</a></p>`
      }).join('\n');

      dialog({
        html,
        title: 'Subtitles',
        buttons: [
          {
            name: 'Close',
            type: 'cancel',
          },
        ],
      });
    }

    async stop() {}

    async getDeviceProfile(item, options) {
      const subFormats = ['ass', 'srt'];
      return {
        SubtitleProfiles: subFormats.map(type => (
          {
            "Format": type,
            "Method": "External"
          }
        )),
      };
    }
  }


  pluginManager.register(new PotPlayer());

  console.log('Pot Player plugin registered');
}

(async function() {
  'use strict';

  while (!window.require || !window.ConnectionManager) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  window.require(['pluginManager', 'dialog'], init);
})();