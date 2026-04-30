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
      annotationDraft: this.createAnnotationDraft(annotation, selectedText),
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

  createAnnotationDraft(annotation, selectedText) {
    if (!annotation || typeof annotation !== "object") {
      return null;
    }

    const draft = {};
    for (let key of ["id", "key", "type", "color", "pageLabel", "sortIndex", "comment"]) {
      if (annotation[key] !== undefined && annotation[key] !== null) {
        draft[key] = this.clonePlainValue(annotation[key]);
      }
    }

    draft.text = typeof annotation.text === "string" && annotation.text
      ? annotation.text
      : selectedText;

    if (annotation.position) {
      draft.position = this.clonePlainValue(annotation.position);
    }
    else if (annotation.rects || annotation.pageIndex !== undefined) {
      draft.position = {};
      if (annotation.pageIndex !== undefined) {
        draft.position.pageIndex = this.clonePlainValue(annotation.pageIndex);
      }
      if (annotation.rects) {
        draft.position.rects = this.clonePlainValue(annotation.rects);
      }
      if (annotation.nextPageRects) {
        draft.position.nextPageRects = this.clonePlainValue(annotation.nextPageRects);
      }
    }
    if (Array.isArray(annotation.tags)) {
      draft.tags = this.clonePlainValue(annotation.tags);
    }

    return Object.keys(draft).length ? draft : null;
  },

  logSelectionSnapshot(snapshot) {
    const payload = {
      action: snapshot.action,
      charCount: snapshot.charCount,
      readerType: snapshot.readerType,
      attachmentItemID: snapshot.attachmentItemID,
      parentItemID: snapshot.parentItemID,
      hasTitle: Boolean(snapshot.title),
      creatorCount: Array.isArray(snapshot.creators) ? snapshot.creators.length : 0,
      hasDate: Boolean(snapshot.date),
      annotationKeyCount: Array.isArray(snapshot.annotationKeys) ? snapshot.annotationKeys.length : 0,
      positionAvailable: snapshot.positionAvailable,
      annotationDraftAvailable: Boolean(snapshot.annotationDraft),
    };

    this.log?.(`Selection snapshot ${JSON.stringify(payload)}`);
  },

  clonePlainValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    if (["string", "number", "boolean"].includes(typeof value)) {
      return value;
    }
    if (typeof value === "object") {
      try {
        return JSON.parse(JSON.stringify(value));
      }
      catch {
        // Fall through to a manual clone for simple cross-compartment objects.
      }
    }
    if (Array.isArray(value)) {
      const clone = [];
      for (let index = 0; index < value.length; index += 1) {
        clone.push(this.clonePlainValue(value[index]));
      }
      return clone;
    }
    if (typeof value === "object") {
      const clone = {};
      for (let key of Object.keys(value)) {
        if (typeof value[key] !== "function") {
          clone[key] = this.clonePlainValue(value[key]);
        }
      }
      return clone;
    }
    return undefined;
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
