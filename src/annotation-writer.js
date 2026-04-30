var ZoteroAnnotAIAnnotationWriter = {
  settings: null,
  log: null,

  defaultOptions: {
    type: "highlight",
    color: "#e56eee",
  },

  init({ settings, log } = {}) {
    this.settings = settings || (typeof ZoteroAnnotAISettings !== "undefined" ? ZoteroAnnotAISettings : null);
    this.log = log || ((message) => Zotero.debug(`[Zotero AnnotAI] ${message}`));
    this.log("Annotation writer initialized");
  },

  shutdown() {
    this.settings = null;
    this.log = null;
  },

  async writeTranslationComment({ reader, snapshot, text } = {}) {
    const comment = this.normalizeComment(text);
    if (!comment) {
      throw this.createUserError("EMPTY_COMMENT", "没有可写入的翻译结果。");
    }

    const attachment = this.getAttachmentItem(reader, snapshot);
    if (!attachment) {
      throw this.createUserError("READER_UNAVAILABLE", "当前 Zotero Reader 不支持写入批注。");
    }

    const existingItem = this.findExistingAnnotation(attachment, snapshot);
    if (existingItem) {
      const item = await this.updateExistingAnnotation(existingItem, attachment, comment, reader);
      await this.syncReaderAnnotation(reader, item);
      this.log?.(`Annotation comment updated action=translate attachmentItemID=${attachment.id}`);
      return {
        mode: "update",
        itemID: item.id,
        key: item.key || "",
        message: "已写入批注。",
      };
    }

    const draft = snapshot?.annotationDraft;
    if (!this.hasWritableDraft(draft)) {
      throw this.createUserError("NO_DRAFT", "当前选区无法写入批注，请重新选择文本后再试。");
    }

    if (!Zotero.Annotations?.saveFromJSON) {
      throw this.createUserError("READER_UNAVAILABLE", "当前 Zotero Reader 不支持写入批注。");
    }

    const item = await this.createAnnotationFromDraft(attachment, draft, snapshot, comment, reader);
    await this.syncReaderAnnotation(reader, item);
    this.log?.(`Annotation comment created action=translate attachmentItemID=${attachment.id}`);
    return {
      mode: "create",
      itemID: item.id,
      key: item.key || "",
      message: "已写入批注。",
    };
  },

  normalizeComment(value) {
    return typeof value === "string" ? value.trim() : "";
  },

  getAttachmentItem(reader, snapshot) {
    const itemID = Number.isInteger(snapshot?.attachmentItemID)
      ? snapshot.attachmentItemID
      : (Number.isInteger(reader?.itemID) ? reader.itemID : null);
    if (!Number.isInteger(itemID)) {
      return null;
    }

    try {
      const item = Zotero.Items.get(itemID);
      return item || null;
    }
    catch (error) {
      this.log?.(`Unable to read attachment item for annotation writeback: ${this.sanitizeMessage(error.message)}`);
      return null;
    }
  },

  findExistingAnnotation(attachment, snapshot) {
    const keys = this.getAnnotationKeys(snapshot);
    for (let key of keys) {
      const item = this.getAnnotationByKeyOrID(attachment, key);
      if (!item || !this.isAnnotationForAttachment(item, attachment)) {
        continue;
      }
      if (!this.isEditable(item)) {
        throw this.createUserError("NOT_EDITABLE", "当前批注不可编辑，无法写入翻译结果。");
      }
      if (item) {
        return item;
      }
    }
    return null;
  },

  getAnnotationKeys(snapshot) {
    const values = [];
    if (Array.isArray(snapshot?.annotationKeys)) {
      values.push(...snapshot.annotationKeys);
    }
    if (snapshot?.annotationDraft?.key) {
      values.push(snapshot.annotationDraft.key);
    }
    if (snapshot?.annotationDraft?.id) {
      values.push(snapshot.annotationDraft.id);
    }

    return values
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
      .filter((value, index, array) => array.indexOf(value) === index);
  },

  getAnnotationByKeyOrID(attachment, value) {
    try {
      const itemID = Number(value);
      if (Number.isInteger(itemID) && String(itemID) === String(value)) {
        const item = Zotero.Items.get(itemID);
        if (item) {
          return item;
        }
      }

      if (!attachment?.libraryID || !Zotero.Items?.getByLibraryAndKey) {
        return null;
      }
      return Zotero.Items.getByLibraryAndKey(attachment.libraryID, String(value)) || null;
    }
    catch (error) {
      this.log?.(`Unable to resolve annotation for writeback: ${this.sanitizeMessage(error.message)}`);
      return null;
    }
  },

  isAnnotationForAttachment(item, attachment) {
    try {
      return Boolean(
        item
        && item.isAnnotation?.()
        && item.parentID === attachment.id
      );
    }
    catch {
      return false;
    }
  },

  isEditable(item) {
    try {
      return Boolean(!item?.isEditable || item.isEditable());
    }
    catch {
      return false;
    }
  },

  isWritableAnnotation(item, attachment) {
    return Boolean(this.isAnnotationForAttachment(item, attachment) && this.isEditable(item));
  },

  async updateExistingAnnotation(item, attachment, comment, reader) {
    if (!this.isWritableAnnotation(item, attachment)) {
      throw this.createUserError("NOT_EDITABLE", "当前批注不可编辑，无法写入翻译结果。");
    }

    const notifierQueue = this.createNotifierQueue();
    try {
      item.annotationComment = comment;
      await item.saveTx(this.createSaveOptions(reader, notifierQueue));
      return item;
    }
    catch (error) {
      throw this.wrapSaveError(error);
    }
    finally {
      await this.commitNotifierQueue(notifierQueue);
    }
  },

  async createAnnotationFromDraft(attachment, draft, snapshot, comment, reader) {
    const options = this.getAnnotationOptions("translate");
    const json = {
      key: this.generateAnnotationKey(),
      type: options.type,
      color: options.color,
      pageLabel: typeof draft.pageLabel === "string" ? draft.pageLabel : "",
      sortIndex: draft.sortIndex,
      position: this.clonePlainValue(draft.position),
      text: typeof draft.text === "string" && draft.text ? draft.text : String(snapshot?.selectedText || ""),
      comment,
      tags: this.normalizeTags(draft.tags),
    };

    const notifierQueue = this.createNotifierQueue();
    try {
      return await Zotero.Annotations.saveFromJSON(
        attachment,
        json,
        this.createSaveOptions(reader, notifierQueue)
      );
    }
    catch (error) {
      throw this.wrapSaveError(error);
    }
    finally {
      await this.commitNotifierQueue(notifierQueue);
    }
  },

  hasWritableDraft(draft) {
    return Boolean(
      draft
      && typeof draft === "object"
      && draft.position
      && draft.sortIndex !== undefined
      && draft.sortIndex !== null
      && draft.sortIndex !== ""
    );
  },

  getAnnotationOptions(action) {
    if (this.settings?.getAnnotationOptions) {
      return this.settings.getAnnotationOptions(action);
    }
    return { ...this.defaultOptions };
  },

  normalizeTags(tags) {
    if (!Array.isArray(tags)) {
      return [];
    }

    return tags
      .map((tag) => {
        if (typeof tag === "string") {
          return { name: tag };
        }
        if (typeof tag?.name === "string") {
          return { name: tag.name };
        }
        return null;
      })
      .filter(Boolean);
  },

  createSaveOptions(reader, notifierQueue) {
    const notifierData = {};
    if (reader?._instanceID) {
      notifierData.instanceID = reader._instanceID;
    }
    if (Zotero.Notes?.AUTO_SYNC_DELAY) {
      notifierData.autoSyncDelay = Zotero.Notes.AUTO_SYNC_DELAY;
    }

    const options = {
      skipSelect: true,
      notifierData,
    };
    if (notifierQueue) {
      options.notifierQueue = notifierQueue;
    }
    return options;
  },

  createNotifierQueue() {
    try {
      return Zotero.Notifier?.Queue ? new Zotero.Notifier.Queue() : null;
    }
    catch {
      return null;
    }
  },

  async commitNotifierQueue(notifierQueue) {
    if (!notifierQueue || !Zotero.Notifier?.commit) {
      return;
    }

    try {
      await Zotero.Notifier.commit(notifierQueue);
    }
    catch (error) {
      this.log?.(`Annotation notifier commit failed: ${this.sanitizeMessage(error.message)}`);
    }
  },

  async syncReaderAnnotation(reader, item) {
    if (!reader?.setAnnotations || !item) {
      return false;
    }

    try {
      await reader.setAnnotations([item]);
      return true;
    }
    catch (error) {
      this.log?.(`Reader annotation sync failed after writeback: ${this.sanitizeMessage(error.message)}`);
      return false;
    }
  },

  generateAnnotationKey() {
    if (Zotero.DataObjectUtilities?.generateKey) {
      return Zotero.DataObjectUtilities.generateKey();
    }

    const allowed = "23456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
    let key = "";
    for (let index = 0; index < 8; index += 1) {
      key += allowed[Math.floor(Math.random() * allowed.length)];
    }
    return key;
  },

  clonePlainValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    if (["string", "number", "boolean"].includes(typeof value)) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.clonePlainValue(item));
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

  wrapSaveError(error) {
    const message = this.sanitizeMessage(error?.message || "写入失败");
    this.log?.(`Annotation writeback save failed: ${message}`);
    return this.createUserError("SAVE_FAILED", `写入批注失败：${message}`);
  },

  createUserError(code, message) {
    const error = new Error(message);
    error.name = "AnnotationWriteError";
    error.code = code;
    error.userMessage = message;
    return error;
  },

  sanitizeMessage(message) {
    return String(message || "")
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
      .replace(/sk-[A-Za-z0-9._-]+/g, "sk-[redacted]")
      .slice(0, 240);
  },
};
