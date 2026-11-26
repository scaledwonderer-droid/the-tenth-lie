const SAVE_KEY = "the-tenth-lie-save-v1";

export function createDefaultState() {
  return {
    version: 1,
    unlockedCases: ["case01"],
    solvedCases: [],
    currentCase: null,
    screen: "title",
    dialogueKind: "intro",
    dialogueIndex: 0,
    suspectIndex: 0,
    testimonyIndex: 0,
    selectedSuspectId: "reiji",
    selectedEvidenceId: "e01",
    rightTab: "overview",
    accuseStep: "culprit",
    accuseCulprit: "",
    accuseAccomplice: "",
    resume: null,
    returnScreen: "title",
    settings: {
      bgmVolume: 70,
      seVolume: 70,
      messageSpeed: 2,
      fullscreen: false
    }
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function normalizeState(raw) {
  const state = createDefaultState();
  if (!raw || typeof raw !== "object") return state;
  state.unlockedCases = Array.isArray(raw.unlockedCases) ? raw.unlockedCases.filter(v => typeof v === "string") : state.unlockedCases;
  if (!state.unlockedCases.includes("case01")) state.unlockedCases.unshift("case01");
  state.solvedCases = Array.isArray(raw.solvedCases) ? raw.solvedCases.filter(v => typeof v === "string") : [];
  state.currentCase = typeof raw.currentCase === "string" ? raw.currentCase : null;
  const screens = ["title","caseSelect","dialogue","testimony","deduction","accusation","defeat","gameOver","caseClosed","settings","wallpapers","error"];
  state.screen = screens.includes(raw.screen) ? raw.screen : "title";
  state.dialogueKind = ["intro","lead","resolution"].includes(raw.dialogueKind) ? raw.dialogueKind : "intro";
  state.dialogueIndex = Math.max(0, Number.parseInt(raw.dialogueIndex, 10) || 0);
  state.suspectIndex = Math.max(0, Number.parseInt(raw.suspectIndex, 10) || 0);
  state.testimonyIndex = Math.max(0, Number.parseInt(raw.testimonyIndex, 10) || 0);
  state.selectedSuspectId = typeof raw.selectedSuspectId === "string" ? raw.selectedSuspectId : "reiji";
  state.selectedEvidenceId = typeof raw.selectedEvidenceId === "string" ? raw.selectedEvidenceId : "e01";
  state.rightTab = raw.rightTab === "evidence" ? "evidence" : "overview";
  state.accuseStep = ["culprit","accomplice","confirm"].includes(raw.accuseStep) ? raw.accuseStep : "culprit";
  state.accuseCulprit = typeof raw.accuseCulprit === "string" ? raw.accuseCulprit : "";
  state.accuseAccomplice = typeof raw.accuseAccomplice === "string" ? raw.accuseAccomplice : "";
  state.returnScreen = typeof raw.returnScreen === "string" ? raw.returnScreen : "title";
  state.settings = {
    bgmVolume: clampNumber(raw.settings && raw.settings.bgmVolume, 0, 100, 70),
    seVolume: clampNumber(raw.settings && raw.settings.seVolume, 0, 100, 70),
    messageSpeed: clampNumber(raw.settings && raw.settings.messageSpeed, 0, 3, 2),
    fullscreen: !!(raw.settings && raw.settings.fullscreen)
  };
  if (raw.resume && typeof raw.resume === "object") {
    const resume = Object.assign({}, raw.resume);
    resume.screen = screens.includes(resume.screen) ? resume.screen : null;
    state.resume = resume.screen ? resume : null;
  }
  return state;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultState();
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.warn("セーブデータを読み込めなかったため、新しい状態で開始します。", error);
    return createDefaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn("セーブデータを保存できませんでした。", error);
    return false;
  }
}

export function clearState() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.warn("セーブデータを削除できませんでした。", error);
  }
  return createDefaultState();
}
