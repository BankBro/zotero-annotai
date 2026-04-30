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
          "1. 先判断选中文本是单词、短语还是句子，但不要输出判断过程或“类型”。",
          "2. 如果是单词，必须严格使用以下格式：",
          "注音：英 /.../；美 /.../",
          "本文义：<英文词性简写> <结合论文语境的中文义>",
          "常用义：<英文词性简写> <常用中文义；可列多个；不同词性用分号分隔>",
          "语境说明：<一句很短的语境说明>",
          "3. 单词的“本文义”必须放在“常用义”上面；词性用英文词典式简写，例如 n.、adj.、vt.、vi.、adv.，不要把词性放在括号里。",
          "4. 如果是短语，必须严格使用以下格式：",
          "译文：<准确、自然的中文翻译>",
          "语境说明：<一句很短的语境说明>",
          "5. 如果是句子，必须严格使用以下格式：",
          "译文：<准确、自然的中文翻译>",
          "6. 除指定字段外，不要输出编号、Markdown、代码块、额外标题或寒暄。",
          "7. 翻译必须贴合论文语境，不要扩展解释；如果注音或词性无法确定，写“未知”，不要编造。",
          "8. “注音：”“本文义：”“常用义：”“语境说明：”“译文：”每个字段必须各占一行；字段名后直接跟内容，不要把字段内容换到下一行。",
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
