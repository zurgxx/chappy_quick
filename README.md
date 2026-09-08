# Chappy Quick

ChatGPT Web の入力欄付近に、定型文を入力して送信する小さなボタン列を追加する Chrome 拡張です。定型文はOptionsページから編集できます。

## Chromeでの読み込み

1. `chrome://extensions` を開く
2. Developer mode（デベロッパーモード）を ON にする
3. Load unpacked（パッケージ化されていない拡張機能を読み込む）を選ぶ
4. cloneしたプロジェクトのディレクトリ（このリポジトリのルート）を選択する

対応サイトは `https://chatgpt.com/*` のみです。

## Optionsページ

`chrome://extensions` → Chappy Quick → 詳細 → 拡張機能のオプション から開けます。

Optionsページでは、表示ラベル・送信本文・有効/無効の変更、定型文の追加・削除、初期値への復元ができます。

設定は `chrome.storage.sync` に保存され、保存後はChatGPTページをリロードせずにボタンへ反映されます。
