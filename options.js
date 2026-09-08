(() => {
  "use strict";

  const DEFAULT_PROMPTS = [
    { label: "OKです", text: "OKです", enabled: true },
    { label: "それで進めて", text: "それで進めて", enabled: true },
    { label: "調査して", text: "調査して", enabled: true },
    { label: "詳しく", text: "詳しく", enabled: true },
    { label: "続けて", text: "続けて", enabled: true }
  ];

  const promptList = document.getElementById("prompt-list");
  const status = document.getElementById("status");

  function cloneDefaults() {
    return DEFAULT_PROMPTS.map((prompt) => ({ ...prompt }));
  }

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function normalizePrompts(value) {
    if (!Array.isArray(value)) return cloneDefaults();

    return value
      .filter((prompt) => prompt && typeof prompt === "object")
      .map((prompt) => ({
        label: typeof prompt.label === "string" ? prompt.label : "",
        text: typeof prompt.text === "string" ? prompt.text : "",
        enabled: prompt.enabled === true
      }));
  }

  function getStoredPrompts() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get("prompts", (result) => {
          if (chrome.runtime.lastError) {
            setStatus("保存済み設定を読み込めないため、初期値を表示しています。", true);
            resolve(cloneDefaults());
            return;
          }

          resolve(normalizePrompts(result.prompts));
        });
      } catch (error) {
        console.warn("[Chappy Quick] Could not access sync storage.", error);
        setStatus("保存済み設定を読み込めないため、初期値を表示しています。", true);
        resolve(cloneDefaults());
      }
    });
  }

  function savePrompts(prompts) {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.set({ prompts }, () => {
          if (chrome.runtime.lastError) {
            setStatus("保存に失敗しました。Chrome Syncの状態を確認してください。", true);
            resolve(false);
            return;
          }

          setStatus("保存しました。");
          resolve(true);
        });
      } catch (error) {
        console.warn("[Chappy Quick] Could not save to sync storage.", error);
        setStatus("保存に失敗しました。", true);
        resolve(false);
      }
    });
  }

  function createPromptRow(prompt) {
    const row = document.createElement("article");
    row.className = "prompt-row";

    const enabledLabel = document.createElement("label");
    enabledLabel.className = "enabled-field";
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.className = "prompt-enabled";
    enabled.checked = prompt.enabled;
    enabledLabel.append(enabled, document.createTextNode(" 有効"));

    const labelField = document.createElement("label");
    labelField.textContent = "表示ラベル";
    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "prompt-label";
    labelInput.value = prompt.label;
    labelInput.placeholder = "例: 進めて";
    labelField.appendChild(labelInput);

    const textField = document.createElement("label");
    textField.textContent = "送信本文";
    const textInput = document.createElement("textarea");
    textInput.className = "prompt-text";
    textInput.rows = 2;
    textInput.value = prompt.text;
    textInput.placeholder = "例: それで進めてください";
    textField.appendChild(textInput);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => {
      if (confirm("この定型文を削除しますか？")) row.remove();
    });

    row.append(enabledLabel, labelField, textField, deleteButton);
    return row;
  }

  function renderPrompts(prompts) {
    promptList.replaceChildren(...prompts.map(createPromptRow));
  }

  function readPrompts() {
    return [...promptList.querySelectorAll(".prompt-row")].map((row) => ({
      label: row.querySelector(".prompt-label").value.trim(),
      text: row.querySelector(".prompt-text").value.trim(),
      enabled: row.querySelector(".prompt-enabled").checked
    }));
  }

  function validatePrompts(prompts) {
    return prompts.findIndex((prompt) => !prompt.label || !prompt.text);
  }

  async function handleSave() {
    const prompts = readPrompts();
    const invalidIndex = validatePrompts(prompts);

    if (invalidIndex !== -1) {
      setStatus("表示ラベルと送信本文を入力してください。", true);
      promptList.querySelectorAll(".prompt-label, .prompt-text")[invalidIndex * 2]?.focus();
      return;
    }

    await savePrompts(prompts);
  }

  async function handleReset() {
    if (!confirm("定型文を初期値に戻しますか？")) return;

    const prompts = cloneDefaults();
    renderPrompts(prompts);
    await savePrompts(prompts);
  }

  async function init() {
    renderPrompts(await getStoredPrompts());

    document.getElementById("add-prompt").addEventListener("click", () => {
      const row = createPromptRow({ label: "", text: "", enabled: true });
      promptList.appendChild(row);
      row.querySelector(".prompt-label").focus();
    });
    document.getElementById("save-prompts").addEventListener("click", handleSave);
    document.getElementById("reset-prompts").addEventListener("click", handleReset);
  }

  init();
})();
