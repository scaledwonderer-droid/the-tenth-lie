import { GameController } from "./game.js";
import { AudioManager } from "./audio.js";

async function readJson(path) {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(path + " を読み込めませんでした (" + response.status + ")");
  return response.json();
}

async function start() {
  const root = document.getElementById("app");
  try {
    const [caseIndex, characterData, audioManifest] = await Promise.all([
      readJson("data/cases.json"),
      readJson("data/characters.json"),
      readJson("data/audio-manifest.json")
    ]);
    const caseEntries = await Promise.all(caseIndex.cases.map(item => readJson(item.dataPath)));
    const cases = Object.fromEntries(caseEntries.map(item => [item.id, item]));
    const audio = new AudioManager(audioManifest, null);
    new GameController(root, caseIndex.cases, cases, characterData.characters, audio);
  } catch (error) {
    console.error(error);
    root.innerHTML =
      '<section class="panel error-panel screen-enter">' +
        '<p class="eyebrow">LOAD ERROR</p>' +
        '<h1 class="section-title">ゲームを読み込めませんでした</h1>' +
        '<p class="section-subtitle">ゲーム一式のファイルが同じフォルダー構成にあるか確認してください。ブラウザで直接ファイルを開かず、ローカルサーバーまたはGitHub Pagesから起動してください。</p>' +
        '<p class="notice">' + error.message + '</p>' +
        '<button class="primary-button" onclick="location.reload()">再読み込み</button>' +
      '</section>';
  }
}

start();
