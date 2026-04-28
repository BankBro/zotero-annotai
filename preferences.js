var ZoteroAnnotAIPreferences = {
  initialized: false,
  testController: null,

  init() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    const settings = this.lookup("ZoteroAnnotAISettings");
    const runner = this.lookup("ZoteroAnnotAIRequestRunner");
    const client = this.lookup("ZoteroAnnotAIOpenAICompatibleClient");
    const errors = this.lookup("ZoteroAnnotAIProviderErrors");
    const log = (message) => Zotero.debug(`[Zotero AnnotAI] ${message}`);

    settings?.init?.({ log });
    runner?.init?.({ settings, client, errors, log });

    this.bindEvents();
    this.loadProvider();
  },

  lookup(name) {
    return window.Zotero_Preferences?.[name] || window[name] || null;
  },

  bindEvents() {
    this.getElement("provider-save")?.addEventListener("click", () => this.saveProvider());
    this.getElement("provider-test")?.addEventListener("click", () => this.testProvider());
    this.getElement("provider-cancel")?.addEventListener("click", () => this.cancelTest());
  },

  loadProvider() {
    const settings = this.lookup("ZoteroAnnotAISettings");
    if (!settings) {
      this.showStatus("Provider 设置模块不可用", "error");
      return;
    }

    const provider = settings.getActiveProvider();
    this.setValue("provider-name", provider.name);
    this.setValue("provider-base-url", provider.baseURL);
    this.setValue("provider-model", provider.model);
    this.setValue("provider-api-key", provider.apiKey);
    this.setValue("provider-timeout", String(provider.timeoutMs));
    this.setChecked("provider-streaming", provider.enableStreaming);
    this.showStatus(provider.lastTestStatus || "Provider 尚未连接测试", "");
  },

  saveProvider() {
    const settings = this.lookup("ZoteroAnnotAISettings");
    const errors = this.lookup("ZoteroAnnotAIProviderErrors");

    try {
      const provider = settings.saveActiveProvider(this.readProviderForm());
      settings.setLastTestStatus("配置已保存，尚未重新连接测试");
      this.showStatus(`配置已保存：${provider.name}`, "ok");
      return provider;
    }
    catch (error) {
      this.showStatus(errors?.toUserMessage?.(error) || error.message, "error");
      throw error;
    }
  },

  async testProvider() {
    const runner = this.lookup("ZoteroAnnotAIRequestRunner");
    const errors = this.lookup("ZoteroAnnotAIProviderErrors");

    if (!runner) {
      this.showStatus("Provider 请求模块不可用", "error");
      return;
    }

    try {
      this.saveProvider();
    }
    catch {
      return;
    }

    this.testController = new AbortController();
    this.setTesting(true);
    this.showStatus("正在连接测试...", "pending");

    try {
      const result = await runner.testActiveProvider({ signal: this.testController.signal });
      this.showStatus(result.status, "ok");
    }
    catch (error) {
      this.showStatus(errors?.toUserMessage?.(error) || error.message, "error");
    }
    finally {
      this.testController = null;
      this.setTesting(false);
    }
  },

  cancelTest() {
    this.testController?.abort();
  },

  readProviderForm() {
    const timeoutMs = Number.parseInt(this.getValue("provider-timeout"), 10);
    return {
      type: "openai-compatible",
      name: this.getValue("provider-name"),
      baseURL: this.getValue("provider-base-url"),
      model: this.getValue("provider-model"),
      apiKey: this.getValue("provider-api-key"),
      timeoutMs,
      enableStreaming: this.getChecked("provider-streaming"),
    };
  },

  setTesting(isTesting) {
    this.setDisabled("provider-save", isTesting);
    this.setDisabled("provider-test", isTesting);
    this.setDisabled("provider-cancel", !isTesting);
  },

  showStatus(message, state) {
    const node = this.getElement("provider-status");
    if (!node) {
      return;
    }
    node.textContent = message || "";
    if (state) {
      node.dataset.state = state;
    }
    else {
      delete node.dataset.state;
    }
  },

  getElement(id) {
    return document.getElementById(`zotero-annotai-${id}`);
  },

  getValue(id) {
    return this.getElement(id)?.value || "";
  },

  setValue(id, value) {
    const element = this.getElement(id);
    if (element) {
      element.value = value || "";
    }
  },

  getChecked(id) {
    return Boolean(this.getElement(id)?.checked);
  },

  setChecked(id, checked) {
    const element = this.getElement(id);
    if (element) {
      element.checked = Boolean(checked);
    }
  },

  setDisabled(id, disabled) {
    const element = this.getElement(id);
    if (element) {
      element.disabled = Boolean(disabled);
    }
  },
};
