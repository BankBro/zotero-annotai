var ZoteroAnnotAIFloatingPanel = {
  panels: [],
  nextPanelID: 1,
  nextZIndex: 10000,
  log: null,
  minWidth: 280,
  minHeight: 180,
  toastDocs: [],

  init({ log } = {}) {
    this.shutdown();
    this.log = log || ((message) => Zotero.debug(`[Zotero AnnotAI] ${message}`));
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
    this.renderPanel(panel);
    this.bringToFront(panel);
    this.log?.(`Floating panel opened action=${action} panelID=${panel.id}`);

    const message = `已打开：${label}`;
    this.showToast(doc, message);
    return { message };
  },

  handleExistingPanel(panel, snapshot) {
    panel.openCount += 1;
    this.bringToFront(panel);
    panel.snapshot = snapshot;
    panel.upgradeCount += 1;

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
      status: "阶段三：仅验证浮窗，不调用 AI",
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

  renderPanel(panel) {
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
    panel.node?.remove();
    this.panels = this.panels.filter((candidate) => candidate !== panel);
    if (log) {
      this.log?.(`Floating panel closed action=${panel.action} panelID=${panel.id}`);
    }
  },
};
