var ZoteroAnnotAIFloatingPanel = {
  panels: [],
  nextPanelID: 1,
  nextZIndex: 10000,
  log: null,
  requestRunner: null,
  settings: null,
  errors: null,
  translationTask: null,
  annotationWriter: null,
  minWidth: 280,
  minHeight: 180,
  toastDocs: [],

  init({ log, requestRunner, settings, errors, translationTask, annotationWriter } = {}) {
    this.shutdown();
    this.log = log || ((message) => Zotero.debug(`[Zotero AnnotAI] ${message}`));
    this.requestRunner = requestRunner || null;
    this.settings = settings || null;
    this.errors = errors || null;
    this.translationTask = translationTask || null;
    this.annotationWriter = annotationWriter || null;
    this.log("Floating panel module initialized");
  },

  shutdown() {
    for (let panel of [...this.panels]) {
      this.removePanel(panel, { log: false });
    }
    for (let doc of this.toastDocs) {
      doc.querySelector(".zotero-annotai-toast-container")?.remove();
    }
    this.panels = [];
    this.toastDocs = [];
    this.log = null;
    this.requestRunner = null;
    this.settings = null;
    this.errors = null;
    this.translationTask = null;
    this.annotationWriter = null;
  },

  open({ action, label, doc, reader, snapshot, anchorElement }) {
    if (!doc?.body) {
      return { message: "浮窗不可用" };
    }

    this.cleanupDisconnectedPanels();
    const existingPanel = this.findPanel(doc, action);
    if (existingPanel) {
      return this.handleExistingPanel(existingPanel, snapshot);
    }

    const panel = this.createPanelRecord({ action, label, doc, reader, snapshot, anchorElement });
    this.panels.push(panel);
    doc.body.append(panel.node);
    if (action === "translate") {
      this.startTranslationRequest(panel, snapshot, { reason: "open" });
    }
    else {
      this.renderPanel(panel);
    }
    this.bringToFront(panel);
    this.log?.(`Floating panel opened action=${action} panelID=${panel.id}`);

    const message = `已打开：${label}`;
    this.showToast(doc, message);
    return { message };
  },

  handleExistingPanel(panel, snapshot) {
    panel.openCount += 1;
    this.bringToFront(panel);
    panel.upgradeCount += 1;

    if (panel.action === "translate") {
      return this.handleTranslatePanelUpdate(panel, snapshot);
    }

    panel.snapshot = snapshot;

    if (panel.action === "qa") {
      this.renderPanel(panel);
      this.flashPanel(panel);
      this.log?.(`Floating panel upgraded action=${panel.action} panelID=${panel.id} upgradeCount=${panel.upgradeCount}`);
      const message = "已更新问答内容";
      this.showToast(panel.doc, message);
      return { message };
    }

    const message = panel.action === "translate"
      ? "已请求升级翻译回答"
      : "已请求升级解释回答";
    this.renderPanel(panel);
    this.flashPanel(panel);
    this.log?.(`Floating panel upgraded action=${panel.action} panelID=${panel.id} upgradeCount=${panel.upgradeCount}`);
    this.showToast(panel.doc, message);

    return { message };
  },

  createPanelRecord({ action, label, doc, reader, snapshot }) {
    const id = this.nextPanelID++;
    const size = this.getDefaultSize(action);
    const position = this.getInitialPosition(doc, size);
    const node = doc.createElement("section");
    const header = doc.createElement("div");
    const title = doc.createElement("div");
    const closeButton = doc.createElement("button");
    const content = doc.createElement("div");
    const footer = doc.createElement("div");
    const resizeHandle = doc.createElement("div");

    node.className = "zotero-annotai-floating-panel";
    node.style.cssText = [
      "position:fixed",
      "box-sizing:border-box",
      "display:flex",
      "flex-direction:column",
      "background:#fff",
      "color:#1f1f1f",
      "border:1px solid rgba(0,0,0,0.24)",
      "border-radius:6px",
      "box-shadow:0 8px 26px rgba(0,0,0,0.28)",
      "font:13px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "overflow:hidden",
      "contain:layout paint",
    ].join(";");

    header.className = "zotero-annotai-floating-panel-header";
    header.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "gap:8px",
      "height:34px",
      "padding:0 8px 0 12px",
      "background:#f6f7f9",
      "border-bottom:1px solid rgba(0,0,0,0.12)",
      "cursor:move",
      "user-select:none",
      "touch-action:none",
    ].join(";");

    title.className = "zotero-annotai-floating-panel-title";
    title.style.cssText = "font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";

    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "关闭");
    closeButton.style.cssText = [
      "box-sizing:border-box",
      "width:24px",
      "height:24px",
      "border:0",
      "border-radius:4px",
      "background:transparent",
      "color:#444",
      "font-size:20px",
      "line-height:20px",
      "cursor:pointer",
    ].join(";");

    content.className = "zotero-annotai-floating-panel-content";
    content.style.cssText = [
      "flex:1",
      "min-height:0",
      "overflow:auto",
      "padding:10px 12px",
      "background:#fff",
    ].join(";");

    footer.className = "zotero-annotai-floating-panel-footer";
    footer.style.cssText = [
      "box-sizing:border-box",
      "min-height:30px",
      "padding:6px 28px 6px 12px",
      "border-top:1px solid rgba(0,0,0,0.12)",
      "background:#fafafa",
      "color:#5f6368",
      "font-size:12px",
      "line-height:1.4",
    ].join(";");

    resizeHandle.className = "zotero-annotai-floating-panel-resize";
    resizeHandle.style.cssText = [
      "position:absolute",
      "right:0",
      "bottom:0",
      "width:24px",
      "height:24px",
      "cursor:nwse-resize",
      "z-index:2",
      "touch-action:none",
      "background:linear-gradient(135deg, transparent 0 45%, rgba(0,0,0,0.25) 45% 55%, transparent 55% 100%)",
    ].join(";");

    header.append(title, closeButton);
    node.append(header, content, footer, resizeHandle);

    const panel = {
      id,
      action,
      label,
      doc,
      reader,
      snapshot,
      node,
      header,
      title,
      closeButton,
      content,
      footer,
      resizeHandle,
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      openCount: 1,
      upgradeCount: 0,
      status: action === "translate"
        ? "阶段五：翻译浮窗已接入 Provider 输出"
        : "阶段四：Provider 请求层壳，浮窗暂不调用 AI",
      translation: action === "translate" ? this.createTranslationState() : null,
    };

    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.removePanel(panel, { log: true });
    });

    if (doc.defaultView?.PointerEvent) {
      node.addEventListener("pointerdown", (event) => this.activatePanel(panel, event));
      header.addEventListener("pointerdown", (event) => this.startDrag(panel, event));
      resizeHandle.addEventListener("pointerdown", (event) => this.startResize(panel, event));
    }
    else {
      node.addEventListener("mousedown", (event) => this.activatePanel(panel, event));
      header.addEventListener("mousedown", (event) => this.startDrag(panel, event));
      resizeHandle.addEventListener("mousedown", (event) => this.startResize(panel, event));
    }

    this.applyGeometry(panel);
    return panel;
  },

  findPanel(doc, action) {
    return this.panels.find((panel) => panel.doc === doc && panel.action === action) || null;
  },

  cleanupDisconnectedPanels() {
    this.panels = this.panels.filter((panel) => panel.node?.isConnected);
  },

  getDefaultSize(action) {
    if (action === "qa") {
      return { width: 460, height: 360 };
    }
    if (action === "explain") {
      return { width: 420, height: 320 };
    }
    return { width: 380, height: 280 };
  },

  getInitialPosition(doc, size) {
    return this.clampGeometry(doc, 24, 72, size.width, size.height);
  },

  getViewport(doc) {
    const win = doc.defaultView;
    return {
      width: win?.innerWidth || doc.documentElement?.clientWidth || 800,
      height: win?.innerHeight || doc.documentElement?.clientHeight || 600,
    };
  },

  clampGeometry(doc, x, y, width, height) {
    const viewport = this.getViewport(doc);
    const safeWidth = Math.max(this.minWidth, Math.min(width, Math.max(this.minWidth, viewport.width - 16)));
    const safeHeight = Math.max(this.minHeight, Math.min(height, Math.max(this.minHeight, viewport.height - 16)));
    const maxX = Math.max(8, viewport.width - safeWidth - 8);
    const maxY = Math.max(8, viewport.height - safeHeight - 8);

    return {
      x: Math.max(8, Math.min(x, maxX)),
      y: Math.max(8, Math.min(y, maxY)),
      width: safeWidth,
      height: safeHeight,
    };
  },

  applyGeometry(panel) {
    const geometry = this.clampGeometry(panel.doc, panel.x, panel.y, panel.width, panel.height);
    panel.x = geometry.x;
    panel.y = geometry.y;
    panel.width = geometry.width;
    panel.height = geometry.height;
    panel.node.style.left = `${panel.x}px`;
    panel.node.style.top = `${panel.y}px`;
    panel.node.style.width = `${panel.width}px`;
    panel.node.style.height = `${panel.height}px`;
  },

  createWritebackState() {
    return {
      status: "idle",
      fingerprint: "",
      message: "",
      error: null,
      itemID: null,
      key: "",
    };
  },

  createTranslationState() {
    return {
      status: "idle",
      requestID: 0,
      activeRequestID: null,
      fingerprint: "",
      controller: null,
      result: null,
      error: null,
      elapsedMs: null,
      model: "",
      startedAt: null,
      staleRequestID: null,
      staleReason: "",
      writeback: this.createWritebackState(),
    };
  },

  handleTranslatePanelUpdate(panel, snapshot) {
    const nextFingerprint = this.getTranslationFingerprint(snapshot);
    const isLoading = this.isTranslationLoading(panel);

    if (isLoading && nextFingerprint === panel.translation.fingerprint) {
      this.flashPanel(panel);
      this.log?.(`Translate request duplicate discarded panelID=${panel.id} requestID=${panel.translation.activeRequestID}`);
      const message = "翻译请求仍在进行，等待当前请求返回";
      this.showToast(panel.doc, message);
      return { message };
    }

    if (isLoading) {
      this.markTranslationRequestStale(panel, "new-selection");
    }

    panel.snapshot = snapshot;
    this.startTranslationRequest(panel, snapshot, { reason: "selection-update" });
    this.flashPanel(panel);

    const message = "已切换到新选区并重新翻译";
    this.showToast(panel.doc, message);
    return { message };
  },

  async startTranslationRequest(panel, snapshot, { reason } = { reason: "request" }) {
    const translation = panel.translation || this.createTranslationState();
    panel.translation = translation;

    const requestID = translation.requestID + 1;
    const fingerprint = this.getTranslationFingerprint(snapshot);
    const startedAt = Date.now();

    panel.snapshot = snapshot;
    Object.assign(translation, {
      status: "loading",
      requestID,
      activeRequestID: requestID,
      fingerprint,
      controller: null,
      result: null,
      error: null,
      elapsedMs: null,
      model: "",
      startedAt,
      writeback: this.createWritebackState(),
    });
    this.renderPanel(panel);

    try {
      const controller = this.createAbortController(panel.doc);
      translation.controller = controller;

      if (!this.requestRunner || !this.settings || !this.translationTask) {
        throw this.createProviderUnavailableError();
      }

      const provider = this.settings.getActiveProvider();
      const messages = this.translationTask.createMessages(snapshot, { targetLanguage: "中文" });
      this.log?.(
        `Translate request started panelID=${panel.id} requestID=${requestID} reason=${reason} ` +
        `${JSON.stringify(this.translationTask.createSafeLogPayload(snapshot))}`
      );

      const result = await this.requestRunner.runChat({
        provider,
        messages,
        timeoutMs: provider.timeoutMs,
        signal: controller.signal,
      });

      if (!this.isActiveTranslationRequest(panel, requestID, fingerprint)) {
        this.log?.(`Translate stale result discarded panelID=${panel.id} requestID=${requestID}`);
        return;
      }

      const elapsedMs = Date.now() - startedAt;
      Object.assign(translation, {
        status: "success",
        activeRequestID: null,
        controller: null,
        result: result.content,
        error: null,
        elapsedMs,
        model: result.model || provider.model || "",
        writeback: { ...this.createWritebackState(), fingerprint },
      });
      this.renderPanel(panel);
      this.log?.(`Translate request succeeded panelID=${panel.id} requestID=${requestID} model=${translation.model} elapsedMs=${elapsedMs}`);
    }
    catch (error) {
      const normalized = this.normalizeTranslationError(error);

      if (!this.isActiveTranslationRequest(panel, requestID, fingerprint)) {
        this.log?.(`Translate stale error discarded panelID=${panel.id} requestID=${requestID} error=${normalized.name}`);
        return;
      }

      Object.assign(translation, {
        status: normalized.name === "TimeoutError" ? "timeout" : "error",
        activeRequestID: null,
        controller: null,
        result: null,
        error: normalized,
        elapsedMs: Date.now() - startedAt,
        model: "",
      });
      this.renderPanel(panel);
      this.log?.(`Translate request failed panelID=${panel.id} requestID=${requestID} error=${normalized.name} elapsedMs=${translation.elapsedMs}`);
    }
  },

  createAbortController(doc) {
    const win = doc?.defaultView;
    if (win?.AbortController) {
      return new win.AbortController();
    }

    if (typeof AbortController !== "undefined") {
      return new AbortController();
    }

    const mainWindow = typeof Zotero !== "undefined" && Zotero.getMainWindow?.();
    if (mainWindow?.AbortController) {
      return new mainWindow.AbortController();
    }

    const hiddenWindow = typeof Services !== "undefined" && Services.appShell?.hiddenDOMWindow;
    if (hiddenWindow?.AbortController) {
      return new hiddenWindow.AbortController();
    }

    throw this.createProviderUnavailableError("AbortController 不可用");
  },

  markTranslationRequestStale(panel, reason) {
    const translation = panel.translation;
    if (!translation?.controller) {
      return;
    }

    const requestID = translation.activeRequestID;
    translation.staleRequestID = requestID;
    translation.staleReason = reason;
    try {
      translation.controller.abort();
    }
    catch (error) {
      this.log?.(`Translate request abort failed panelID=${panel.id} requestID=${requestID} message=${error.message}`);
    }
    this.log?.(`Translate request marked stale panelID=${panel.id} requestID=${requestID} reason=${reason}`);
  },

  isTranslationLoading(panel) {
    return Boolean(panel.translation?.status === "loading" && panel.translation.activeRequestID !== null);
  },

  isActiveTranslationRequest(panel, requestID, fingerprint) {
    return Boolean(
      panel.node?.isConnected
      && panel.translation?.activeRequestID === requestID
      && panel.translation?.fingerprint === fingerprint
    );
  },

  getTranslationFingerprint(snapshot) {
    if (this.translationTask?.createSelectionFingerprint) {
      return this.translationTask.createSelectionFingerprint(snapshot);
    }

    return [
      String(snapshot?.selectedText || "").trim().replace(/\s+/g, " "),
      Number.isInteger(snapshot?.attachmentItemID) ? String(snapshot.attachmentItemID) : "",
      String(snapshot?.title || "").trim().replace(/\s+/g, " "),
    ].join("\u001f");
  },

  createProviderUnavailableError(message = "Provider 请求层不可用") {
    if (this.errors?.MissingConfigError) {
      return new this.errors.MissingConfigError(message);
    }

    const error = new Error(message);
    error.name = "MissingConfigError";
    return error;
  },

  normalizeTranslationError(error) {
    if (this.errors?.ProviderError && error instanceof this.errors.ProviderError) {
      return error;
    }

    if (error?.name) {
      return error;
    }

    const normalized = new Error(error?.message || "Provider 请求失败");
    normalized.name = "ProviderHTTPError";
    return normalized;
  },

  renderPanel(panel) {
    if (panel.action === "translate") {
      this.renderTranslatePanel(panel);
      return;
    }

    panel.title.textContent = `AnnotAI · ${panel.label}`;
    panel.content.replaceChildren();

    const pre = panel.doc.createElement("pre");
    pre.textContent = JSON.stringify(this.createDiagnosticPayload(panel), null, 2);
    pre.style.cssText = [
      "box-sizing:border-box",
      "margin:0",
      "font:12px ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace",
      "line-height:1.45",
      "white-space:pre-wrap",
      "word-break:break-word",
    ].join(";");
    panel.content.append(pre);
    panel.footer.textContent = panel.status;
    this.applyGeometry(panel);
  },

  renderTranslatePanel(panel) {
    const translation = panel.translation || this.createTranslationState();
    panel.translation = translation;
    panel.title.textContent = `AnnotAI · ${panel.label}`;
    panel.content.replaceChildren();

    const wrapper = panel.doc.createElement("div");
    wrapper.style.cssText = [
      "display:flex",
      "flex-direction:column",
      "gap:10px",
      "min-height:100%",
    ].join(";");

    wrapper.append(
      this.createTranslateSourceBlock(panel),
      this.createTranslateStateBlock(panel)
    );

    const actions = this.createTranslateActions(panel);
    if (actions) {
      wrapper.append(actions);
    }

    const writebackStatus = this.createWritebackStatusBlock(panel);
    if (writebackStatus) {
      wrapper.append(writebackStatus);
    }

    panel.content.append(wrapper);
    panel.footer.textContent = this.getTranslateFooterText(panel);
    this.applyGeometry(panel);
  },

  createTranslateSourceBlock(panel) {
    const section = panel.doc.createElement("section");
    section.style.cssText = [
      "box-sizing:border-box",
      "padding:8px 10px",
      "border:1px solid rgba(0,0,0,0.1)",
      "border-radius:6px",
      "background:#f8f9fa",
    ].join(";");

    const label = panel.doc.createElement("div");
    label.textContent = "原文";
    label.style.cssText = "font-weight:600;margin-bottom:6px;color:#3c4043";

    const text = panel.doc.createElement("div");
    text.textContent = panel.snapshot?.selectedText || "";
    text.style.cssText = [
      "white-space:pre-wrap",
      "word-break:break-word",
      "line-height:1.5",
      "max-height:96px",
      "overflow:auto",
    ].join(";");

    section.append(label, text);
    return section;
  },

  createTranslateStateBlock(panel) {
    const translation = panel.translation || {};
    const section = panel.doc.createElement("section");
    section.style.cssText = [
      "box-sizing:border-box",
      "display:flex",
      "flex-direction:column",
      "gap:8px",
      "min-height:72px",
    ].join(";");

    if (translation.status === "loading") {
      const loading = panel.doc.createElement("div");
      loading.textContent = "正在翻译...";
      loading.style.cssText = [
        "padding:10px",
        "border-radius:6px",
        "background:#e8f0fe",
        "color:#174ea6",
        "font-weight:600",
      ].join(";");
      section.append(loading);
      return section;
    }

    if (translation.status === "success") {
      const label = panel.doc.createElement("div");
      label.textContent = "翻译结果";
      label.style.cssText = "font-weight:600;color:#3c4043";

      const result = panel.doc.createElement("div");
      result.style.cssText = [
        "box-sizing:border-box",
        "padding:10px",
        "border:1px solid rgba(0,0,0,0.1)",
        "border-radius:6px",
        "background:#fff",
        "white-space:pre-wrap",
        "word-break:break-word",
        "line-height:1.55",
      ].join(";");
      this.renderFormattedTranslationResult(panel, result, translation.result || "");

      const meta = panel.doc.createElement("div");
      meta.textContent = [
        translation.model ? `模型：${translation.model}` : "",
        Number.isInteger(translation.elapsedMs) ? `耗时：${translation.elapsedMs}ms` : "",
      ].filter(Boolean).join(" · ");
      meta.style.cssText = "color:#5f6368;font-size:12px";

      section.append(label, result, meta);
      return section;
    }

    if (translation.status === "error" || translation.status === "timeout") {
      const error = panel.doc.createElement("div");
      error.textContent = this.getTranslationErrorMessage(translation.error);
      error.style.cssText = [
        "padding:10px",
        "border-radius:6px",
        "background:#fce8e6",
        "color:#a50e0e",
        "line-height:1.5",
        "white-space:pre-wrap",
        "word-break:break-word",
      ].join(";");
      section.append(error);
      return section;
    }

    const idle = panel.doc.createElement("div");
    idle.textContent = "等待翻译请求";
    idle.style.cssText = "color:#5f6368";
    section.append(idle);
    return section;
  },

  createWritebackStatusBlock(panel) {
    const writeback = panel.translation?.writeback;
    if (!writeback || writeback.status === "idle") {
      return null;
    }

    const node = panel.doc.createElement("div");
    const isError = writeback.status === "error";
    const isLoading = writeback.status === "loading";
    node.textContent = isError
      ? this.getWritebackErrorMessage(writeback.error)
      : (writeback.message || (isLoading ? "正在写入批注..." : "已写入批注。"));
    node.style.cssText = [
      "box-sizing:border-box",
      "padding:8px 10px",
      "border-radius:6px",
      "line-height:1.45",
      "white-space:pre-wrap",
      "word-break:break-word",
      isError ? "background:#fce8e6" : (isLoading ? "background:#e8f0fe" : "background:#e6f4ea"),
      isError ? "color:#a50e0e" : (isLoading ? "color:#174ea6" : "color:#137333"),
    ].join(";");
    return node;
  },

  renderFormattedTranslationResult(panel, container, text) {
    const lines = String(text || "").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (index > 0) {
        container.append(panel.doc.createElement("br"));
      }
      this.appendFormattedTranslationLine(panel, container, line);
    });
  },

  appendFormattedTranslationLine(panel, container, line) {
    const text = String(line);
    const fieldMatch = text.match(/^(\s*)((?:注音|音标|本文义|常用义|译文|语境说明)(?:[（(][^）)\n]{1,24}[）)])?[：:])(\s*)/);
    if (!fieldMatch) {
      this.appendFormattedTranslationText(panel, container, text);
      return;
    }

    const [, leadingSpace, label, spacing] = fieldMatch;
    if (leadingSpace) {
      container.append(panel.doc.createTextNode(leadingSpace));
    }

    const strong = panel.doc.createElement("strong");
    strong.textContent = label;
    strong.style.cssText = "font-weight:700";

    container.append(strong);
    if (spacing) {
      container.append(panel.doc.createTextNode(spacing));
    }
    this.appendFormattedTranslationText(panel, container, text.slice(fieldMatch[0].length));
  },

  appendFormattedTranslationText(panel, container, text) {
    const match = String(text).match(/^(\s*)((?:n|v|vt|vi|adj|adv|prep|conj|pron|num|art|interj|aux|abbr)\.)(\s*)/i);
    if (!match) {
      container.append(panel.doc.createTextNode(text));
      return;
    }

    const [, leadingSpace, partOfSpeech, spacing] = match;
    if (leadingSpace) {
      container.append(panel.doc.createTextNode(leadingSpace));
    }

    const strong = panel.doc.createElement("strong");
    strong.textContent = partOfSpeech;
    strong.style.cssText = "font-weight:700";

    container.append(strong);
    if (spacing) {
      container.append(panel.doc.createTextNode(spacing));
    }
    container.append(panel.doc.createTextNode(String(text).slice(match[0].length)));
  },

  createTranslateActions(panel) {
    const status = panel.translation?.status;
    if (!["success", "error", "timeout"].includes(status)) {
      return null;
    }

    const actions = panel.doc.createElement("div");
    actions.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:8px",
      "flex-wrap:wrap",
    ].join(";");

    if (status === "success") {
      const isWriting = panel.translation?.writeback?.status === "loading";
      actions.append(
        this.createPanelButton(
          panel,
          isWriting ? "写入中..." : "写入批注",
          () => this.writeTranslationAnnotation(panel),
          { disabled: isWriting }
        ),
        this.createPanelButton(panel, "复制", () => this.copyTranslationResult(panel)),
        this.createPanelButton(panel, "重新翻译", () => this.startTranslationRequest(panel, panel.snapshot, { reason: "manual-retry" }))
      );
      return actions;
    }

    actions.append(
      this.createPanelButton(panel, "重试", () => this.startTranslationRequest(panel, panel.snapshot, { reason: "manual-retry" }))
    );
    return actions;
  },

  createPanelButton(panel, label, onClick, { disabled } = { disabled: false }) {
    const button = panel.doc.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = Boolean(disabled);
    button.style.cssText = [
      "border:1px solid rgba(0,0,0,0.2)",
      "border-radius:4px",
      disabled ? "background:#f1f3f4" : "background:#fff",
      disabled ? "color:#80868b" : "color:#1a73e8",
      "padding:3px 8px",
      "font:inherit",
      disabled ? "cursor:default" : "cursor:pointer",
    ].join(";");

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) {
        return;
      }
      onClick();
    });
    return button;
  },

  getTranslateFooterText(panel) {
    const status = panel.translation?.status;
    if (status === "loading") {
      return "阶段五：正在调用 Provider 翻译，不写批注不高亮";
    }
    if (status === "success") {
      if (panel.translation?.writeback?.status === "loading") {
        return "阶段五：正在手动写入批注；翻译完成本身不自动写批注不高亮";
      }
      if (panel.translation?.writeback?.status === "success") {
        return "阶段五：翻译结果已手动写入批注；不自动高亮";
      }
      return "阶段五：翻译完成，可手动写入批注；不自动写批注不高亮";
    }
    if (status === "timeout") {
      return "阶段五：翻译请求超时";
    }
    if (status === "error") {
      return "阶段五：翻译请求失败";
    }
    return panel.status;
  },

  getTranslationErrorMessage(error) {
    if (this.errors?.toUserMessage) {
      return this.errors.toUserMessage(error);
    }

    return error?.message || "Provider 请求失败";
  },

  async writeTranslationAnnotation(panel) {
    const translation = panel.translation;
    const text = translation?.result || "";
    if (!text) {
      this.showToast(panel.doc, "没有可写入的翻译结果");
      return;
    }

    if (!this.annotationWriter?.writeTranslationComment) {
      const error = this.createWritebackError("当前 Zotero Reader 不支持写入批注。");
      translation.writeback = {
        ...this.createWritebackState(),
        status: "error",
        fingerprint: translation.fingerprint,
        error,
      };
      this.renderPanel(panel);
      return;
    }

    const fingerprint = translation.fingerprint;
    translation.writeback = {
      ...this.createWritebackState(),
      status: "loading",
      fingerprint,
      message: "正在写入批注...",
    };
    this.renderPanel(panel);

    try {
      const result = await this.annotationWriter.writeTranslationComment({
        reader: panel.reader,
        snapshot: panel.snapshot,
        text,
      });

      if (!this.isActiveWriteback(panel, fingerprint, text)) {
        this.log?.(`Annotation writeback stale result discarded panelID=${panel.id}`);
        return;
      }

      translation.writeback = {
        ...this.createWritebackState(),
        status: "success",
        fingerprint,
        message: result?.message || "已写入批注。",
        itemID: Number.isInteger(result?.itemID) ? result.itemID : null,
        key: result?.key || "",
      };
      this.renderPanel(panel);
      this.showToast(panel.doc, "已写入批注");
    }
    catch (error) {
      if (!this.isActiveWriteback(panel, fingerprint, text)) {
        this.log?.(`Annotation writeback stale error discarded panelID=${panel.id}`);
        return;
      }

      const normalized = this.normalizeWritebackError(error);
      translation.writeback = {
        ...this.createWritebackState(),
        status: "error",
        fingerprint,
        error: normalized,
      };
      this.renderPanel(panel);
      this.showToast(panel.doc, this.getWritebackErrorMessage(normalized));
      this.log?.(`Annotation writeback failed panelID=${panel.id} error=${normalized.code || normalized.name}`);
    }
  },

  isActiveWriteback(panel, fingerprint, text) {
    return Boolean(
      panel.node?.isConnected
      && panel.translation?.status === "success"
      && panel.translation?.fingerprint === fingerprint
      && panel.translation?.result === text
      && panel.translation?.writeback?.status === "loading"
      && panel.translation?.writeback?.fingerprint === fingerprint
    );
  },

  normalizeWritebackError(error) {
    if (error?.userMessage) {
      return error;
    }
    return this.createWritebackError(this.sanitizeMessage(error?.message || "写入批注失败。"));
  },

  createWritebackError(message) {
    const error = new Error(message);
    error.name = "AnnotationWriteError";
    error.userMessage = message;
    return error;
  },

  getWritebackErrorMessage(error) {
    return error?.userMessage || error?.message || "写入批注失败。";
  },

  sanitizeMessage(message) {
    return String(message || "")
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
      .replace(/sk-[A-Za-z0-9._-]+/g, "sk-[redacted]")
      .slice(0, 240);
  },

  copyTranslationResult(panel) {
    const text = panel.translation?.result || "";
    if (!text) {
      this.showToast(panel.doc, "没有可复制的翻译结果");
      return;
    }

    const result = this.copyText(panel, text);
    if (result?.then) {
      result
        .then(() => this.showToast(panel.doc, "已复制翻译结果"))
        .catch(() => this.showToast(panel.doc, "复制失败"));
      return;
    }

    this.showToast(panel.doc, result ? "已复制翻译结果" : "复制失败");
  },

  copyText(panel, text) {
    if (typeof Components !== "undefined") {
      try {
        const helper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
          .getService(Components.interfaces.nsIClipboardHelper);
        helper.copyString(text);
        return true;
      }
      catch {
        // Fall back to navigator.clipboard when the XPCOM helper is unavailable.
      }
    }

    const clipboard = panel.doc.defaultView?.navigator?.clipboard;
    if (clipboard?.writeText) {
      return clipboard.writeText(text);
    }

    return false;
  },

  createDiagnosticPayload(panel) {
    return {
      action: panel.snapshot.action,
      selectedText: panel.snapshot.selectedText,
      charCount: panel.snapshot.charCount,
      readerType: panel.snapshot.readerType,
      attachmentItemID: panel.snapshot.attachmentItemID,
      parentItemID: panel.snapshot.parentItemID,
      title: panel.snapshot.title,
      creators: panel.snapshot.creators,
      date: panel.snapshot.date,
      annotationKeys: panel.snapshot.annotationKeys,
      positionAvailable: panel.snapshot.positionAvailable,
      openCount: panel.openCount,
      upgradeCount: panel.upgradeCount,
    };
  },

  bringToFront(panel) {
    this.ensurePanelInBody(panel);
    panel.node.style.clipPath = "";
    panel.node.style.zIndex = String(this.nextZIndex++);
  },

  activatePanel(panel, event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    this.bringToFront(panel);
  },

  ensurePanelInBody(panel) {
    const body = panel.doc?.body;

    if (!body || panel.node.parentNode === body) {
      return;
    }

    body.append(panel.node);
  },

  flashPanel(panel) {
    const originalBackground = panel.header.style.background;
    panel.header.style.background = "#e8f0fe";
    panel.doc.defaultView?.setTimeout(() => {
      if (panel.header?.isConnected) {
        panel.header.style.background = originalBackground;
      }
    }, 350);
  },

  showToast(doc, message) {
    if (!doc?.body || !message) {
      return;
    }

    const container = this.getToastContainer(doc);
    const toast = doc.createElement("div");
    toast.textContent = message;
    toast.style.cssText = [
      "box-sizing:border-box",
      "max-width:360px",
      "padding:8px 12px",
      "border-radius:6px",
      "background:rgba(32,33,36,0.94)",
      "color:#fff",
      "box-shadow:0 6px 18px rgba(0,0,0,0.24)",
      "font:13px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "line-height:1.4",
      "opacity:0",
      "transform:translateY(-6px)",
      "transition:opacity 160ms ease, transform 160ms ease",
    ].join(";");

    container.append(toast);
    const win = doc.defaultView;
    win?.requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    win?.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      win.setTimeout(() => toast.remove(), 220);
    }, 1700);
  },

  getToastContainer(doc) {
    let container = doc.querySelector(".zotero-annotai-toast-container");
    if (container) {
      return container;
    }

    container = doc.createElement("div");
    container.className = "zotero-annotai-toast-container";
    container.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:28px",
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "gap:8px",
      "z-index:2147483647",
      "pointer-events:none",
      "transform:translateX(-50%)",
    ].join(";");
    doc.body.append(container);

    if (!this.toastDocs.includes(doc)) {
      this.toastDocs.push(doc);
    }

    return container;
  },

  startDrag(panel, event) {
    if (event.button !== 0 || event.target === panel.closeButton) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.bringToFront(panel);

    const startX = event.clientX;
    const startY = event.clientY;
    const originalX = panel.x;
    const originalY = panel.y;

    this.startPointerOperation(panel, event, (moveEvent) => {
      moveEvent.preventDefault();
      panel.x = originalX + moveEvent.clientX - startX;
      panel.y = originalY + moveEvent.clientY - startY;
      this.applyGeometry(panel);
    });
  },

  startResize(panel, event) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.bringToFront(panel);

    const startX = event.clientX;
    const startY = event.clientY;
    const originalWidth = panel.width;
    const originalHeight = panel.height;

    this.startPointerOperation(panel, event, (moveEvent) => {
      moveEvent.preventDefault();
      panel.width = originalWidth + moveEvent.clientX - startX;
      panel.height = originalHeight + moveEvent.clientY - startY;
      this.applyGeometry(panel);
    });
  },

  startPointerOperation(panel, event, onMove) {
    const win = panel.doc.defaultView;
    if (!win) {
      return;
    }

    const target = event.currentTarget;
    const isPointerEvent = event.pointerId !== undefined;
    const moveType = isPointerEvent ? "pointermove" : "mousemove";
    const upType = isPointerEvent ? "pointerup" : "mouseup";
    const cancelType = isPointerEvent ? "pointercancel" : "mouseleave";
    const originalUserSelect = panel.doc.body.style.userSelect;
    const originalCursor = panel.doc.body.style.cursor;

    panel.doc.body.style.userSelect = "none";
    panel.doc.body.style.cursor = target === panel.resizeHandle ? "nwse-resize" : "move";

    if (isPointerEvent && target?.setPointerCapture) {
      try {
        target.setPointerCapture(event.pointerId);
      }
      catch (error) {
        this.log?.(`Pointer capture failed: ${error.message}`);
      }
    }

    const cleanup = (upEvent) => {
      upEvent?.preventDefault?.();
      panel.doc.body.style.userSelect = originalUserSelect;
      panel.doc.body.style.cursor = originalCursor;

      if (isPointerEvent && target?.releasePointerCapture) {
        try {
          target.releasePointerCapture(event.pointerId);
        }
        catch {
          // Pointer capture may already be released by the browser.
        }
      }

      target?.removeEventListener?.(moveType, onMove, true);
      target?.removeEventListener?.(upType, cleanup, true);
      target?.removeEventListener?.(cancelType, cleanup, true);
      win.removeEventListener(moveType, onMove, true);
      win.removeEventListener(upType, cleanup, true);
      win.removeEventListener(cancelType, cleanup, true);
    };

    target?.addEventListener?.(moveType, onMove, true);
    target?.addEventListener?.(upType, cleanup, true);
    target?.addEventListener?.(cancelType, cleanup, true);
    win.addEventListener(moveType, onMove, true);
    win.addEventListener(upType, cleanup, true);
    win.addEventListener(cancelType, cleanup, true);
  },

  removePanel(panel, { log } = { log: false }) {
    if (panel.translation?.controller) {
      try {
        panel.translation.activeRequestID = null;
        panel.translation.controller.abort();
      }
      catch (error) {
        this.log?.(`Translate request abort on close failed panelID=${panel.id} message=${error.message}`);
      }
      panel.translation.controller = null;
    }
    panel.node?.remove();
    this.panels = this.panels.filter((candidate) => candidate !== panel);
    if (log) {
      this.log?.(`Floating panel closed action=${panel.action} panelID=${panel.id}`);
    }
  },
};
