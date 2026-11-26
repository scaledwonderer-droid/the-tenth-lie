import { loadState, saveState, clearState, createDefaultState } from "./save.js";
import { escapeHTML } from "./dialogue.js";
import { isCorrectAccusation } from "./rules.js";

const GAME_SCREENS = new Set(["dialogue","testimony","deduction","accusation","defeat","gameOver","caseClosed"]);
const SPEEDS = { 0: 0, 1: 42, 2: 22, 3: 9 };

export class GameController {
  constructor(root, caseList, cases, characters, audio) {
    this.root = root;
    this.caseList = caseList || [];
    this.cases = cases || {};
    this.characters = characters || {};
    this.audio = audio;
    this.state = loadState();
    this.typingTimer = null;
    this.toastTimer = null;
    if (!this.cases[this.state.currentCase]) {
      this.state.currentCase = null;
      this.state.screen = "title";
      this.state.resume = null;
    }
    this.audio.setVolumes(this.state.settings);
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.root.addEventListener("click", event => {
      this.audio.unlock();
      const actionNode = event.target.closest("[data-action]");
      if (actionNode) {
        const action = actionNode.dataset.action;
        this.audio.playSe(action === "confirm-accusation" ? "confirm" : "select");
        this.handleAction(action, actionNode);
        return;
      }
      if (event.target.closest("[data-advance]")) this.advance();
    });

    this.root.addEventListener("change", event => {
      const target = event.target;
      if (target.matches("[data-select]")) {
        this.audio.unlock();
        this.audio.playSe("select");
        if (target.dataset.select === "culprit") {
          this.state.accuseCulprit = target.value;
          if (this.state.accuseAccomplice === target.value) this.state.accuseAccomplice = "";
        } else if (target.dataset.select === "accomplice") {
          this.state.accuseAccomplice = target.value;
        }
        this.persist();
        this.render();
      }
    });

    this.root.addEventListener("input", event => {
      const target = event.target;
      if (!target.matches("[data-setting]")) return;
      const key = target.dataset.setting;
      this.state.settings[key] = Number(target.value);
      this.audio.setVolumes(this.state.settings);
      const output = this.root.querySelector("[data-setting-value='" + key + "']");
      if (output) output.textContent = this.settingDisplay(key, this.state.settings[key]);
      this.persist();
    });

    window.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.code !== "Space") return;
      if (event.target && ["BUTTON","SELECT","INPUT","TEXTAREA"].includes(event.target.tagName)) return;
      if (["dialogue","testimony","defeat"].includes(this.state.screen)) {
        event.preventDefault();
        this.audio.unlock();
        this.advance();
      }
    });
  }

  handleAction(action, node) {
    switch (action) {
      case "game-start": this.startGame(); break;
      case "case-select": this.showCaseSelect(); break;
      case "open-case": this.openCase(node.dataset.caseId); break;
      case "go-title": this.goTitle(); break;
      case "back": this.goBack(); break;
      case "settings": this.openUtility("settings"); break;
      case "wallpapers": this.openUtility("wallpapers"); break;
      case "toggle-fullscreen": this.toggleFullscreen(); break;
      case "clear-save": this.resetSave(); break;
      case "advance": this.advance(); break;
      case "choose-suspect": this.chooseSuspect(node.dataset.suspectId); break;
      case "choose-evidence": this.chooseEvidence(node.dataset.evidenceId); break;
      case "right-tab": this.setRightTab(node.dataset.tab); break;
      case "accuse": this.beginAccusation(); break;
      case "accuse-next": this.accusationNext(); break;
      case "accuse-back": this.accusationBack(); break;
      case "return-deduction": this.returnToDeduction(); break;
      case "confirm-accusation": this.confirmAccusation(); break;
      case "retry": this.retry(); break;
      case "case-select-from-end": this.showCaseSelect(); break;
      case "next-case": this.goNextCase(); break;
      default: break;
    }
  }

  persist() {
    saveState(this.state);
  }

  setBackground(path) {
    const background = document.getElementById("sceneBackground");
    if (background) {
      const nextImage = path ? 'url("' + new URL(path, document.baseURI).href + '")' : "none";
      const currentImage = this.backgroundImage || 'url("' + new URL("assets/backgrounds/common/common_bg_office.png", document.baseURI).href + '")';
      if (nextImage !== currentImage && currentImage !== "none") {
        if (this.backgroundTimer) window.clearTimeout(this.backgroundTimer);
        background.style.setProperty("--previous-image", currentImage);
        background.classList.add("crossfading");
        this.backgroundTimer = window.setTimeout(() => {
          background.classList.remove("crossfading");
          background.style.removeProperty("--previous-image");
          this.backgroundTimer = null;
        }, 480);
      }
      background.style.backgroundImage = nextImage;
      background.classList.remove("effect-darken");
      this.backgroundImage = nextImage;
    }
  }

  render() {
    this.stopTyping();
    this.shouldAnimateTransition = this.lastRenderedScreen !== this.state.screen;
    if (this.state.screen === "title") this.renderTitle();
    else if (this.state.screen === "caseSelect") this.renderCaseSelect();
    else if (this.state.screen === "dialogue") this.renderDialogue();
    else if (this.state.screen === "testimony") this.renderTestimony();
    else if (this.state.screen === "deduction") this.renderDeduction();
    else if (this.state.screen === "accusation") this.renderAccusation();
    else if (this.state.screen === "defeat") this.renderDefeat();
    else if (this.state.screen === "gameOver") this.renderGameOver();
    else if (this.state.screen === "caseClosed") this.renderCaseClosed();
    else if (this.state.screen === "settings") this.renderSettings();
    else if (this.state.screen === "wallpapers") this.renderWallpapers();
    else this.renderTitle();

    this.audio.setVolumes(this.state.settings);
    this.audio.setScreen(this.state.screen, this.state);
    if (["dialogue","testimony","defeat"].includes(this.state.screen)) {
      const line = this.visibleLine();
      if (line && line.bgm) this.audio.playBgm(line.bgm);
      if (line && line.se) this.audio.playSe(line.se);
      this.startTyping();
    }
    this.lastRenderedScreen = this.state.screen;
  }

  mount(html, backgroundPath) {
    this.setBackground(backgroundPath || this.case()?.backgrounds.office);
    const scene = document.getElementById("sceneBackground");
    const visibleLine = this.visibleLine();
    if (scene) scene.classList.toggle("effect-darken", visibleLine && visibleLine.effect === "darken");
    this.root.innerHTML = html;
    if (this.shouldAnimateTransition) {
      this.root.classList.remove("screen-enter");
      void this.root.offsetWidth;
      this.root.classList.add("screen-enter");
    } else {
      this.root.classList.remove("screen-enter");
    }
  }

  currentCaseMeta() {
    return this.caseList.find(item => item.id === this.state.currentCase) || this.caseList[0] || null;
  }

  case() {
    return this.cases[this.state.currentCase] || null;
  }

  character(id) {
    return this.characters[id] || { id: id, name: id || "", portrait: "", gender: "unknown" };
  }

  characterName(id) {
    return this.character(id).name || "";
  }

  header() {
    return '<header class="app-header">' +
      '<button class="brand-mini" data-action="go-title" aria-label="タイトルへ戻る">' +
        '<img src="assets/logo/title_logo.png" alt="十人目の嘘 THE TENTH LIE">' +
        '<span>CASE FILES</span>' +
      '</button>' +
      '<div class="header-actions">' +
        '<button class="quiet-button small" data-action="case-select">事件選択</button>' +
        '<button class="icon-button" data-action="settings" aria-label="設定" title="設定">⚙</button>' +
      '</div>' +
    '</header>';
  }

  startGame() {
    if (this.state.resume && this.state.resume.screen) {
      const resume = Object.assign({}, this.state.resume);
      this.state = Object.assign(createDefaultState(), resume);
      this.state.resume = null;
      this.persist();
      this.render();
      return;
    }
    const next = this.caseList.find(item => this.state.unlockedCases.includes(item.id) && !this.state.solvedCases.includes(item.id));
    if (next) this.openCase(next.id);
    else this.showCaseSelect();
  }

  snapshotForResume() {
    const snapshot = Object.assign({}, this.state);
    snapshot.resume = null;
    return snapshot;
  }

  goTitle() {
    if (GAME_SCREENS.has(this.state.screen)) this.state.resume = this.snapshotForResume();
    this.state.screen = "title";
    this.persist();
    this.render();
  }

  showCaseSelect() {
    if (GAME_SCREENS.has(this.state.screen)) this.state.resume = this.snapshotForResume();
    this.state.screen = "caseSelect";
    this.persist();
    this.render();
  }

  openCase(caseId) {
    if (!this.cases[caseId] || !this.state.unlockedCases.includes(caseId)) return;
    this.state.currentCase = caseId;
    this.state.screen = "dialogue";
    this.state.dialogueKind = "intro";
    this.state.dialogueIndex = 0;
    this.state.suspectIndex = 0;
    this.state.testimonyIndex = 0;
    this.state.selectedSuspectId = this.cases[caseId].suspects[0].id;
    this.state.selectedEvidenceId = this.cases[caseId].evidence[0].id;
    this.state.rightTab = "overview";
    this.state.accuseStep = "culprit";
    this.state.accuseCulprit = "";
    this.state.accuseAccomplice = "";
    this.state.resume = null;
    this.persist();
    this.render();
  }

  openUtility(screen) {
    if (GAME_SCREENS.has(this.state.screen)) this.state.returnScreen = this.state.screen;
    else if (this.state.screen !== "settings" && this.state.screen !== "wallpapers") this.state.returnScreen = this.state.screen;
    this.state.screen = screen;
    this.persist();
    this.render();
  }

  goBack() {
    const target = this.state.returnScreen || "title";
    this.state.screen = target;
    this.persist();
    this.render();
  }

  resetSave() {
    if (!window.confirm("解放・解決状況と設定を初期化します。よろしいですか？")) return;
    this.state = clearState();
    this.audio.setVolumes(this.state.settings);
    this.render();
  }

  sequence() {
    const data = this.case();
    if (!data) return [];
    if (this.state.dialogueKind === "intro") return data.introduction || [];
    if (this.state.dialogueKind === "lead") return data.deductionLead || [];
    return data.resolution || [];
  }

  visibleLine() {
    if (this.state.screen === "dialogue") return this.sequence()[this.state.dialogueIndex] || null;
    if (this.state.screen === "testimony") {
      const suspect = this.case().suspects[this.state.suspectIndex];
      return suspect ? { text: suspect.statement[this.state.testimonyIndex] || "" } : null;
    }
    if (this.state.screen === "defeat") return this.case().defeat[this.state.dialogueIndex] || null;
    return null;
  }

  advance() {
    const screen = this.state.screen;
    if (screen === "dialogue") {
      if (this.revealTyping()) return;
      const lines = this.sequence();
      if (this.state.dialogueIndex + 1 < lines.length) {
        this.state.dialogueIndex += 1;
      } else if (this.state.dialogueKind === "intro") {
        this.state.screen = "testimony";
        this.state.suspectIndex = 0;
        this.state.testimonyIndex = 0;
      } else if (this.state.dialogueKind === "lead") {
        this.state.screen = "deduction";
        this.state.rightTab = "overview";
      } else {
        this.completeCase();
        return;
      }
      this.persist();
      this.render();
      return;
    }
    if (screen === "testimony") {
      if (this.revealTyping()) return;
      const data = this.case();
      const suspect = data.suspects[this.state.suspectIndex];
      if (this.state.testimonyIndex + 1 < suspect.statement.length) {
        this.state.testimonyIndex += 1;
      } else if (this.state.suspectIndex + 1 < data.suspects.length) {
        this.state.suspectIndex += 1;
        this.state.testimonyIndex = 0;
      } else {
        this.state.dialogueKind = "lead";
        this.state.dialogueIndex = 0;
        this.state.screen = "dialogue";
      }
      this.persist();
      this.render();
      return;
    }
    if (screen === "defeat") {
      if (this.revealTyping()) return;
      const lines = this.case().defeat || [];
      if (this.state.dialogueIndex + 1 < lines.length) this.state.dialogueIndex += 1;
      else {
        this.state.screen = "gameOver";
        this.state.dialogueIndex = 0;
      }
      this.persist();
      this.render();
    }
  }

  completeCase() {
    const caseId = this.state.currentCase;
    if (!this.state.solvedCases.includes(caseId)) this.state.solvedCases.push(caseId);
    const currentIndex = this.caseList.findIndex(item => item.id === caseId);
    const next = this.caseList.slice(currentIndex + 1).find(item => item.unlocksAfter === caseId);
    if (next && !this.state.unlockedCases.includes(next.id)) this.state.unlockedCases.push(next.id);
    this.state.screen = "caseClosed";
    this.state.resume = null;
    this.state.dialogueIndex = 0;
    this.persist();
    this.render();
  }

  chooseSuspect(id) {
    if (!this.case().suspects.some(item => item.id === id)) return;
    this.state.selectedSuspectId = id;
    this.persist();
    this.render();
  }

  chooseEvidence(id) {
    if (!this.case().evidence.some(item => item.id === id)) return;
    this.state.selectedEvidenceId = id;
    this.persist();
    this.render();
  }

  setRightTab(tab) {
    this.state.rightTab = tab === "evidence" ? "evidence" : "overview";
    this.persist();
    this.render();
  }

  beginAccusation() {
    this.state.screen = "accusation";
    this.state.accuseStep = "culprit";
    this.state.accuseCulprit = "";
    this.state.accuseAccomplice = "";
    this.persist();
    this.render();
  }

  accusationNext() {
    if (this.state.accuseStep === "culprit") {
      if (!this.state.accuseCulprit) {
        this.showToast("犯人を選択してください");
        return;
      }
      this.state.accuseStep = "accomplice";
    } else if (this.state.accuseStep === "accomplice") {
      if (!this.state.accuseAccomplice) {
        this.showToast("共謀者、または「共謀者なし」を選択してください");
        return;
      }
      this.state.accuseStep = "confirm";
    }
    this.persist();
    this.render();
  }

  accusationBack() {
    if (this.state.accuseStep === "confirm") this.state.accuseStep = "accomplice";
    else if (this.state.accuseStep === "accomplice") this.state.accuseStep = "culprit";
    else this.state.screen = "deduction";
    this.persist();
    this.render();
  }

  returnToDeduction() {
    this.state.screen = "deduction";
    this.persist();
    this.render();
  }

  confirmAccusation() {
    const solution = this.case().solution;
    if (isCorrectAccusation(this.state.accuseCulprit, this.state.accuseAccomplice, solution)) {
      this.state.dialogueKind = "resolution";
      this.state.dialogueIndex = 0;
      this.state.screen = "dialogue";
    } else {
      this.state.dialogueIndex = 0;
      this.state.screen = "defeat";
    }
    this.persist();
    this.render();
  }

  retry() {
    this.state.screen = "deduction";
    this.state.dialogueIndex = 0;
    this.state.accuseStep = "culprit";
    this.state.accuseCulprit = "";
    this.state.accuseAccomplice = "";
    this.persist();
    this.render();
  }

  nextCase() {
    const index = this.caseList.findIndex(item => item.id === this.state.currentCase);
    return this.caseList.slice(index + 1).find(item => this.state.unlockedCases.includes(item.id)) || null;
  }

  goNextCase() {
    const next = this.nextCase();
    if (next) this.openCase(next.id);
    else this.showCaseSelect();
  }

  renderTitle() {
    this.setBackground(this.caseList.length ? this.cases[this.caseList[0].id].backgrounds.office : null);
    const hasResume = !!(this.state.resume && this.state.resume.screen);
    this.root.innerHTML =
      '<section class="title-screen ' + (this.shouldAnimateTransition ? "screen-enter" : "") + '">' +
        '<div class="title-brand">' +
          '<img class="title-logo" src="assets/logo/title_logo.png" alt="十人目の嘘 THE TENTH LIE">' +
          '<p class="title-tagline">A MURDER MYSTERY ADVENTURE</p>' +
        '</div>' +
        '<nav class="title-menu panel" aria-label="メインメニュー">' +
          '<p class="eyebrow">MENU</p>' +
          '<button class="primary-button" data-action="game-start">' + (hasResume ? "つづきから" : "ゲーム開始") + '</button>' +
          '<button class="secondary-button" data-action="case-select">事件選択</button>' +
          '<button class="secondary-button" data-action="settings">設定</button>' +
          '<button class="secondary-button" data-action="wallpapers">壁紙ダウンロード</button>' +
          '<p class="menu-note">解放済みの事件は、事件選択からいつでも再プレイできます。</p>' +
        '</nav>' +
      '</section>';
    this.audio.setVolumes(this.state.settings);
    this.audio.setScreen("title", this.state);
  }

  renderCaseSelect() {
    const cards = this.caseList.map(item => {
      const solved = this.state.solvedCases.includes(item.id);
      const unlocked = this.state.unlockedCases.includes(item.id);
      const status = solved ? "解決済み" : unlocked ? "未解決" : "未解放";
      const dot = solved ? "solved" : unlocked ? "" : "locked";
      const disabled = unlocked ? "" : " disabled";
      return '<button class="case-card panel" data-action="open-case" data-case-id="' + escapeHTML(item.id) + '"' + disabled + '>' +
        '<span class="case-status"><i class="status-dot ' + dot + '"></i>' + status + '</span>' +
        '<span class="case-card-title"><span class="case-number">CASE ' + String(item.number).padStart(2, "0") + '</span><span class="case-name">' + escapeHTML(item.title) + '</span></span>' +
        '<span class="small muted">' + (solved ? "もう一度プレイする" : unlocked ? "事件を開始する" : "前の事件を解決すると解放") + '</span>' +
      '</button>';
    }).join("");
    this.mount(this.header() +
      '<section class="screen-content">' +
        '<div class="page-heading"><div><p class="eyebrow">CASE FILES</p><h1 class="section-title">事件選択</h1><p class="section-subtitle">事件資料と供述を読み返し、犯人と共謀者を指名してください。</p></div>' +
        '<button class="text-button" data-action="go-title">タイトルへ戻る</button></div>' +
        '<div class="case-list">' + cards + '</div>' +
      '</section>', this.caseList.length ? this.cases[this.caseList[0].id].backgrounds.office : null);
  }

  linePortrait(line) {
    if (!line || !line.portrait) return null;
    return this.character(line.portrait);
  }

  renderDialogue() {
    const data = this.case();
    const lines = this.sequence();
    const line = lines[Math.min(this.state.dialogueIndex, Math.max(0, lines.length - 1))] || { speaker: "assistant", text: "" };
    const portrait = this.linePortrait(line);
    const background = data.backgrounds[line.background] || data.backgrounds.office;
    const portraitRight = line.position === "right";
    const image = portrait && portrait.portrait ? '<div class="dialogue-portrait-wrap ' + (portraitRight ? "portrait-right" : "") + '"><img class="dialogue-portrait" src="' + escapeHTML(portrait.portrait) + '" alt=""></div>' : "";
    const count = '<span class="dialogue-count">' + (this.state.dialogueIndex + 1) + ' / ' + lines.length + '</span>';
    this.mount('<div class="dialogue-screen">' + this.header() +
      '<div class="dialogue-stage">' + image +
        '<section class="dialogue-panel panel ' + (image ? (portraitRight ? "portrait-right-panel" : "") : "without-portrait") + '" data-advance>' +
          '<div class="dialogue-meta"><span class="speaker-name">' + escapeHTML(this.characterName(line.speaker) || line.speaker || "助手") + '</span>' + count + '</div>' +
          '<div class="dialogue-text" data-typewriter>' + escapeHTML(line.text) + '</div>' +
          '<div class="dialogue-controls"><span class="advance-hint">クリック・タップ・Enter・Spaceで進む</span><button class="primary-button" data-action="advance">次へ　›</button></div>' +
        '</section>' +
      '</div></div>', background);
  }

  renderTestimony() {
    const data = this.case();
    const suspect = data.suspects[this.state.suspectIndex];
    const person = this.character(suspect.id);
    const text = suspect.statement[this.state.testimonyIndex] || "";
    const profileText = "容疑者 " + String(suspect.number).padStart(2, "0") + " / " + String(data.suspects.length).padStart(2, "0");
    this.mount('<div class="dialogue-screen">' + this.header() +
      '<div class="testimony-heading"><div class="testimony-heading-row"><span>' + profileText + '</span><span>供述　' + (this.state.testimonyIndex + 1) + ' / ' + suspect.statement.length + '</span></div></div>' +
      '<div class="dialogue-stage">' +
        '<div class="dialogue-portrait-wrap"><img class="dialogue-portrait is-suspect" src="' + escapeHTML(person.portrait) + '" alt=""></div>' +
        '<section class="dialogue-panel panel testimony-panel" data-advance>' +
          '<div class="dialogue-meta"><span class="speaker-name">' + escapeHTML(person.name) + '</span><div class="profile-inline"><span>' + escapeHTML(suspect.age) + '歳</span><span>' + escapeHTML(suspect.occupation) + '</span><span>被害者との関係：' + escapeHTML(suspect.relationship) + '</span></div></div>' +
          '<div class="dialogue-text" data-typewriter>' + escapeHTML(text) + '</div>' +
          '<div class="dialogue-controls"><span class="advance-hint">クリック・タップ・Enter・Spaceで進む</span><button class="primary-button" data-action="advance">次へ　›</button></div>' +
        '</section>' +
      '</div></div>', data.backgrounds.interview);
  }

  currentSuspect() {
    const data = this.case();
    return data.suspects.find(item => item.id === this.state.selectedSuspectId) || data.suspects[0];
  }

  renderDeduction() {
    const data = this.case();
    const active = this.currentSuspect();
    const activeCharacter = this.character(active.id);
    const suspectRows = data.suspects.map(item => {
      const person = this.character(item.id);
      return '<button class="suspect-row ' + (item.id === active.id ? "active" : "") + '" data-action="choose-suspect" data-suspect-id="' + escapeHTML(item.id) + '">' +
        '<img class="suspect-avatar" src="' + escapeHTML(person.portrait) + '" alt="">' +
        '<span><span class="suspect-row-name">' + String(item.number).padStart(2, "0") + '　' + escapeHTML(person.name) + '</span><span class="suspect-row-role">' + escapeHTML(item.occupation) + '</span></span>' +
      '</button>';
    }).join("");
    const evidenceRows = data.evidence.map(item =>
      '<button class="evidence-row ' + (item.id === this.state.selectedEvidenceId ? "active" : "") + '" data-action="choose-evidence" data-evidence-id="' + escapeHTML(item.id) + '">' + escapeHTML(item.title) + '</button>'
    ).join("");
    const selectedEvidence = data.evidence.find(item => item.id === this.state.selectedEvidenceId) || data.evidence[0];
    const summary = '<div class="case-dossier">' +
      '<h3>' + escapeHTML(data.title) + '</h3>' +
      '<div class="victim-summary">' +
        '<span>発生場所<br><strong>' + escapeHTML(data.location) + '</strong></span>' +
        '<span>被害者<br><strong>' + escapeHTML(data.victim.name) + '・' + escapeHTML(data.victim.age) + '歳</strong></span>' +
        '<span>死因<br><strong>' + escapeHTML(data.victim.cause) + '</strong></span>' +
        '<span>推定死亡時刻<br><strong>' + escapeHTML(data.victim.estimatedTime) + '</strong></span>' +
        '<span>遺体発見<br><strong>' + escapeHTML(data.victim.foundAt) + '</strong></span>' +
        '<span>隔離状況<br><strong>嵐で島と本土が孤立</strong></span>' +
      '</div>' +
      '<p class="small muted" style="line-height:1.65">晩餐会の翌朝、書斎で久世宗一郎が発見された。扉と窓は施錠され、机には飲みかけの紅茶が残されていた。</p>' +
    '</div>';
    let rightContent = "";
    if (this.state.rightTab === "overview") {
      rightContent = summary +
        '<div class="notice" style="margin:12px">10人の容疑者のプロフィールと供述は、左の一覧から何度でも確認できます。</div>' +
        '<div style="padding:10px 15px 16px"><button class="secondary-button" data-action="right-tab" data-tab="evidence">現場資料を確認する</button></div>';
    } else {
      rightContent = '<div class="case-dossier"><h3>事件資料　' + data.evidence.length + '件</h3><p class="small muted">文章資料を選択すると詳細を表示します。</p></div>' +
        '<div class="evidence-list">' + evidenceRows + '</div>' +
        '<div class="evidence-detail"><h4 class="evidence-detail-title">' + escapeHTML(selectedEvidence.title) + '</h4>' + escapeHTML(selectedEvidence.text) + '</div>' +
        '<div style="padding:0 12px 12px"><button class="text-button" data-action="right-tab" data-tab="overview">事件概要へ戻る</button></div>';
    }
    this.mount(this.header() +
      '<section class="screen-content deduction-page">' +
        '<div class="page-heading"><div><p class="eyebrow">FREE DEDUCTION</p><h1 class="section-title">自由推理</h1><p class="section-subtitle">供述と事件資料を自由に読み返せます。</p></div></div>' +
        '<div class="deduction-layout">' +
          '<section class="deduction-column panel"><div class="column-heading">容疑者　10名</div><div class="suspect-list">' + suspectRows + '</div></section>' +
          '<section class="deduction-column panel"><div class="column-heading">人物情報・供述</div>' +
            '<div class="person-detail">' +
              '<img class="person-detail-image" src="' + escapeHTML(activeCharacter.portrait) + '" alt="">' +
              '<div class="person-detail-shade"></div>' +
              '<div class="person-detail-copy"><p class="eyebrow">SUSPECT ' + String(active.number).padStart(2, "0") + ' / 10</p>' +
                '<h2 class="person-detail-name">' + escapeHTML(activeCharacter.name) + '</h2>' +
                '<div class="person-facts"><span>' + escapeHTML(active.age) + '歳</span><span>' + escapeHTML(active.occupation) + '</span><span>' + escapeHTML(active.relationship) + '</span></div>' +
                '<p class="person-bio">' + escapeHTML(active.publicProfile) + '</p>' +
                '<div class="statement-full">' + escapeHTML(active.statement.join("\n\n")) + '</div>' +
              '</div>' +
            '</div>' +
          '</section>' +
          '<section class="deduction-column panel"><div class="column-heading">事件資料</div>' +
            '<div class="dossier-controls">' +
              '<button class="' + (this.state.rightTab === "overview" ? "primary-button" : "secondary-button") + '" data-action="right-tab" data-tab="overview">事件概要</button>' +
              '<button class="' + (this.state.rightTab === "evidence" ? "primary-button" : "secondary-button") + '" data-action="right-tab" data-tab="evidence">現場資料</button>' +
            '</div>' + rightContent +
          '</section>' +
        '</div>' +
        '<div class="deduction-footer"><p>閲覧回数に制限はありません。推理がまとまったら指名へ進んでください。</p><button class="primary-button" data-action="accuse">犯人を指名する</button></div>' +
      '</section>', data.backgrounds.office);
  }

  suspectOptions(selected) {
    return '<option value="">選択してください</option>' + this.case().suspects.map(item => {
      const person = this.character(item.id);
      return '<option value="' + escapeHTML(item.id) + '"' + (item.id === selected ? " selected" : "") + '>' + String(item.number).padStart(2, "0") + "　" + escapeHTML(person.name) + '</option>';
    }).join("");
  }

  accompliceOptions(selected) {
    const culprit = this.state.accuseCulprit;
    const candidates = this.case().suspects.filter(item => item.id !== culprit).map(item => {
      const person = this.character(item.id);
      return '<option value="' + escapeHTML(item.id) + '"' + (item.id === selected ? " selected" : "") + '>' + String(item.number).padStart(2, "0") + "　" + escapeHTML(person.name) + '</option>';
    }).join("");
    return '<option value="">選択してください</option>' + candidates + '<option value="none"' + (selected === "none" ? " selected" : "") + '>共謀者なし</option>';
  }

  renderAccusation() {
    const data = this.case();
    const step = this.state.accuseStep;
    const culprit = data.suspects.find(item => item.id === this.state.accuseCulprit);
    const accomplice = data.suspects.find(item => item.id === this.state.accuseAccomplice);
    let content = "";
    let stepNum = step === "culprit" ? 1 : step === "accomplice" ? 2 : 3;
    if (step === "culprit") {
      content = '<label class="form-label" for="culpritSelect">犯人</label><select id="culpritSelect" class="select-field" data-select="culprit">' + this.suspectOptions(this.state.accuseCulprit) + '</select>' +
        '<div class="button-row"><button class="text-button" data-action="return-deduction">推理に戻る</button><button class="primary-button" data-action="accuse-next">次へ　›</button></div>';
    } else if (step === "accomplice") {
      content = '<p class="notice">犯人として選んだ人物：' + escapeHTML(culprit ? this.characterName(culprit.id) : "未選択") + '</p>' +
        '<label class="form-label" for="accompliceSelect">共謀者</label><select id="accompliceSelect" class="select-field" data-select="accomplice">' + this.accompliceOptions(this.state.accuseAccomplice) + '</select>' +
        '<div class="button-row"><button class="text-button" data-action="accuse-back">犯人の選択へ</button><button class="primary-button" data-action="accuse-next">確認へ　›</button></div>';
    } else {
      content = '<div class="choice-summary"><div class="choice-line"><span>犯人</span><strong>' + escapeHTML(culprit ? this.characterName(culprit.id) : "") + '</strong></div>' +
        '<div class="choice-line"><span>共謀者</span><strong>' + escapeHTML(this.state.accuseAccomplice === "none" ? "共謀者なし" : accomplice ? this.characterName(accomplice.id) : "") + '</strong></div></div>' +
        '<p class="section-subtitle">この推理で確定しますか？</p>' +
        '<div class="button-row"><button class="text-button" data-action="return-deduction">推理に戻る</button><button class="secondary-button" data-action="accuse-back">選択を変更</button><button class="primary-button" data-action="confirm-accusation">指名を確定する</button></div>';
    }
    this.mount(this.header() +
      '<section class="screen-content">' +
        '<div class="accusation-wrap panel">' +
          '<p class="eyebrow">FINAL ACCUSATION</p><h1 class="section-title">犯人を指名する</h1>' +
          '<p class="section-subtitle">犯人と共謀者をそれぞれ選択してください。共謀者がいないと考える場合も選択できます。</p>' +
          '<div class="step-indicator"><span class="' + (stepNum >= 1 ? "active" : "") + '"></span><span class="' + (stepNum >= 2 ? "active" : "") + '"></span><span class="' + (stepNum >= 3 ? "active" : "") + '"></span></div>' +
          content +
        '</div>' +
      '</section>', this.case().backgrounds.office);
  }

  renderDefeat() {
    const data = this.case();
    const line = data.defeat[Math.min(this.state.dialogueIndex, data.defeat.length - 1)];
    const solution = data.solution;
    const culprit = data.suspects.find(item => item.id === solution.culprit);
    const unknownFor = item => item && item.gender === "female" ? this.character("unknownFemale") : this.character("unknownMale");
    const figures = [culprit];
    if (solution.accomplice) figures.push(data.suspects.find(item => item.id === solution.accomplice));
    const figuresHtml = figures.map(item => {
      const unknown = unknownFor(item);
      return '<img class="defeat-figure" src="' + escapeHTML(unknown.portrait) + '" alt="">';
    }).join("");
    this.mount('<div class="defeat-screen">' + this.header() +
      '<div class="dialogue-stage"><div class="defeat-pair">' + figuresHtml + '</div>' +
        '<section class="dialogue-panel panel" data-advance>' +
          '<div class="dialogue-meta"><span class="speaker-name">？？？</span><span class="dialogue-count">' + (this.state.dialogueIndex + 1) + ' / ' + data.defeat.length + '</span></div>' +
          '<div class="dialogue-text" data-typewriter>' + escapeHTML(line.text) + '</div>' +
          '<div class="dialogue-controls"><span class="advance-hint">クリック・タップ・Enter・Spaceで進む</span><button class="primary-button" data-action="advance">次へ　›</button></div>' +
        '</section>' +
      '</div></div>', data.backgrounds.defeat);
  }

  renderGameOver() {
    this.mount(this.header() +
      '<section class="game-over-panel panel ' + (this.shouldAnimateTransition ? "screen-enter" : "") + '">' +
        '<p class="eyebrow">THE CASE REMAINS UNSOLVED</p><h1 class="game-over-title">GAME OVER</h1>' +
        '<p class="section-subtitle">まだ推理を続けることができます。</p>' +
        '<div class="button-row" style="justify-content:center"><button class="primary-button" data-action="retry">もう一度推理する</button><button class="secondary-button" data-action="go-title">タイトルへ戻る</button></div>' +
      '</section>', this.case().backgrounds.defeat);
  }

  renderCaseClosed() {
    const data = this.case();
    const next = this.nextCase();
    this.mount(this.header() +
      '<section class="case-closed ' + (this.shouldAnimateTransition ? "screen-enter" : "") + '">' +
        '<div class="case-closed-card panel">' +
          '<div class="case-closed-label">CASE CLOSED</div>' +
          '<p class="case-closed-no">CASE ' + String(data.number).padStart(2, "0") + '</p>' +
          '<h1 class="case-closed-name">' + escapeHTML(data.title) + '</h1>' +
          '<div class="rule"></div><p class="section-subtitle">事件の真相が明らかになりました。</p>' +
          '<div class="button-row" style="justify-content:center">' +
            (next ? '<button class="primary-button" data-action="next-case">次の事件へ</button>' : "") +
            '<button class="' + (next ? "secondary-button" : "primary-button") + '" data-action="case-select-from-end">事件選択へ</button>' +
            '<button class="secondary-button" data-action="go-title">タイトルへ戻る</button>' +
          '</div>' +
        '</div>' +
      '</section>', data.backgrounds.office);
  }

  settingDisplay(key, value) {
    if (key === "messageSpeed") return ["なし","遅い","標準","速い"][Number(value)] || "標準";
    return value + "%";
  }

  renderSettings() {
    const settings = this.state.settings;
    const volumeRow = (key, label) =>
      '<div class="setting-row"><label class="setting-label" for="' + key + '">' + label + '</label>' +
        '<input id="' + key + '" type="range" min="0" max="100" step="1" value="' + settings[key] + '" data-setting="' + key + '">' +
        '<span class="setting-value" data-setting-value="' + key + '">' + this.settingDisplay(key, settings[key]) + '</span></div>';
    const speedRow = '<div class="setting-row"><label class="setting-label" for="messageSpeed">メッセージ表示速度</label>' +
      '<input id="messageSpeed" type="range" min="0" max="3" step="1" value="' + settings.messageSpeed + '" data-setting="messageSpeed">' +
      '<span class="setting-value" data-setting-value="messageSpeed">' + this.settingDisplay("messageSpeed", settings.messageSpeed) + '</span></div>';
    this.mount(this.header() +
      '<section class="screen-content">' +
        '<div class="page-heading"><div><p class="eyebrow">PREFERENCES</p><h1 class="section-title">設定</h1></div><button class="text-button" data-action="back">戻る</button></div>' +
        '<div class="settings-panel panel">' +
          volumeRow("bgmVolume","BGM音量") + volumeRow("seVolume","効果音音量") + speedRow +
          '<div class="toggle-row"><span class="setting-label">全画面表示</span><button class="secondary-button" data-action="toggle-fullscreen">' + (document.fullscreenElement ? "全画面を終了" : "全画面にする") + '</button></div>' +
          '<div class="rule"></div><button class="secondary-button danger-button" data-action="clear-save">セーブデータを初期化</button>' +
        '</div>' +
        '<p class="footer-note">音素材は未収録です。音量設定は保存され、音素材を追加すると反映されます。</p>' +
      '</section>', this.caseList.length ? this.cases[this.caseList[0].id].backgrounds.office : null);
  }

  renderWallpapers() {
    const wallpapers = this.caseList.flatMap(meta => {
      const data = this.cases[meta.id];
      return data ? (data.wallpapers || []) : [];
    });
    const cards = wallpapers.map(item => {
      const assetPath = item.path || ('assets/wallpapers/' + item.resolution + '/' + item.file);
      return '<article class="wallpaper-card panel">' +
        '<img class="wallpaper-thumb" src="' + escapeHTML(assetPath) + '" alt="' + escapeHTML(item.name) + '" loading="lazy">' +
        '<div class="wallpaper-copy"><h2 class="wallpaper-title">' + escapeHTML(item.name) + '</h2>' +
          '<div class="wallpaper-actions"><span>' + escapeHTML(item.resolution).replace("x", " × ") + '</span><a download="' + escapeHTML(item.file) + '" href="' + escapeHTML(assetPath) + '">ダウンロード</a></div>' +
        '</div>' +
      '</article>';
    }).join("");
    this.mount(this.header() +
      '<section class="screen-content">' +
        '<div class="page-heading"><div><p class="eyebrow">WALLPAPERS</p><h1 class="section-title">壁紙ダウンロード</h1><p class="section-subtitle">添付されている解像度の背景画像を配布しています。</p></div><button class="text-button" data-action="back">戻る</button></div>' +
        '<div class="wallpaper-grid">' + cards + '</div>' +
        '<p class="footer-note">現在収録されている解像度は1920×1080です。</p>' +
      '</section>', this.caseList.length ? this.cases[this.caseList[0].id].backgrounds.office : null);
  }

  toggleFullscreen() {
    const requested = !document.fullscreenElement;
    this.state.settings.fullscreen = requested;
    this.persist();
    if (requested && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        this.state.settings.fullscreen = false;
        this.persist();
        this.showToast("このブラウザでは全画面表示を開始できませんでした");
      });
    } else if (!requested && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    this.render();
  }

  startTyping() {
    const element = this.root.querySelector("[data-typewriter]");
    if (!element) return;
    const fullText = element.textContent || "";
    const delay = SPEEDS[this.state.settings.messageSpeed] || 0;
    if (!delay) return;
    const characters = Array.from(fullText);
    element.textContent = "";
    let index = 0;
    this.typingTimer = window.setInterval(() => {
      index += 1;
      element.textContent = characters.slice(0, index).join("");
      if (index >= characters.length) this.stopTyping();
    }, delay);
  }

  stopTyping() {
    if (this.typingTimer) {
      window.clearInterval(this.typingTimer);
      this.typingTimer = null;
    }
  }

  revealTyping() {
    if (!this.typingTimer) return false;
    this.stopTyping();
    const element = this.root.querySelector("[data-typewriter]");
    if (element) {
      if (this.state.screen === "dialogue") {
        const line = this.sequence()[this.state.dialogueIndex];
        element.textContent = line ? line.text : "";
      } else if (this.state.screen === "testimony") {
        const suspect = this.case().suspects[this.state.suspectIndex];
        element.textContent = suspect.statement[this.state.testimonyIndex] || "";
      } else if (this.state.screen === "defeat") {
        element.textContent = this.case().defeat[this.state.dialogueIndex].text;
      }
    }
    return true;
  }

  showToast(message) {
    const old = this.root.querySelector(".toast");
    if (old) old.remove();
    const toast = document.createElement("div");
    toast.className = "toast show";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    this.root.appendChild(toast);
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.remove(), 220);
    }, 2200);
  }
}
