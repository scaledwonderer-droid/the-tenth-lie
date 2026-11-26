# 十人目の嘘 — THE TENTH LIE

現代日本を舞台にした、ブラウザ向け推理アドベンチャーです。第1話「孤島の晩餐会」を最初から事件解決までプレイできます。

## 起動方法

このフォルダーを静的Webサーバーで配信してください。HTMLをファイルとして直接開く方法では、シナリオJSONの読み込みがブラウザに拒否されます。

Pythonがある場合は、ターミナルで本フォルダーへ移動して次を実行し、表示されたURLをブラウザで開きます。

    python -m http.server 8000

GitHub Pagesへ公開する場合は、本フォルダーの内容をリポジトリのルートへ配置し、リポジトリの Settings → Pages で公開元ブランチとフォルダーを選択します。index.html が公開ルートにあれば起動できます。

外部サーバー、API、アカウント登録は使いません。進行状況と設定はブラウザのLocalStorageに保存されます。別のブラウザや端末には引き継がれません。

## 収録内容

- タイトル、事件選択、事件説明、10人の供述、自由推理、犯人・共謀者指名
- 正誤判定、敗北演出、真相説明、CASE CLOSED
- 事件資料12件、供述と事件概要の再閲覧
- 設定、全画面表示、セーブデータ初期化
- 1920×1080の壁紙5点
- 第2話以降を追加しやすいJSONシナリオデータ
- 音素材を後から登録できる空の音声マニフェスト

## シナリオの追加方法

1. data/cases/ に新しい事件JSONを作成します。data/cases/case01.json をひな形にできます。
2. data/cases.json の cases 配列へ、事件ID、番号、タイトル、データパス、必要なら unlocksAfter を追加します。
3. 事件JSONには victim、backgrounds、introduction、evidence、suspects、deductionLead、solution、defeat、resolution を設定します。
4. solution.culprit は容疑者ID、共謀者がいない事件は solution.accomplice を null にします。
5. 正解に必要な情報は evidence と公開供述に含め、秘密や正解後に判明する事情を解決前の文章へ入れないようにします。

ゲーム進行は事件JSONを読み込み、全事件を同じ仕組みで扱います。公開側の solution は正誤判定に必要なため、ソースを確認すれば読むことができます。

## 登場人物の追加・再登場

人物ID、名前、性別、共通プロフィール、人物画像は data/characters.json に登録します。人物画像は assets/characters/ に置き、JSONの portrait から参照します。画像がない人物（被害者など）は portrait を null にできます。

事件ごとの年齢、職業、被害者との関係、公開プロフィール、供述は各事件JSONの suspects に記載します。同じ人物IDを別事件でも使うと、同一人物の人物画像と基本情報を再利用できます。別事件で年齢、職業、役割、供述を変える場合は事件JSON側だけを設定します。

人物を被害者として登場させる場合は victim.personId に同じ人物IDを記録し、容疑者配列には含めません。人物の役割が事件ごとに異なっていても構いません。

## 背景画像の追加

背景画像を assets/backgrounds/common/ または assets/backgrounds/case01/ などへ置き、事件JSONの backgrounds にパスを記載します。会話データの background には、そのキーを指定します。

添付画像の縦横比は変更せず、ゲーム画面では背景として画面全体を覆うように自然に表示します。

会話行は speaker、text、portrait、position、background、bgm、se、effect を必要に応じて持てます。人物位置は left または right、背景演出は effect に darken を指定できます。音声IDは audio-manifest.json に登録したものだけが再生されます。

## 音素材の追加

初期状態では音声ファイルはありません。音声を追加するときは、BGMを assets/audio/bgm/、効果音を assets/audio/se/ に置き、data/audio-manifest.json に存在するファイルだけを登録します。

例：

    {
      "bgm": {
        "title": "assets/audio/bgm/title.mp3",
        "investigation": "assets/audio/bgm/investigation.mp3",
        "deduction": "assets/audio/bgm/deduction.mp3",
        "resolution": "assets/audio/bgm/resolution.mp3",
        "defeat": "assets/audio/bgm/defeat.mp3"
      },
      "se": {
        "select": "assets/audio/se/select.mp3",
        "confirm": "assets/audio/se/confirm.mp3"
      }
    }

未登録のファイルは読み込まれません。音量設定は素材がなくても保存されます。再生開始はユーザー操作後に行います。

## 壁紙の追加

壁紙画像を assets/wallpapers/<幅>x<高さ>/ に配置し、事件JSONの wallpapers 配列に name、resolution、file、path を追加します。path はゲームルートからの画像パスです。指定サイズの画像が存在する分だけ配布ページに表示されます。画像自体にロゴやUIは重ねません。

現状は添付されていた1920×1080の5点を収録しています。これらは背景素材と同じ画像を参照しています。2560×1440、3840×2160の画像は添付されていないため、配布していません。

## セーブデータの管理

ブラウザのLocalStorageキー the-tenth-lie-save-v1 に、解放済み・解決済み事件、現在の事件、進行パート、供述・会話の位置、事件選択、設定を保存します。指名失敗後は自由推理画面へ戻れる状態で保存します。

タイトル画面の「設定」からセーブデータを初期化できます。初期化時は確認ダイアログを表示します。保存領域の破損や読み込み失敗時は初期状態で起動します。

## 公開用データと制作側資料

ゲーム本体のフォルダーには、プレイヤーへ公開する事件概要、事件資料、供述、正解判定に必要なデータ、正解後の真相のみを収録しています。後続話用の隠し事や未公開設定はこの公開フォルダーに含めていません。

正解判定に必要な正解IDは静的ゲームの公開JSONに含まれるため、ソースを確認すれば読めます。完全に隠されているとは扱っていません。

## 動作環境と確認範囲

- モダンブラウザ（JavaScript、ES modules、LocalStorageに対応）
- PC向け16:9レイアウトを優先し、狭い画面では縦方向のレイアウトへ切り替え
- 音声なしで全機能を利用可能
- 添付されていた背景画像、人物画像、ロゴを使用
