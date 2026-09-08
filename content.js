(() => {
  "use strict";

  const BUTTONS_ID = "chappy-quick-buttons";
  const PROMPTS = [
    { label: "OKです", text: "OKです" },
    { label: "それで進めて", text: "それで進めて" },
    { label: "調査して", text: "調査して" },
    { label: "詳しく", text: "詳しく" },
    { label: "続けて", text: "続けて" }
  ];

  let mountScheduled = false;

  function isVisible(element) {
    if (!element || !element.isConnected) return false;

    const style = getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      element.getClientRects().length > 0
    );
  }

  function findPromptElement() {
    const selectors = [
      "#prompt-textarea",
      'textarea[placeholder*="Message" i]',
      'main textarea',
      'main [contenteditable="true"]',
      '[contenteditable="true"][data-virtualkeyboard="true"]',
      '[contenteditable="true"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (isVisible(element)) return element;
    }

    return null;
  }

  function getComposerRoot(prompt) {
    return prompt?.closest("form") || prompt?.parentElement || null;
  }

  function getPromptRow(root, prompt) {
    let row = prompt;
    while (row.parentElement && row.parentElement !== root) row = row.parentElement;
    return row.parentElement === root ? row : null;
  }

  function getPromptText(prompt) {
    if (!prompt) return "";
    if (prompt.querySelector?.(".placeholder, p.placeholder")) return "";

    const value = "value" in prompt ? prompt.value : prompt.innerText || prompt.textContent;
    return String(value || "")
      .replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[\u200b-\u200d\ufeff]/g, "")
      .trim();
  }

  function dispatchInput(prompt, text) {
    let event;

    try {
      event = new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: text
      });
    } catch (_) {
      event = new Event("input", { bubbles: true });
    }

    prompt.dispatchEvent(event);
    prompt.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setTextareaText(prompt, text) {
    const prototype = prompt instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

    if (valueSetter) {
      valueSetter.call(prompt, text);
    } else {
      prompt.value = text;
    }

    dispatchInput(prompt, text);
    prompt.setSelectionRange?.(text.length, text.length);
  }

  function setContentEditableText(prompt, text) {
    prompt.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(prompt);
    selection?.removeAllRanges();
    selection?.addRange(range);

    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, text);
    } catch (_) {
      inserted = false;
    }

    if (!inserted) {
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    dispatchInput(prompt, text);
  }

  function appendPromptText(prompt, text) {
    const current = getPromptText(prompt);
    const separator = current && !/[\s]$/.test(current) ? "\n" : "";
    const next = `${current}${separator}${text}`;

    prompt.focus();

    if (prompt instanceof HTMLTextAreaElement || prompt instanceof HTMLInputElement) {
      setTextareaText(prompt, next);
      return;
    }

    if (prompt.isContentEditable || prompt.getAttribute("contenteditable") === "true") {
      setContentEditableText(prompt, next);
    }
  }

  function isStopButton(button) {
    const label = [
      button?.id,
      button?.getAttribute("aria-label"),
      button?.getAttribute("data-testid"),
      button?.textContent
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      label.includes("stop-button") ||
      label.includes("stop generating") ||
      label.includes("stop streaming") ||
      /(^|\s)stop(\s|$)/.test(label)
    );
  }

  function isSendButton(button) {
    if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") {
      return false;
    }

    if (isStopButton(button) || !isVisible(button)) return false;

    const label = [
      button.id,
      button.getAttribute("aria-label"),
      button.getAttribute("data-testid"),
      button.textContent
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      label.includes("composer-submit-button") ||
      label.includes("send-button") ||
      label.includes("send prompt") ||
      label.includes("send message") ||
      /(^|\s)send(\s|$)/.test(label)
    );
  }

  function findSendButton(prompt) {
    const root = getComposerRoot(prompt) || document;
    const selectors = [
      "button#composer-submit-button",
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]',
      'button[aria-label^="Send" i]',
      'button[type="submit"]'
    ];

    for (const selector of selectors) {
      const button = [...root.querySelectorAll(selector)].find(isSendButton);
      if (button) return button;
    }

    return null;
  }

  function sendPrompt(prompt) {
    const sendButton = findSendButton(prompt);
    if (!sendButton || isStopButton(sendButton)) return;
    sendButton.click();
  }

  function createButtons() {
    const container = document.createElement("div");
    container.id = BUTTONS_ID;
    container.className = "chappy-quick-buttons";

    for (const prompt of PROMPTS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chappy-quick-button";
      button.textContent = prompt.label;
      button.addEventListener("click", async (event) => {
        event.preventDefault();

        const promptElement = findPromptElement();
        if (!promptElement) return;

        appendPromptText(promptElement, prompt.text);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        sendPrompt(findPromptElement() || promptElement);
      });
      container.appendChild(button);
    }

    return container;
  }

  function mountButtons() {
    const prompt = findPromptElement();
    if (!prompt) return;

    const root = getComposerRoot(prompt);
    if (!root) return;

    let buttons = document.getElementById(BUTTONS_ID);
    if (buttons && buttons.parentElement !== root) {
      buttons.remove();
      buttons = null;
    }

    if (!buttons) buttons = createButtons();

    const promptRow = getPromptRow(root, prompt);
    if (promptRow) {
      if (buttons.previousElementSibling !== promptRow) {
        root.insertBefore(buttons, promptRow.nextSibling);
      }
    } else if (buttons.parentElement !== root) {
      root.appendChild(buttons);
    }
  }

  function scheduleMount() {
    if (mountScheduled) return;

    mountScheduled = true;
    requestAnimationFrame(() => {
      mountScheduled = false;
      mountButtons();
    });
  }

  mountButtons();

  const observer = new MutationObserver(scheduleMount);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
