# CASE 02 更新手順

この差分は、既存ゲーム「十人目の嘘」にCASE 02「沈黙の告発者」を追加するものです。ゲーム一式を置き換える必要はありません。

## 更新手順

1. 公開中のゲームフォルダーをバックアップします。
2. `THE_TENTH_LIE_CASE02_UPDATE.zip` を展開します。ZIP内の `the-tenth-lie/` 以下が、既存ゲームと同じディレクトリ構成になっています。
3. 展開したファイルを、既存の `the-tenth-lie/` フォルダーへ上書き・追加します。公開サイトのルートがこのフォルダー自体の場合は、ZIP内の `the-tenth-lie/` の中身をサイトルートへ配置してください。`the-tenth-lie/the-tenth-lie/` のように二重の階層を作らないでください。
4. 静的WebサーバーまたはGitHub Pagesへ更新後のファイルを配置し、ブラウザーを再読み込みします。

## 変更した既存ファイル

| ファイル | 変更内容 |
|---|---|
| `data/cases.json` | CASE 02を追加し、CASE 01解決後に解放する設定を登録 |
| `data/characters.json` | CASE 02の新規容疑者7人を登録。CASE 01の人物情報は保持 |
| `js/game.js` | CASE 02の事件概要・指名時台詞・英語タイトル・壁紙表示に対応。既存画面の台詞と推理資料は、同一画面内で必要な部分だけを更新。旧セーブでCASE 01を解決済みの場合もCASE 02を解放 |
| `README.md` | CASE 02と壁紙解像度の説明を更新 |
| `assets/wallpapers/README.txt` | CASE 02の壁紙保存先と解像度を記載 |

## 新規追加ファイル

| ファイル | 用途 |
|---|---|
| `data/cases/case02.json` | CASE 02の導入、事件資料12件、容疑者10人の公開プロフィールと供述、指名、敗北、真相説明を収録 |
| `assets/characters/case02/case02_04_takamiya.png` | 鷹宮征司 |
| `assets/characters/case02/case02_05_shinohara.png` | 篠原玲奈 |
| `assets/characters/case02/case02_06_mikage.png` | 御影直人 |
| `assets/characters/case02/case02_07_kiryu.png` | 桐生真帆 |
| `assets/characters/case02/case02_08_dojima.png` | 堂島克彦 |
| `assets/characters/case02/case02_09_hayase.png` | 早瀬奈緒 |
| `assets/characters/case02/case02_10_hiiragi.png` | 柊冬香 |
| `assets/backgrounds/case02/case02_bg_facility.png` | 研修施設・外観 |
| `assets/backgrounds/case02/case02_bg_archive.png` | 研修施設・資料保管室 |
| `assets/backgrounds/case02/case02_bg_meeting.png` | 研修施設・会議室、容疑者供述 |
| `assets/wallpapers/2560x1440/case02_bg_facility.png` | 外観の2560×1440壁紙 |
| `assets/wallpapers/2560x1440/case02_bg_archive.png` | 資料保管室の2560×1440壁紙 |
| `assets/wallpapers/2560x1440/case02_bg_meeting.png` | 会議室の2560×1440壁紙 |
| `assets/wallpapers/3840x2160/case02_bg_facility.png` | 外観の3840×2160壁紙 |
| `assets/wallpapers/3840x2160/case02_bg_archive.png` | 資料保管室の3840×2160壁紙 |
| `assets/wallpapers/3840x2160/case02_bg_meeting.png` | 会議室の3840×2160壁紙 |
| `UPDATE_INSTRUCTIONS.md` | この更新手順書 |

1920×1080壁紙は、それぞれのゲーム背景画像を参照します。添付素材に存在しない解像度のリンクは追加していません。既存人物画像、確認用一覧画像、素材プレビューは複製・登録していません。

## 削除が必要なファイル

なし。

## セーブデータへの影響

LocalStorageキー `the-tenth-lie-save-v1` と既存データ形式を維持しています。CASE 01の解決状態、音量、メッセージ速度、全画面設定は初期化されません。既存セーブでCASE 01が解決済みなら、読み込み時にCASE 02を解放します。CASE 02の解決済み状態も既存の解決済み一覧へ保存されます。

## 動作確認

実施できた確認：

- JSONデータの構文、容疑者10人・事件資料12件・台詞データの件数を確認。
- 人物画像、背景画像、壁紙の参照先と、添付画像の実解像度を確認。
- JavaScriptの構文確認。
- 正解条件が犯人と共謀者の両方一致であること、CASE 03が登録されていないことを確認。

未確認の項目：

- この実行環境ではChromium本体の実行ファイルが見つからず、遠隔プレビューも認証エラーになったため、ブラウザーでの実プレイ、画面サイズ別表示、画像の実描画、コンソールエラー、LocalStorageを使った通しプレイは実行できていません。コードを配置したブラウザーで確認してください。
- 既存ゲーム一式にはBGM・効果音のファイルがなく、音声マニフェストも空でした。CASE 02では新規音声を制作せず既存設定を維持していますが、音声再生は素材がないため確認できません。

現時点で、原稿の事件時刻、入退室記録、監視記録、正解に必要な公開情報に矛盾は見つかっていません。制作側専用資料はCASE 02のプレイヤー向けデータに含めていません。
