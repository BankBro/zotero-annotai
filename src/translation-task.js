var ZoteroAnnotAITranslationTask = {
  targetLanguage: "中文",

  createMessages(snapshot, { targetLanguage } = {}) {
    const language = this.normalizeString(targetLanguage) || this.targetLanguage;
    const selectedText = this.normalizeString(snapshot?.selectedText);
    const title = this.normalizeString(snapshot?.title) || "未知";
    const authors = Array.isArray(snapshot?.creators) && snapshot.creators.length
      ? snapshot.creators.join(", ")
      : "未知";
    const date = this.normalizeString(snapshot?.date) || "未知";

    return [
      {
        role: "system",
        content: [
          "你是学术论文阅读助手。请根据论文元数据和用户选中的文本进行翻译。",
          `默认输出语言是${language}。`,
          "不要输出与翻译无关的寒暄。",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `论文标题：${title}`,
          `作者：${authors}`,
          `日期：${date}`,
          "",
          "选中文本：",
          selectedText,
          "",
          "要求：",
          "1. 判断选中文本是单词、短语还是句子。",
          "2. 如果是单词，输出音标、本文义、常用义和一个很短的语境说明。",
          "3. 单词输出中必须把“本文义”放在“常用义”上面。",
          `4. 如果是短语或句子，直接给出准确、自然的${language}翻译。`,
          "5. 翻译必须贴合论文语境，不要扩展解释。",
        ].join("\n"),
      },
    ];
  },

  createSelectionFingerprint(snapshot) {
    return [
      this.normalizeWhitespace(snapshot?.selectedText),
      Number.isInteger(snapshot?.attachmentItemID) ? String(snapshot.attachmentItemID) : "",
      this.normalizeWhitespace(snapshot?.title),
    ].join("\u001f");
  },

  createSafeLogPayload(snapshot) {
    return {
      action: snapshot?.action || "translate",
      charCount: Number.isInteger(snapshot?.charCount) ? snapshot.charCount : 0,
      attachmentItemID: Number.isInteger(snapshot?.attachmentItemID) ? snapshot.attachmentItemID : null,
      parentItemID: Number.isInteger(snapshot?.parentItemID) ? snapshot.parentItemID : null,
      hasTitle: Boolean(this.normalizeString(snapshot?.title)),
      creatorCount: Array.isArray(snapshot?.creators) ? snapshot.creators.length : 0,
      hasDate: Boolean(this.normalizeString(snapshot?.date)),
    };
  },

  normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
  },

  normalizeWhitespace(value) {
    return this.normalizeString(value).replace(/\s+/g, " ");
  },
};
