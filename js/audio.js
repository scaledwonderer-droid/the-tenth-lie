export class AudioManager {
  constructor(manifest, settings) {
    this.manifest = manifest || { bgm: {}, se: {} };
    this.settings = Object.assign({ bgmVolume: 70, seVolume: 70 }, settings || {});
    this.unlocked = false;
    this.currentTrack = null;
    this.currentAudio = null;
    this.fadeTimer = null;
  }

  setVolumes(settings) {
    this.settings = Object.assign({}, this.settings, settings || {});
    if (this.currentAudio) this.currentAudio.volume = Number(this.settings.bgmVolume || 0) / 100;
  }

  unlock() {
    this.unlocked = true;
  }

  setScreen(screen, data) {
    if (!this.unlocked) return;
    const trackIds = {
      title: "title",
      caseSelect: "title",
      settings: "title",
      wallpapers: "title",
      dialogue: data && data.dialogueKind === "resolution" ? "resolution" : "investigation",
      testimony: "investigation",
      deduction: "deduction",
      accusation: "deduction",
      defeat: "defeat",
      gameOver: "defeat",
      caseClosed: "resolution"
    };
    this.playBgm(trackIds[screen] || null);
  }

  playBgm(id) {
    const path = id && this.manifest && this.manifest.bgm ? this.manifest.bgm[id] : null;
    if (!path) {
      this.fadeOut();
      this.currentTrack = null;
      return;
    }
    if (id === this.currentTrack && this.currentAudio) return;
    this.fadeOut();
    const audio = new Audio(new URL(path, document.baseURI).href);
    audio.loop = true;
    audio.volume = 0;
    audio.preload = "none";
    this.currentAudio = audio;
    this.currentTrack = id;
    audio.play().then(() => this.fadeIn(audio)).catch(() => {});
  }

  fadeIn(audio) {
    if (this.fadeTimer) window.clearInterval(this.fadeTimer);
    const target = Number(this.settings.bgmVolume || 0) / 100;
    const started = Date.now();
    this.fadeTimer = window.setInterval(() => {
      if (audio !== this.currentAudio) {
        window.clearInterval(this.fadeTimer);
        return;
      }
      const ratio = Math.min(1, (Date.now() - started) / 450);
      audio.volume = target * ratio;
      if (ratio >= 1) window.clearInterval(this.fadeTimer);
    }, 24);
  }

  fadeOut() {
    if (this.fadeTimer) window.clearInterval(this.fadeTimer);
    this.fadeTimer = null;
    const audio = this.currentAudio;
    if (!audio) return;
    this.currentAudio = null;
    const initial = audio.volume;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - started) / 300);
      audio.volume = initial * (1 - ratio);
      if (ratio >= 1) {
        window.clearInterval(timer);
        audio.pause();
        audio.src = "";
      }
    }, 24);
  }

  playSe(id) {
    if (!this.unlocked) return;
    const path = this.manifest && this.manifest.se ? this.manifest.se[id] : null;
    if (!path || Number(this.settings.seVolume || 0) <= 0) return;
    const audio = new Audio(new URL(path, document.baseURI).href);
    audio.volume = Number(this.settings.seVolume) / 100;
    audio.preload = "none";
    audio.play().catch(() => {});
  }
}
