var ZoteroAnnotAIExplanationTask = {
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
          "你是学术论文阅读助手。请解释用户选中的文本在当前论文中的含义。",
          `默认输出语言是${language}。`,
          "不要输出与解释无关的寒暄。",
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
          "1. 解释这段文本在当前论文语境中的意思，必须贴合论文标题和选中文本。",
          "2. 如果涉及术语、方法、变量、结论、实验设置或隐含假设，请在补充说明中指出。",
          "3. 不要泛泛科普，不要扩展到选中文本之外的无关内容。",
          "4. 当前版本只提供轻量上下文；如果上下文不足，请在补充说明中明确说明不足之处，不要编造论文细节。",
          "5. 必须严格使用以下两行格式：",
          "核心意思：<一句或两句解释选中文本的核心含义>",
          "补充说明：<必要的术语、方法、变量、结论、实验设置、隐含假设或上下文不足说明>",
          "6. 除指定字段外，不要输出编号、Markdown、代码块、额外标题或寒暄。",
          "7. “核心意思：”“补充说明：”每个字段必须各占一行；字段名后直接跟内容，不要把字段内容换到下一行。",
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
      action: snapshot?.action || "explain",
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
