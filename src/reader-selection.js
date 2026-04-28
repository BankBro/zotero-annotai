var ZoteroAnnotAIReaderSelection = {
  eventType: "renderTextSelectionPopup",
  pluginID: null,
  handler: null,
  registered: false,
  log: null,
  floatingPanel: null,

  init({ pluginID, log, floatingPanel }) {
    this.pluginID = pluginID;
    this.log = log || ((message) => Zotero.debug(`[Zotero AnnotAI] ${message}`));
    this.floatingPanel = floatingPanel || null;

    if (!Zotero.Reader?.registerEventListener) {
      this.log("Reader event API unavailable");
      return;
    }

    this.handler = this.handleRenderTextSelectionPopup.bind(this);
    Zotero.Reader.registerEventListener(this.eventType, this.handler, this.pluginID);
    this.registered = true;
    this.log("Reader selection listener registered");
  },

  shutdown() {
    if (this.registered && this.handler && Zotero.Reader?.unregisterEventListener) {
      try {
        Zotero.Reader.unregisterEventListener(this.eventType, this.handler);
        this.log?.("Reader selection listener unregistered");
      }
      catch (error) {
        Zotero.logError(error);
        this.log?.(`Reader selection listener unregister failed: ${error.message}`);
      }
    }

    this.pluginID = null;
    this.handler = null;
    this.registered = false;
    this.log = null;
    this.floatingPanel = null;
  },

  handleRenderTextSelectionPopup(event) {
    try {
      const { reader, doc, params, append } = event;
      const selectedText = this.getSelectedText(params);

      if (!selectedText) {
        this.log?.("Text selection popup rendered without selected text");
        return;
      }

      const container = this.createPopupContent(doc, reader, params, selectedText);
      append(container);
      this.schedulePopupToolsDedupe(doc, container);
    }
    catch (error) {
      Zotero.logError(error);
      this.log?.(`Reader selection popup render failed: ${error.message}`);
    }
  },

  createPopupContent(doc, reader, params, selectedText) {
    const container = doc.createElement("div");
    container.className = "zotero-annotai-selection-tools";
    container.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:6px",
      "padding:6px 8px",
      "border-top:1px solid rgba(0,0,0,0.12)",
      "font-size:12px",
      "line-height:1.4",
      "white-space:nowrap",
    ].join(";");

    const label = doc.createElement("span");
    label.textContent = "AnnotAI";
    label.style.cssText = "font-weight:600;color:#444;margin-right:2px";
    container.append(label);

    for (let action of [
      { id: "translate", label: "翻译" },
      { id: "explain", label: "解释" },
      { id: "qa", label: "问答" },
    ]) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.style.cssText = [
        "border:1px solid rgba(0,0,0,0.2)",
        "border-radius:4px",
        "background:#fff",
        "color:#1a73e8",
        "padding:2px 6px",
        "font:inherit",
        "cursor:pointer",
      ].join(";");

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const snapshot = this.createSelectionSnapshot(action.id, reader, params, selectedText);
        this.logSelectionSnapshot(snapshot);
        this.openFloatingPanel({
          action,
          doc,
          reader,
          snapshot,
          anchorElement: button,
        });
      });

      container.append(button);
    }

    return container;
  },

  schedulePopupToolsDedupe(doc, container) {
    const win = doc?.defaultView;

    this.dedupePopupTools(container);
    win?.requestAnimationFrame?.(() => this.dedupePopupTools(container));
    win?.setTimeout?.(() => this.dedupePopupTools(container), 80);
  },

  dedupePopupTools(container) {
    if (!container?.isConnected) {
      return;
    }

    const nativePopup = this.getNativePopupInfo(container);
    const popupElement = nativePopup?.element || container.parentElement;
    const tools = Array.from(popupElement?.querySelectorAll?.(".zotero-annotai-selection-tools") || []);

    for (let tool of tools) {
      if (tool !== container) {
        tool.remove();
      }
    }
  },

  getNativePopupRect(container) {
    return this.getNativePopupInfo(container)?.rect || null;
  },

  getNativePopupInfo(container) {
    if (!container?.getBoundingClientRect) {
      return null;
    }

    const doc = container.ownerDocument;
    const win = doc?.defaultView;
    const viewportWidth = win?.innerWidth || doc?.documentElement?.clientWidth || 0;
    const viewportHeight = win?.innerHeight || doc?.documentElement?.clientHeight || 0;
    const viewportArea = viewportWidth * viewportHeight;
    const containerRect = container.getBoundingClientRect();
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;
    let current = container.parentElement;
    let bestElement = container;
    let bestRect = containerRect;
    let bestArea = containerRect.width * containerRect.height;

    while (current && current !== doc.body) {
      const rect = current.getBoundingClientRect();
      const area = rect.width * rect.height;
      const containsContainerCenter = rect.left <= containerCenterX
        && rect.right >= containerCenterX
        && rect.top <= containerCenterY
        && rect.bottom >= containerCenterY;
      const isReasonablePopupSize = rect.width > 0
        && rect.height > 0
        && (!viewportWidth || rect.width <= viewportWidth * 0.75)
        && (!viewportHeight || rect.height <= viewportHeight * 0.75)
        && (!viewportArea || area <= viewportArea * 0.35);

      if (containsContainerCenter && isReasonablePopupSize && area >= bestArea) {
        bestElement = current;
        bestRect = rect;
        bestArea = area;
      }

      current = current.parentElement;
    }

    bestRect = this.getUnionRect(bestElement, bestRect, viewportWidth, viewportHeight);

    return {
      element: bestElement,
      rect: {
        left: bestRect.left,
        top: bestRect.top,
        right: bestRect.right,
        bottom: bestRect.bottom,
        width: bestRect.width,
        height: bestRect.height,
      },
    };
  },

  getUnionRect(root, fallbackRect, viewportWidth, viewportHeight) {
    if (!root?.querySelectorAll) {
      return fallbackRect;
    }

    const union = {
      left: fallbackRect.left,
      top: fallbackRect.top,
      right: fallbackRect.right,
      bottom: fallbackRect.bottom,
    };

    for (let element of root.querySelectorAll("*")) {
      const rect = element.getBoundingClientRect?.();

      if (!rect || rect.width <= 0 || rect.height <= 0) {
        continue;
      }

      const isInViewport = rect.right >= 0
        && rect.bottom >= 0
        && (!viewportWidth || rect.left <= viewportWidth)
        && (!viewportHeight || rect.top <= viewportHeight);

      if (!isInViewport) {
        continue;
      }

      union.left = Math.min(union.left, rect.left);
      union.top = Math.min(union.top, rect.top);
      union.right = Math.max(union.right, rect.right);
      union.bottom = Math.max(union.bottom, rect.bottom);
    }

    return {
      left: union.left,
      top: union.top,
      right: union.right,
      bottom: union.bottom,
      width: union.right - union.left,
      height: union.bottom - union.top,
    };
  },

  openFloatingPanel({ action, doc, reader, snapshot, anchorElement }) {
    if (!this.floatingPanel?.open) {
      this.log?.("Floating panel module unavailable");
      return { message: "浮窗不可用" };
    }

    try {
      return this.floatingPanel.open({
        action: action.id,
        label: action.label,
        doc,
        reader,
        snapshot,
        anchorElement,
      });
    }
    catch (error) {
      Zotero.logError(error);
      this.log?.(`Floating panel open failed: ${error.message}`);
      return { message: "打开失败" };
    }
  },

  getSelectedText(params) {
    const text = params?.annotation?.text;
    return typeof text === "string" ? text.trim() : "";
  },

  createSelectionSnapshot(action, reader, params, selectedText) {
    const attachmentItemID = this.getReaderItemID(reader);
    const attachment = this.getItem(attachmentItemID);
    const parentItemID = attachment?.parentID || attachment?.parentItemID || null;
    const parentItem = this.getItem(parentItemID);
    const metadataItem = parentItem || attachment;
    const annotation = params?.annotation || {};

    return {
      action,
      selectedText,
      charCount: selectedText.length,
      readerType: reader?.type || reader?._type || null,
      attachmentItemID,
      parentItemID,
      title: this.getField(metadataItem, "title"),
      creators: this.getCreators(metadataItem),
      date: this.getField(metadataItem, "date"),
      annotationKeys: this.getAnnotationKeys(annotation),
      positionAvailable: this.hasSelectionPosition(annotation),
    };
  },

  getReaderItemID(reader) {
    const itemID = reader?.itemID;
    return Number.isInteger(itemID) ? itemID : null;
  },

  getItem(itemID) {
    if (!Number.isInteger(itemID)) {
      return null;
    }

    try {
      return Zotero.Items.get(itemID) || null;
    }
    catch (error) {
      this.log?.(`Unable to read Zotero item ${itemID}: ${error.message}`);
      return null;
    }
  },

  getField(item, field) {
    if (!item?.getField) {
      return "";
    }

    try {
      return item.getField(field) || "";
    }
    catch {
      return "";
    }
  },

  getCreators(item) {
    if (!item?.getCreators) {
      return [];
    }

    try {
      return item.getCreators()
        .map((creator) => creator.name || [creator.firstName, creator.lastName].filter(Boolean).join(" "))
        .filter(Boolean);
    }
    catch {
      return [];
    }
  },

  getAnnotationKeys(annotation) {
    return [annotation.id, annotation.key]
      .filter(Boolean)
      .map(String)
      .filter((value, index, values) => values.indexOf(value) === index);
  },

  hasSelectionPosition(annotation) {
    return Boolean(
      annotation.position
      || annotation.rects
      || annotation.pageLabel
      || annotation.pageIndex !== undefined
    );
  },

  logSelectionSnapshot(snapshot) {
    const payload = {
      action: snapshot.action,
      charCount: snapshot.charCount,
      selectedTextPreview: this.truncate(snapshot.selectedText, 240),
      readerType: snapshot.readerType,
      attachmentItemID: snapshot.attachmentItemID,
      parentItemID: snapshot.parentItemID,
      title: this.truncate(snapshot.title, 120),
      creators: snapshot.creators,
      date: snapshot.date,
      annotationKeys: snapshot.annotationKeys,
      positionAvailable: snapshot.positionAvailable,
    };

    this.log?.(`Selection snapshot ${JSON.stringify(payload)}`);
  },

  truncate(value, maxLength) {
    if (typeof value !== "string") {
      return "";
    }

    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength)}...`;
  },
};
