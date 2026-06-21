class PluginIntegration {
    constructor(app, pluginManager) {
        this.app = app;
        this.pluginManager = pluginManager;
        this.componentContainer = null;
        this.exportFormatOptions = new Map();
        this.renderEffectOptions = new Map();
    }

    init() {
        this.setupHostAPI();
        this.setupRenderHooks();
        this.setupExportHooks();
        this.setupInteractiveComponents();
        this.setupPluginEventListeners();
        this.updateUI();
    }

    setupHostAPI() {
        const hostAPI = {
            getCurrentOptions: () => ({ ...this.app.renderer.options }),
            setOptions: (options) => {
                this.app.renderer.setOptions(options);
                this.app.generatePreview();
            },
            getCanvas: () => this.app.canvas,
            getRenderer: () => this.app.renderer,
            getExportManager: () => this.app.exportManager,
            refreshPreview: () => this.app.generatePreview(),
            showToast: (message, type = 'info') => this.showToast(message, type),
            addExportFormat: (format) => this.registerExportFormat(format),
            addRenderEffect: (effect) => this.registerRenderEffect(effect)
        };

        this.pluginManager.setHostAPI(hostAPI);
    }

    setupRenderHooks() {
        const originalRenderPage = this.app.renderer.renderPage.bind(this.app.renderer);
        const self = this;

        this.app.renderer.renderPage = function(pageIndex) {
            const result = originalRenderPage(pageIndex);

            const activeEffects = self.pluginManager.getRenderEffects().filter(e => e.enabled);
            if (activeEffects.length > 0) {
                const renderer = self.app.renderer;
                activeEffects.forEach(effect => {
                    try {
                        const options = effect.instance.getOptions ? effect.instance.getOptions() : {};
                        if (options && typeof options.then === 'function') {
                            options.then(opts => {
                                effect.instance.apply(renderer.ctx, { ...renderer.options, ...opts }, renderer.seed);
                            }).catch(e => {
                                console.error(`渲染效果[${effect.manifest.id}]执行失败:`, e);
                            });
                        } else {
                            effect.instance.apply(renderer.ctx, { ...renderer.options, ...options }, renderer.seed);
                        }
                    } catch (e) {
                        console.error(`渲染效果[${effect.manifest.id}]执行失败:`, e);
                    }
                });
            }

            return result;
        };
    }

    setupExportHooks() {
        const formats = this.pluginManager.getExportFormats();
        formats.forEach(format => {
            this.registerExportFormat(format);
        });
    }

    registerExportFormat(format) {
        this.exportFormatOptions.set(format.manifest.id, {
            id: format.manifest.id,
            name: format.manifest.name,
            icon: format.manifest.icon,
            extension: format.instance.getFileExtension ? format.instance.getFileExtension() : '.bin',
            instance: format.instance,
            manifest: format.manifest
        });

        this.updateExportButton();
    }

    setupInteractiveComponents() {
        this.createComponentContainer();

        const components = this.pluginManager.getInteractiveComponents();
        components.forEach(component => {
            this.mountComponent(component);
        });
    }

    createComponentContainer() {
        const container = document.createElement('div');
        container.id = 'plugin-components-container';
        container.className = 'control-section';
        container.style.display = 'none';
        container.innerHTML = `
            <h3>🧩 插件组件</h3>
            <div id="plugin-components-list"></div>
        `;

        const sidebar = document.querySelector('.sidebar');
        const pageInfoSection = document.querySelector('.sidebar .control-section:last-child');
        sidebar.insertBefore(container, pageInfoSection);

        this.componentContainer = container;
    }

    mountComponent(component) {
        if (!this.componentContainer) this.createComponentContainer();

        const componentWrapper = document.createElement('div');
        componentWrapper.id = `plugin-component-${component.manifest.id}`;
        componentWrapper.className = 'plugin-component-wrapper';
        componentWrapper.style.cssText = `
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 12px;
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px 12px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <span>${component.manifest.icon || '🧩'} ${component.manifest.name}</span>
            <button class="plugin-component-toggle" style="background: none; border: none; cursor: pointer; font-size: 12px; color: #6b7280;">
                收起
            </button>
        `;

        const content = document.createElement('div');
        content.className = 'plugin-component-content';
        content.style.cssText = 'padding: 12px;';

        componentWrapper.appendChild(header);
        componentWrapper.appendChild(content);

        document.getElementById('plugin-components-list').appendChild(componentWrapper);

        header.querySelector('.plugin-component-toggle').addEventListener('click', () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            header.querySelector('.plugin-component-toggle').textContent = isHidden ? '收起' : '展开';
        });

        const hostAPI = this.createComponentHostAPI(component);

        try {
            component.instance.mount(content, hostAPI);
        } catch (e) {
            console.error(`组件[${component.manifest.id}]挂载失败:`, e);
            content.innerHTML = `<div style="color: #b91c1c; font-size: 13px;">组件加载失败</div>`;
        }

        this.componentContainer.style.display = 'block';
    }

    createComponentHostAPI(component) {
        const self = this;
        return {
            getOptions: () => ({ ...this.app.renderer.options }),
            setOptions: (options) => {
                this.app.renderer.setOptions(options);
                this.app.generatePreview();
            },
            applyStyle: async (styleName) => {
                await this.app.eventHandlers.applyStyle(styleName);
            },
            getCanvas: () => this.app.canvas,
            refreshPreview: () => this.app.generatePreview(),
            exportImage: async (format = 'png') => {
                return this.app.renderer.exportPageAsPNG();
            },
            on: (event, callback) => this.pluginManager.on(`${component.manifest.id}:${event}`, callback),
            emit: (event, data) => this.pluginManager.emit(`${component.manifest.id}:${event}`, data),
            showToast: (message, type = 'info') => self.showToast(message, type)
        };
    }

    setupPluginEventListeners() {
        this.pluginManager.on('plugin:enabled', ({ pluginId }) => {
            const plugin = this.pluginManager.getPlugin(pluginId);
            if (plugin) {
                if (plugin.manifest.type === PluginTypes.INTERACTIVE_COMPONENT) {
                    const component = this.pluginManager.interactiveComponents.get(pluginId);
                    if (component) {
                        this.mountComponent(component);
                    }
                } else if (plugin.manifest.type === PluginTypes.EXPORT_FORMAT) {
                    const format = this.pluginManager.exportFormats.get(pluginId);
                    if (format) {
                        this.registerExportFormat(format);
                    }
                }
                this.app.generatePreview();
            }
            this.showToast(`插件已启用`, 'success');
        });

        this.pluginManager.on('plugin:disabled', ({ pluginId }) => {
            this.unmountComponent(pluginId);
            this.exportFormatOptions.delete(pluginId);
            this.updateExportButton();
            this.updateUI();
            this.app.generatePreview();
            this.showToast(`插件已禁用`, 'info');
        });

        this.pluginManager.on('plugin:uninstalled', ({ pluginId }) => {
            this.unmountComponent(pluginId);
            this.exportFormatOptions.delete(pluginId);
            this.updateExportButton();
            this.updateUI();
            this.app.generatePreview();
        });

        this.pluginManager.on('template:apply', (template) => {
            if (template.paperColor) {
                document.querySelectorAll('.color-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.color === template.paperColor);
                });
            }
            if (template.fontSize) {
                const fontSizeInput = document.getElementById('fontSize');
                if (fontSizeInput) {
                    fontSizeInput.value = template.fontSize;
                    document.getElementById('fontSizeValue').textContent = template.fontSize + 'px';
                }
            }
            this.app.eventHandlers.updateOptions();
            this.showToast(`已应用模板: ${template.name}`, 'success');
        });

        this.pluginManager.on('batch:process', (data) => {
            this.app.renderer.setOptions({ text: data.text });
            this.app.generatePreview();
            this.showToast(`正在处理: ${data.filename}`, 'info');
        });
    }

    unmountComponent(pluginId) {
        const element = document.getElementById(`plugin-component-${pluginId}`);
        if (element) {
            const component = this.pluginManager.interactiveComponents.get(pluginId);
            if (component && component.instance && typeof component.instance.unmount === 'function') {
                try {
                    component.instance.unmount();
                } catch (e) {
                    console.error(`组件[${pluginId}]卸载失败:`, e);
                }
            }
            element.remove();
        }

        const list = document.getElementById('plugin-components-list');
        if (list && list.children.length === 0) {
            this.componentContainer.style.display = 'none';
        }
    }

    registerRenderEffect(effect) {
        this.renderEffectOptions.set(effect.manifest.id, {
            id: effect.manifest.id,
            name: effect.manifest.name,
            icon: effect.manifest.icon,
            instance: effect.instance,
            manifest: effect.manifest
        });
        this.updateRenderEffectsUI();
    }

    updateUI() {
        this.updateExportButton();
        this.updateRenderEffectsUI();
    }

    updateExportButton() {
        if (this.exportFormatOptions.size === 0) return;

        const exportSection = document.querySelector('.control-section:has(#exportBtn)');
        if (!exportSection) return;

        let customExportContainer = document.getElementById('plugin-export-container');
        if (!customExportContainer) {
            customExportContainer = document.createElement('div');
            customExportContainer.id = 'plugin-export-container';
            customExportContainer.style.marginTop = '12px';
            exportSection.appendChild(customExportContainer);
        }

        const formats = Array.from(this.exportFormatOptions.values());
        customExportContainer.innerHTML = `
            <h4 style="font-size: 13px; color: #374151; margin: 0 0 8px 0;">插件导出</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                ${formats.map(f => `
                    <button class="btn-secondary" data-export-plugin="${f.id}" 
                            style="padding: 10px 12px; font-size: 13px;">
                        ${f.icon || '💾'} ${f.name}
                    </button>
                `).join('')}
            </div>
        `;

        customExportContainer.querySelectorAll('[data-export-plugin]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const formatId = btn.dataset.exportPlugin;
                await this.exportWithPlugin(formatId);
            });
        });
    }

    async exportWithPlugin(formatId) {
        const format = this.exportFormatOptions.get(formatId);
        if (!format) return;

        try {
            const progressModal = this.app.exportManager.showProgressModal(`正在导出${format.name}...`);

            const canvases = this.app.renderer.generateAllPages();
            const options = format.instance.getOptions ? await format.instance.getOptions() : {};

            const result = await format.instance.export(canvases, options);

            if (result && result.pages) {
                result.pages.forEach((page, index) => {
                    this.app.exportManager.downloadImage(
                        page.imageData || page,
                        `handwriting_${index + 1}${format.extension}`
                    );
                });
            } else if (result && result.imageData) {
                this.app.exportManager.downloadImage(result.imageData, `handwriting${format.extension}`);
            }

            this.app.exportManager.hideProgressModal();
            this.showToast(`导出成功`, 'success');
        } catch (error) {
            console.error('插件导出失败:', error);
            this.app.exportManager.hideProgressModal();
            this.showToast(`导出失败: ${error.message}`, 'error');
        }
    }

    updateRenderEffectsUI() {
        if (this.renderEffectOptions.size === 0) return;

        const effectsSection = document.querySelector('.control-section:has(.style-selector)');
        if (!effectsSection) return;

        let effectsContainer = document.getElementById('plugin-render-effects-container');
        if (!effectsContainer) {
            effectsContainer = document.createElement('div');
            effectsContainer.id = 'plugin-render-effects-container';
            effectsContainer.style.marginTop = '12px';
            effectsContainer.innerHTML = `
                <h4 style="font-size: 13px; color: #374151; margin: 0 0 8px 0;">插件效果</h4>
                <div id="plugin-effects-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
            `;
            effectsSection.appendChild(effectsContainer);
        }

        const effectsList = document.getElementById('plugin-effects-list');
        const effects = Array.from(this.renderEffectOptions.values());

        effectsList.innerHTML = effects.map(effect => `
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f9fafb; border-radius: 6px; cursor: pointer;">
                <input type="checkbox" data-effect-id="${effect.id}" checked 
                       style="width: 16px; height: 16px; accent-color: #667eea;">
                <span>${effect.icon || '✨'} ${effect.name}</span>
            </label>
        `).join('');

        effectsList.querySelectorAll('[data-effect-id]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const effectId = e.target.dataset.effectId;
                const effect = this.pluginManager.renderEffects.get(effectId);
                if (effect) {
                    effect.enabled = e.target.checked;
                    this.app.generatePreview();
                }
            });
        });
    }

    showToast(message, type = 'info') {
        const existing = document.querySelector('.plugin-toast');
        if (existing) existing.remove();

        const colors = {
            success: '#059669',
            error: '#dc2626',
            info: '#2563eb',
            warning: '#d97706'
        };

        const toast = document.createElement('div');
        toast.className = 'plugin-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: ${colors[type] || colors.info};
            color: white;
            border-radius: 8px;
            font-size: 14px;
            z-index: 20000;
            animation: slideUp 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    createPluginMenuButton() {
        const button = document.createElement('button');
        button.id = 'plugin-menu-btn';
        button.className = 'btn-secondary';
        button.innerHTML = '🧩 插件中心';
        button.style.width = '100%';
        button.style.marginTop = '12px';

        const controlSection = document.querySelector('.control-section:has(#generateBtn)');
        if (controlSection) {
            controlSection.appendChild(button);
        }

        return button;
    }
}

if (typeof window !== 'undefined') {
    window.PluginIntegration = PluginIntegration;
}
