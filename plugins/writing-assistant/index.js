class WritingAssistant {
    constructor(api) {
        this.api = api;
        this.defaultOptions = {
            showCharCount: true,
            showWordCount: true,
            showPageEstimate: true,
            autoSave: true
        };
        this.hostAPI = null;
        this.container = null;
        this.textInput = null;
        this.unsubscribe = null;
        this.templates = [
            { name: '静夜思', text: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。' },
            { name: '春晓', text: '春眠不觉晓，处处闻啼鸟。\n夜来风雨声，花落知多少。' },
            { name: '登鹳雀楼', text: '白日依山尽，黄河入海流。\n欲穷千里目，更上一层楼。' },
            { name: '相思', text: '红豆生南国，春来发几枝。\n愿君多采撷，此物最相思。' },
            { name: '江雪', text: '千山鸟飞绝，万径人踪灭。\n孤舟蓑笠翁，独钓寒江雪。' }
        ];
        this.quickStyles = [
            { name: '楷书情书', style: 'kaishu', fontSize: 28, lineHeight: 2.0 },
            { name: '行书笔记', style: 'xingshu', fontSize: 32, lineHeight: 1.8 },
            { name: '草书题词', style: 'caoshu', fontSize: 40, lineHeight: 1.6 },
            { name: '瘦金体', style: 'shoujie', fontSize: 30, lineHeight: 1.9 }
        ];
    }

    mount(container, hostAPI) {
        this.container = container;
        this.hostAPI = hostAPI;
        this.textInput = document.getElementById('textInput');

        this.render();
        this.bindEvents();
        this.startAutoSave();

        this.api.log('写作助手组件已挂载');
        this.api.emit('assistant:mounted', { timestamp: Date.now() });
    }

    render() {
        const config = this.api.getConfig();
        const opts = { ...this.defaultOptions, ...config };

        this.container.innerHTML = `
            <div id="writing-assistant-root">
                <style>
                    .wa-stats {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 8px;
                        margin-bottom: 16px;
                    }
                    .wa-stat-item {
                        background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
                        padding: 10px;
                        border-radius: 8px;
                        text-align: center;
                    }
                    .wa-stat-value {
                        font-size: 18px;
                        font-weight: 600;
                        color: #667eea;
                    }
                    .wa-stat-label {
                        font-size: 11px;
                        color: #6b7280;
                        margin-top: 2px;
                    }
                    .wa-section {
                        margin-bottom: 16px;
                    }
                    .wa-section-title {
                        font-size: 13px;
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .wa-templates {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                    }
                    .wa-template-btn {
                        padding: 6px 12px;
                        background: #f3f4f6;
                        border: 1px solid #e5e7eb;
                        border-radius: 16px;
                        font-size: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .wa-template-btn:hover {
                        background: #667eea;
                        color: white;
                        border-color: #667eea;
                    }
                    .wa-styles {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 8px;
                    }
                    .wa-style-btn {
                        padding: 10px;
                        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                        border: 1px solid #bae6fd;
                        border-radius: 8px;
                        font-size: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-align: left;
                    }
                    .wa-style-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
                    }
                    .wa-style-name {
                        font-weight: 600;
                        color: #0369a1;
                        margin-bottom: 2px;
                    }
                    .wa-style-desc {
                        font-size: 11px;
                        color: #64748b;
                    }
                    .wa-settings {
                        padding: 10px;
                        background: #f9fafb;
                        border-radius: 8px;
                    }
                    .wa-setting-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 6px 0;
                        font-size: 12px;
                        color: #374151;
                    }
                    .wa-setting-item input[type="checkbox"] {
                        width: 16px;
                        height: 16px;
                        accent-color: #667eea;
                    }
                </style>

                <div class="wa-section">
                    <div class="wa-section-title">📊 写作统计</div>
                    <div class="wa-stats">
                        ${opts.showCharCount ? `
                        <div class="wa-stat-item">
                            <div class="wa-stat-value" id="wa-char-count">0</div>
                            <div class="wa-stat-label">字符数</div>
                        </div>
                        ` : ''}
                        ${opts.showWordCount ? `
                        <div class="wa-stat-item">
                            <div class="wa-stat-value" id="wa-word-count">0</div>
                            <div class="wa-stat-label">字数</div>
                        </div>
                        ` : ''}
                        ${opts.showPageEstimate ? `
                        <div class="wa-stat-item">
                            <div class="wa-stat-value" id="wa-page-estimate">0</div>
                            <div class="wa-stat-label">约几页</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="wa-section">
                    <div class="wa-section-title">🎨 快捷样式</div>
                    <div class="wa-styles">
                        ${this.quickStyles.map((s, i) => `
                            <button class="wa-style-btn" data-style-index="${i}">
                                <div class="wa-style-name">${s.name}</div>
                                <div class="wa-style-desc">${s.fontSize}px · ${s.lineHeight}倍行高</div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="wa-section">
                    <div class="wa-section-title">📝 诗文模板</div>
                    <div class="wa-templates">
                        ${this.templates.map((t, i) => `
                            <button class="wa-template-btn" data-template-index="${i}">${t.name}</button>
                        `).join('')}
                    </div>
                </div>

                <div class="wa-section">
                    <div class="wa-section-title">⚙️ 设置</div>
                    <div class="wa-settings">
                        <div class="wa-setting-item">
                            <span>显示字符数</span>
                            <input type="checkbox" id="wa-setting-char" ${opts.showCharCount ? 'checked' : ''}>
                        </div>
                        <div class="wa-setting-item">
                            <span>显示字数</span>
                            <input type="checkbox" id="wa-setting-word" ${opts.showWordCount ? 'checked' : ''}>
                        </div>
                        <div class="wa-setting-item">
                            <span>显示页数预估</span>
                            <input type="checkbox" id="wa-setting-page" ${opts.showPageEstimate ? 'checked' : ''}>
                        </div>
                        <div class="wa-setting-item">
                            <span>自动保存草稿</span>
                            <input type="checkbox" id="wa-setting-autosave" ${opts.autoSave ? 'checked' : ''}>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.updateStats();
    }

    bindEvents() {
        if (this.textInput) {
            this.textInput.addEventListener('input', () => this.updateStats());
        }

        this.container.querySelectorAll('.wa-template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.templateIndex);
                const template = this.templates[index];
                if (template && this.textInput) {
                    this.textInput.value = template.text;
                    this.textInput.dispatchEvent(new Event('input'));
                    this.hostAPI.refreshPreview();
                    this.api.log(`已应用模板: ${template.name}`);
                }
            });
        });

        this.container.querySelectorAll('.wa-style-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.dataset.styleIndex);
                const style = this.quickStyles[index];
                if (style && this.hostAPI) {
                    await this.hostAPI.applyStyle(style.style);

                    const fontSizeInput = document.getElementById('fontSize');
                    const lineHeightInput = document.getElementById('lineHeight');
                    if (fontSizeInput) {
                        fontSizeInput.value = style.fontSize;
                        document.getElementById('fontSizeValue').textContent = style.fontSize + 'px';
                    }
                    if (lineHeightInput) {
                        lineHeightInput.value = style.lineHeight;
                        document.getElementById('lineHeightValue').textContent = style.lineHeight;
                    }

                    this.hostAPI.refreshPreview();
                    this.api.log(`已切换样式: ${style.name}`);
                }
            });
        });

        this.container.querySelector('#wa-setting-char')?.addEventListener('change', (e) => {
            this.updateSetting('showCharCount', e.target.checked);
        });
        this.container.querySelector('#wa-setting-word')?.addEventListener('change', (e) => {
            this.updateSetting('showWordCount', e.target.checked);
        });
        this.container.querySelector('#wa-setting-page')?.addEventListener('change', (e) => {
            this.updateSetting('showPageEstimate', e.target.checked);
        });
        this.container.querySelector('#wa-setting-autosave')?.addEventListener('change', (e) => {
            this.updateSetting('autoSave', e.target.checked);
        });
    }

    updateStats() {
        if (!this.textInput) return;

        const text = this.textInput.value;
        const charCount = text.length;
        const wordCount = text.replace(/\s+/g, '').length;
        const charsPerPage = 500;
        const pageEstimate = Math.max(1, Math.ceil(wordCount / charsPerPage));

        const charEl = this.container.querySelector('#wa-char-count');
        const wordEl = this.container.querySelector('#wa-word-count');
        const pageEl = this.container.querySelector('#wa-page-estimate');

        if (charEl) charEl.textContent = charCount.toLocaleString();
        if (wordEl) wordEl.textContent = wordCount.toLocaleString();
        if (pageEl) pageEl.textContent = pageEstimate;
    }

    updateSetting(key, value) {
        const config = this.api.getConfig() || {};
        config[key] = value;
        this.api.setConfig(config);
        this.render();
        this.bindEvents();
    }

    startAutoSave() {
        if (this.unsubscribe) return;

        this.unsubscribe = this.api.on('assistant:autosave', () => {
            if (this.textInput) {
                this.api.setData('draft', {
                    text: this.textInput.value,
                    savedAt: Date.now()
                });
            }
        });

        setInterval(() => {
            const config = this.api.getConfig() || {};
            if (config.autoSave !== false && this.textInput) {
                this.api.setData('draft', {
                    text: this.textInput.value,
                    savedAt: Date.now()
                });
            }
        }, 30000);

        const savedDraft = this.api.getData('draft');
        if (savedDraft && savedDraft.text && this.textInput && this.textInput.value === '') {
            if (confirm('检测到上次未保存的草稿，是否恢复？')) {
                this.textInput.value = savedDraft.text;
                this.textInput.dispatchEvent(new Event('input'));
                this.hostAPI?.refreshPreview();
            }
        }
    }

    unmount() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.api.log('写作助手组件已卸载');
    }

    getOptions() {
        return this.api.getConfig() || this.defaultOptions;
    }

    getDefaultOptions() {
        return this.defaultOptions;
    }

    onEnable() {
        this.api.log('写作助手插件已启用');
    }

    onDisable() {
        this.api.log('写作助手插件已禁用');
    }
}

module.exports = WritingAssistant;
