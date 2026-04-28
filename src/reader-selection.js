var ZoteroAnnotAIReaderSelection = {
  eventType: "renderTextSelectionPopup",
  pluginID: null,
  handler: null,
  registered: false,
  log: null,

  init({ pluginID, log }) {
    this.pluginID = pluginID;
    this.log = log || ((message) => Zotero.debug(`[Zotero AnnotAI] ${message}`));

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
      "border-top:1px solid rgba(0,0,0,0.12)",
      "font-size:12px",
      "line-height:1.4",
      "white-space:nowrap",
    ].join(";");

    const label = doc.createElement("span");
    label.textContent = "AnnotAI";
    label.style.cssText = "font-weight:600;color:#444;margin-right:2px";
    container.append(label);

    const status = doc.createElement("span");
    status.style.cssText = "color:#5f6368;margin-left:2px";

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
        status.textContent = `已记录：${action.label}`;
      });

      container.append(button);
    }

    container.append(status);
    return container;
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
