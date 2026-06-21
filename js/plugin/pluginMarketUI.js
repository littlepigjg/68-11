class PluginMarketUI {
    constructor(pluginManager) {
        this.pluginManager = pluginManager;
        this.container = null;
        this.modal = null;
        this.currentTab = 'market';
        this.marketPlugins = [];
        this.isOpen = false;
    }

    init() {
        this.injectStyles();
        this.pluginManager.on('plugin:registered', () => this.renderInstalled());
        this.pluginManager.on('plugin:enabled', () => this.renderInstalled());
        this.pluginManager.on('plugin:disabled', () => this.renderInstalled());
        this.pluginManager.on('plugin:uninstalled', () => this.renderInstalled());
    }

    injectStyles() {
        if (document.getElementById('plugin-market-styles')) return;

        const style = document.createElement('style');
        style.id = 'plugin-market-styles';
        style.textContent = `
            .plugin-market-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .plugin-market-container {
                background: white;
                border-radius: 16px;
                width: 90%;
                max-width: 1000px;
                height: 80vh;
                max-height: 700px;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                overflow: hidden;
            }
            
            .plugin-market-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-bottom: 1px solid #e5e7eb;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .plugin-market-header h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .plugin-market-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            
            .plugin-market-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .plugin-market-tabs {
                display: flex;
                border-bottom: 1px solid #e5e7eb;
                background: #f9fafb;
            }
            
            .plugin-market-tab {
                padding: 14px 24px;
                cursor: pointer;
                border: none;
                background: none;
                font-size: 14px;
                font-weight: 500;
                color: #6b7280;
                transition: all 0.2s;
                border-bottom: 2px solid transparent;
            }
            
            .plugin-market-tab:hover {
                color: #374151;
            }
            
            .plugin-market-tab.active {
                color: #667eea;
                border-bottom-color: #667eea;
                background: white;
            }
            
            .plugin-market-body {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .plugin-market-toolbar {
                display: flex;
                gap: 12px;
                padding: 16px 24px;
                border-bottom: 1px solid #e5e7eb;
                background: white;
            }
            
            .plugin-market-search {
                flex: 1;
                position: relative;
            }
            
            .plugin-market-search input {
                width: 100%;
                padding: 10px 16px 10px 40px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s;
            }
            
            .plugin-market-search input:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .plugin-market-search::before {
                content: '🔍';
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 16px;
            }
            
            .plugin-market-filter {
                padding: 10px 16px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 14px;
                background: white;
                cursor: pointer;
                outline: none;
            }
            
            .plugin-market-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px 24px;
            }
            
            .plugin-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
            }
            
            .plugin-card {
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 16px;
                background: white;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
            }
            
            .plugin-card:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                transform: translateY(-2px);
            }
            
            .plugin-card-header {
                display: flex;
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .plugin-icon {
                width: 48px;
                height: 48px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                flex-shrink: 0;
            }
            
            .plugin-icon.render_effect {
                background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
            }
            
            .plugin-icon.export_format {
                background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
            }
            
            .plugin-icon.interactive_component {
                background: linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%);
            }
            
            .plugin-card-info {
                flex: 1;
                min-width: 0;
            }
            
            .plugin-card-name {
                font-size: 15px;
                font-weight: 600;
                color: #111827;
                margin-bottom: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .plugin-card-version {
                font-size: 12px;
                color: #6b7280;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .plugin-type-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
            }
            
            .plugin-type-badge.render_effect {
                background: #fef3c7;
                color: #92400e;
            }
            
            .plugin-type-badge.export_format {
                background: #dbeafe;
                color: #1e40af;
            }
            
            .plugin-type-badge.interactive_component {
                background: #d1fae5;
                color: #065f46;
            }
            
            .plugin-card-description {
                font-size: 13px;
                color: #4b5563;
                line-height: 1.5;
                margin-bottom: 12px;
                flex: 1;
            }
            
            .plugin-card-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: #6b7280;
                margin-bottom: 12px;
            }
            
            .plugin-card-author {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .plugin-card-actions {
                display: flex;
                gap: 8px;
            }
            
            .plugin-btn {
                flex: 1;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            
            .plugin-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .plugin-btn-primary:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }
            
            .plugin-btn-secondary {
                background: #f3f4f6;
                color: #374151;
            }
            
            .plugin-btn-secondary:hover {
                background: #e5e7eb;
            }
            
            .plugin-btn-danger {
                background: #fee2e2;
                color: #b91c1c;
            }
            
            .plugin-btn-danger:hover {
                background: #fecaca;
            }
            
            .plugin-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .plugin-status-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 500;
            }
            
            .plugin-status-badge.active {
                background: #d1fae5;
                color: #065f46;
            }
            
            .plugin-status-badge.disabled {
                background: #f3f4f6;
                color: #6b7280;
            }
            
            .plugin-status-badge.error {
                background: #fee2e2;
                color: #b91c1c;
            }
            
            .plugin-status-badge.incompatible {
                background: #fed7aa;
                color: #c2410c;
            }
            
            .plugin-empty {
                text-align: center;
                padding: 60px 20px;
                color: #6b7280;
            }
            
            .plugin-empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .plugin-detail-modal {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10;
            }
            
            .plugin-detail-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 80%;
                overflow-y: auto;
                padding: 24px;
            }
            
            .plugin-detail-header {
                display: flex;
                gap: 16px;
                margin-bottom: 20px;
            }
            
            .plugin-detail-icon {
                width: 64px;
                height: 64px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
            }
            
            .plugin-detail-info h3 {
                margin: 0 0 4px 0;
                font-size: 18px;
            }
            
            .plugin-detail-version {
                color: #6b7280;
                font-size: 13px;
            }
            
            .plugin-detail-section {
                margin-bottom: 20px;
            }
            
            .plugin-detail-section h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #374151;
            }
            
            .plugin-detail-section p {
                margin: 0;
                font-size: 13px;
                color: #4b5563;
                line-height: 1.6;
            }
            
            .plugin-permissions {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            
            .permission-tag {
                padding: 4px 10px;
                background: #f3f4f6;
                border-radius: 12px;
                font-size: 12px;
                color: #374151;
            }
            
            .plugin-compatibility {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 16px;
            }
            
            .plugin-compatibility.compatible {
                background: #d1fae5;
                color: #065f46;
            }
            
            .plugin-compatibility.incompatible {
                background: #fee2e2;
                color: #b91c1c;
            }
            
            .plugin-detail-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .plugin-install-progress {
                width: 100%;
                height: 4px;
                background: #e5e7eb;
                border-radius: 2px;
                overflow: hidden;
                margin-top: 8px;
            }
            
            .plugin-install-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #667eea, #764ba2);
                transition: width 0.3s;
            }
            
            .plugin-file-upload {
                border: 2px dashed #d1d5db;
                border-radius: 8px;
                padding: 40px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .plugin-file-upload:hover {
                border-color: #667eea;
                background: #f5f3ff;
            }
            
            .plugin-file-upload-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }
            
            .plugin-toast {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                z-index: 20000;
                animation: slideUp 0.3s ease;
            }
            
            .plugin-toast.success {
                background: #059669;
            }
            
            .plugin-toast.error {
                background: #dc2626;
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.render();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }

    render() {
        this.modal = document.createElement('div');
        this.modal.className = 'plugin-market-modal';
        this.modal.innerHTML = `
            <div class="plugin-market-container">
                <div class="plugin-market-header">
                    <h2>🧩 插件市场</h2>
                    <button class="plugin-market-close" id="plugin-market-close">×</button>
                </div>
                <div class="plugin-market-tabs">
                    <button class="plugin-market-tab active" data-tab="market">插件市场</button>
                    <button class="plugin-market-tab" data-tab="installed">已安装</button>
                    <button class="plugin-market-tab" data-tab="upload">安装插件</button>
                </div>
                <div class="plugin-market-body">
                    <div class="plugin-market-toolbar">
                        <div class="plugin-market-search">
                            <input type="text" id="plugin-search" placeholder="搜索插件...">
                        </div>
                        <select class="plugin-market-filter" id="plugin-type-filter">
                            <option value="all">全部类型</option>
                            <option value="render_effect">渲染效果</option>
                            <option value="export_format">导出格式</option>
                            <option value="interactive_component">交互组件</option>
                        </select>
                    </div>
                    <div class="plugin-market-content" id="plugin-market-content">
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.bindEvents();
        this.loadMarketPlugins();
        this.renderContent();
    }

    bindEvents() {
        this.modal.querySelector('#plugin-market-close').addEventListener('click', () => this.close());

        this.modal.querySelectorAll('.plugin-market-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.modal.querySelectorAll('.plugin-market-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.renderContent();
            });
        });

        this.modal.querySelector('#plugin-search').addEventListener('input', () => this.renderContent());
        this.modal.querySelector('#plugin-type-filter').addEventListener('change', () => this.renderContent());

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal.querySelector('.plugin-market-container')) {
                this.close();
            }
        });
    }

    async loadMarketPlugins() {
        this.marketPlugins = [
            {
                manifest: {
                    id: 'watermark-effect',
                    name: '水印效果',
                    version: '1.0.0',
                    type: 'render_effect',
                    description: '为生成的图片添加自定义水印文字，支持位置、大小、透明度调节。',
                    author: { name: '官方插件' },
                    hostVersion: '>=1.0.0',
                    icon: '💧',
                    permissions: ['canvas_access'],
                    keywords: ['watermark', '水印', 'brand']
                },
                code: this.getSamplePluginCode('watermark')
            },
            {
                manifest: {
                    id: 'pdf-export',
                    name: 'PDF导出',
                    version: '1.1.0',
                    type: 'export_format',
                    description: '将手写内容导出为高质量PDF文档，支持多页合并和自定义纸张大小。',
                    author: { name: '官方插件' },
                    hostVersion: '>=1.0.0',
                    icon: '📄',
                    permissions: ['storage'],
                    keywords: ['pdf', 'export', '文档']
                },
                code: this.getSamplePluginCode('pdf')
            },
            {
                manifest: {
                    id: 'template-library',
                    name: '模板库',
                    version: '1.0.0',
                    type: 'interactive_component',
                    description: '提供丰富的手写模板，包括信纸、贺卡、字帖等多种预设样式。',
                    author: { name: '官方插件' },
                    hostVersion: '>=1.0.0',
                    icon: '📚',
                    permissions: ['storage', 'dom_access'],
                    keywords: ['template', '模板', '信纸']
                },
                code: this.getSamplePluginCode('template')
            },
            {
                manifest: {
                    id: 'vintage-filter',
                    name: '复古滤镜',
                    version: '1.0.0',
                    type: 'render_effect',
                    description: '添加复古怀旧风格滤镜，模拟老照片、泛黄纸张等效果。',
                    author: { name: '创意工作室' },
                    hostVersion: '>=1.0.0',
                    icon: '📷',
                    permissions: ['canvas_access'],
                    keywords: ['vintage', '复古', '滤镜']
                },
                code: this.getSamplePluginCode('vintage')
            },
            {
                manifest: {
                    id: 'gif-export',
                    name: 'GIF动图导出',
                    version: '1.0.0',
                    type: 'export_format',
                    description: '将文字书写过程导出为GIF动画，展示逐字书写效果。',
                    author: { name: '官方插件' },
                    hostVersion: '>=1.0.0 <2.0.0',
                    icon: '🎬',
                    permissions: ['storage', 'canvas_access'],
                    keywords: ['gif', 'animation', '动画']
                },
                code: this.getSamplePluginCode('gif')
            },
            {
                manifest: {
                    id: 'batch-processor',
                    name: '批量处理工具',
                    version: '1.2.0',
                    type: 'interactive_component',
                    description: '批量处理多个文本文件，自动生成手写图片，支持自定义命名规则。',
                    author: { name: '效率工具' },
                    hostVersion: '>=1.0.0',
                    icon: '⚡',
                    permissions: ['storage', 'dom_access'],
                    keywords: ['batch', '批量', '效率']
                },
                code: this.getSamplePluginCode('batch')
            }
        ];
    }

    getSamplePluginCode(type) {
        const codes = {
            watermark: `
class WatermarkEffect {
    constructor(api) {
        this.api = api;
        this.options = {
            text: '水印文字',
            fontSize: 48,
            opacity: 0.3,
            position: 'bottom-right',
            rotation: -30
        };
    }
    
    async apply(ctx, renderOptions, seed) {
        const canvas = ctx.canvas;
        const config = this.api.getConfig();
        const opts = { ...this.options, ...config };
        
        ctx.save();
        ctx.globalAlpha = opts.opacity;
        ctx.font = opts.fontSize + 'px sans-serif';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const positions = {
            'top-left': { x: canvas.width * 0.2, y: canvas.height * 0.2 },
            'top-right': { x: canvas.width * 0.8, y: canvas.height * 0.2 },
            'center': { x: canvas.width * 0.5, y: canvas.height * 0.5 },
            'bottom-left': { x: canvas.width * 0.2, y: canvas.height * 0.8 },
            'bottom-right': { x: canvas.width * 0.8, y: canvas.height * 0.8 }
        };
        
        const pos = positions[opts.position] || positions['bottom-right'];
        
        ctx.translate(pos.x, pos.y);
        ctx.rotate(opts.rotation * Math.PI / 180);
        ctx.fillText(opts.text, 0, 0);
        ctx.restore();
    }
    
    getOptions() {
        return this.api.getConfig() || this.options;
    }
    
    getDefaultOptions() {
        return this.options;
    }
}
module.exports = WatermarkEffect;`,

            pdf: `
class PDFExport {
    constructor(api) {
        this.api = api;
        this.options = {
            pageSize: 'A4',
            quality: 0.95,
            compress: true
        };
    }
    
    async export(canvases, options) {
        this.api.log('开始导出PDF...');
        
        const pages = [];
        for (const canvas of canvases) {
            const dataUrl = canvas.toDataURL('image/jpeg', this.options.quality);
            pages.push(dataUrl);
        }
        
        const result = {
            type: 'pdf',
            pages: pages,
            pageSize: this.options.pageSize,
            count: pages.length
        };
        
        this.api.setData('last_export', {
            time: Date.now(),
            count: pages.length
        });
        
        return result;
    }
    
    getOptions() {
        return this.api.getConfig() || this.options;
    }
    
    getDefaultOptions() {
        return this.options;
    }
    
    getFileExtension() {
        return '.pdf';
    }
}
module.exports = PDFExport;`,

            template: `
class TemplateLibrary {
    constructor(api) {
        this.api = api;
        this.templates = [
            { id: 'letter', name: '信纸', icon: '📝', paperColor: '#faf8f0', fontSize: 32 },
            { id: 'card', name: '贺卡', icon: '💌', paperColor: '#fff5f5', fontSize: 28 },
            { id: 'practice', name: '字帖', icon: '📖', paperColor: '#ffffff', fontSize: 40 }
        ];
    }
    
    mount(container, hostAPI) {
        container.innerHTML = \`
            <div style="padding: 16px;">
                <h3 style="margin: 0 0 16px 0;">选择模板</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                    \${this.templates.map(t => \`
                        <div data-template="\${t.id}" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; text-align: center;">
                            <div style="font-size: 32px; margin-bottom: 8px;">\${t.icon}</div>
                            <div style="font-size: 14px; font-weight: 500;">\${t.name}</div>
                        </div>
                    \`).join('')}
                </div>
            </div>
        \`;
        
        container.querySelectorAll('[data-template]').forEach(el => {
            el.addEventListener('click', () => {
                const templateId = el.dataset.template;
                const template = this.templates.find(t => t.id === templateId);
                if (template && hostAPI) {
                    this.api.log('应用模板:', template.name);
                    this.api.emit('template:apply', template);
                }
            });
        });
    }
    
    unmount() {
        this.api.log('模板库组件卸载');
    }
    
    getOptions() {
        return this.api.getConfig() || {};
    }
    
    getDefaultOptions() {
        return {};
    }
}
module.exports = TemplateLibrary;`,

            vintage: `
class VintageFilter {
    constructor(api) {
        this.api = api;
        this.options = {
            intensity: 0.6,
            sepia: 0.3,
            vignette: 0.4
        };
    }
    
    async apply(ctx, renderOptions, seed) {
        const canvas = ctx.canvas;
        const config = this.api.getConfig();
        const opts = { ...this.options, ...config };
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const tr = 0.393 * r + 0.769 * g + 0.189 * b;
            const tg = 0.349 * r + 0.686 * g + 0.168 * b;
            const tb = 0.272 * r + 0.534 * g + 0.131 * b;
            
            data[i] = r * (1 - opts.sepia) + tr * opts.sepia;
            data[i + 1] = g * (1 - opts.sepia) + tg * opts.sepia;
            data[i + 2] = b * (1 - opts.sepia) + tb * opts.sepia;
            
            data[i] *= (1 - opts.intensity * 0.2);
            data[i + 1] *= (1 - opts.intensity * 0.2);
            data[i + 2] *= (1 - opts.intensity * 0.2);
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        if (opts.vignette > 0) {
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.7
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, \`rgba(0, 0, 0, \${opts.vignette * 0.5})\`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    getOptions() {
        return this.api.getConfig() || this.options;
    }
    
    getDefaultOptions() {
        return this.options;
    }
}
module.exports = VintageFilter;`,

            gif: `
class GIFExport {
    constructor(api) {
        this.api = api;
        this.options = {
            delay: 100,
            repeat: 0,
            quality: 10
        };
    }
    
    async export(canvases, options) {
        this.api.log('开始导出GIF动画...');
        
        const frames = [];
        for (let i = 0; i < canvases.length; i++) {
            const dataUrl = canvases[i].toDataURL('image/png');
            frames.push({
                delay: this.options.delay,
                image: dataUrl
            });
        }
        
        const result = {
            type: 'gif',
            frames: frames,
            repeat: this.options.repeat,
            frameCount: frames.length
        };
        
        return result;
    }
    
    getOptions() {
        return this.api.getConfig() || this.options;
    }
    
    getDefaultOptions() {
        return this.options;
    }
    
    getFileExtension() {
        return '.gif';
    }
}
module.exports = GIFExport;`,

            batch: `
class BatchProcessor {
    constructor(api) {
        this.api = api;
        this.options = {
            namingPattern: 'page_{index}',
            concurrent: 3
        };
    }
    
    mount(container, hostAPI) {
        container.innerHTML = \`
            <div style="padding: 16px;">
                <h3 style="margin: 0 0 16px 0;">批量处理</h3>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px;">命名规则</label>
                    <input type="text" id="batch-naming" value="page_{index}" 
                           style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px;">上传文本文件</label>
                    <input type="file" id="batch-files" accept=".txt" multiple
                           style="width: 100%; padding: 8px; border: 1px dashed #d1d5db; border-radius: 6px;">
                </div>
                <button id="batch-start" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    开始批量处理
                </button>
                <div id="batch-progress" style="margin-top: 16px;"></div>
            </div>
        \`;
        
        container.querySelector('#batch-start').addEventListener('click', () => {
            const files = container.querySelector('#batch-files').files;
            const naming = container.querySelector('#batch-naming').value;
            this.processFiles(files, naming, container.querySelector('#batch-progress'));
        });
    }
    
    async processFiles(files, naming, progressEl) {
        progressEl.innerHTML = '<div>正在处理...</div>';
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const text = await file.text();
            this.api.emit('batch:process', { text, filename: naming.replace('{index}', i + 1) });
            progressEl.innerHTML += \`<div style="color: #059669; font-size: 13px;">✓ \${file.name}</div>\`;
        }
    }
    
    unmount() {
        this.api.log('批量处理组件卸载');
    }
    
    getOptions() {
        return this.api.getConfig() || this.options;
    }
    
    getDefaultOptions() {
        return this.options;
    }
}
module.exports = BatchProcessor;`
        };

        return codes[type] || '';
    }

    renderContent() {
        const content = this.modal.querySelector('#plugin-market-content');

        switch (this.currentTab) {
            case 'market':
                this.renderMarket(content);
                break;
            case 'installed':
                this.renderInstalled(content);
                break;
            case 'upload':
                this.renderUpload(content);
                break;
        }
    }

    renderMarket(container) {
        const searchTerm = this.modal.querySelector('#plugin-search').value.toLowerCase();
        const typeFilter = this.modal.querySelector('#plugin-type-filter').value;

        let plugins = this.marketPlugins.filter(p => {
            const matchesSearch = p.manifest.name.toLowerCase().includes(searchTerm) ||
                                  p.manifest.description.toLowerCase().includes(searchTerm) ||
                                  (p.manifest.keywords || []).some(k => k.toLowerCase().includes(searchTerm));
            const matchesType = typeFilter === 'all' || p.manifest.type === typeFilter;
            return matchesSearch && matchesType;
        });

        if (plugins.length === 0) {
            container.innerHTML = this.renderEmpty('没有找到匹配的插件');
            return;
        }

        container.innerHTML = `
            <div class="plugin-grid">
                ${plugins.map(p => this.renderPluginCard(p, 'market')).join('')}
            </div>
        `;

        this.bindCardEvents(container, 'market');
    }

    renderInstalled(container) {
        const searchTerm = this.modal.querySelector('#plugin-search').value.toLowerCase();
        const typeFilter = this.modal.querySelector('#plugin-type-filter').value;

        let plugins = this.pluginManager.getAllPlugins().filter(p => {
            const matchesSearch = p.manifest.name.toLowerCase().includes(searchTerm) ||
                                  p.manifest.description.toLowerCase().includes(searchTerm);
            const matchesType = typeFilter === 'all' || p.manifest.type === typeFilter;
            return matchesSearch && matchesType;
        });

        if (plugins.length === 0) {
            container.innerHTML = this.renderEmpty('还没有安装任何插件');
            return;
        }

        container.innerHTML = `
            <div class="plugin-grid">
                ${plugins.map(p => this.renderPluginCard(p, 'installed')).join('')}
            </div>
        `;

        this.bindCardEvents(container, 'installed');
    }

    renderUpload(container) {
        container.innerHTML = `
            <div style="max-width: 500px; margin: 0 auto;">
                <div class="plugin-file-upload" id="plugin-upload-area">
                    <div class="plugin-file-upload-icon">📦</div>
                    <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">拖拽插件文件到这里</div>
                    <div style="font-size: 13px; color: #6b7280;">或点击选择 .js 或 .json 插件文件</div>
                    <input type="file" id="plugin-file-input" accept=".js,.json" style="display: none;">
                </div>
                <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 14px;">插件文件格式说明</h4>
                    <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.6;">
                        插件包应为包含 <code>manifest</code> 和 <code>code</code> 的 JSON 文件，
                        或者直接是符合插件接口的 JavaScript 文件。
                    </p>
                </div>
            </div>
        `;

        const uploadArea = container.querySelector('#plugin-upload-area');
        const fileInput = container.querySelector('#plugin-file-input');

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#667eea';
            uploadArea.style.background = '#f5f3ff';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#d1d5db';
            uploadArea.style.background = 'white';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#d1d5db';
            uploadArea.style.background = 'white';
            this.handleFileUpload(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });
    }

    renderEmpty(message) {
        return `
            <div class="plugin-empty">
                <div class="plugin-empty-icon">📭</div>
                <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">${message}</div>
                <div style="font-size: 14px; color: #9ca3af;">去插件市场看看有什么好玩的吧</div>
            </div>
        `;
    }

    renderPluginCard(pluginData, view) {
        const manifest = pluginData.manifest;
        const isInstalled = this.pluginManager.getPlugin(manifest.id);
        const installedPlugin = isInstalled ? this.pluginManager.getPlugin(manifest.id) : null;
        const status = installedPlugin ? installedPlugin.status : null;
        const compatibility = this.pluginManager.versionChecker.checkCompatibility(manifest.hostVersion);

        const typeLabels = {
            render_effect: '渲染效果',
            export_format: '导出格式',
            interactive_component: '交互组件'
        };

        const typeIcons = {
            render_effect: '🎨',
            export_format: '💾',
            interactive_component: '🧩'
        };

        return `
            <div class="plugin-card" data-plugin-id="${manifest.id}">
                <div class="plugin-card-header">
                    <div class="plugin-icon ${manifest.type}">${manifest.icon || typeIcons[manifest.type]}</div>
                    <div class="plugin-card-info">
                        <div class="plugin-card-name">${manifest.name}</div>
                        <div class="plugin-card-version">
                            <span>v${manifest.version}</span>
                            <span class="plugin-type-badge ${manifest.type}">${typeLabels[manifest.type]}</span>
                        </div>
                    </div>
                </div>
                <div class="plugin-card-description">${manifest.description}</div>
                <div class="plugin-card-meta">
                    <span class="plugin-card-author">👤 ${manifest.author.name}</span>
                    ${view === 'installed' && status ? this.renderStatusBadge(status) : ''}
                </div>
                ${view === 'installed' ? this.renderInstalledActions(installedPlugin) : this.renderMarketActions(manifest, isInstalled, compatibility)}
            </div>
        `;
    }

    renderStatusBadge(status) {
        const labels = {
            [PluginStatus.ACTIVE]: '运行中',
            [PluginStatus.DISABLED]: '已禁用',
            [PluginStatus.ERROR]: '错误',
            [PluginStatus.INCOMPATIBLE]: '不兼容',
            [PluginStatus.LOADED]: '已加载',
            [PluginStatus.PENDING]: '待启用'
        };

        return `<span class="plugin-status-badge ${status}">${labels[status] || status}</span>`;
    }

    renderMarketActions(manifest, isInstalled, compatibility) {
        if (isInstalled) {
            return `
                <div class="plugin-card-actions">
                    <button class="plugin-btn plugin-btn-secondary" data-action="details">详情</button>
                    <button class="plugin-btn plugin-btn-secondary" data-action="update" disabled>已安装</button>
                </div>
            `;
        }

        if (!compatibility.isCompatible) {
            return `
                <div class="plugin-card-actions">
                    <button class="plugin-btn plugin-btn-secondary" data-action="details">详情</button>
                    <button class="plugin-btn plugin-btn-secondary" disabled title="${compatibility.reason}">不兼容</button>
                </div>
            `;
        }

        return `
            <div class="plugin-card-actions">
                <button class="plugin-btn plugin-btn-secondary" data-action="details">详情</button>
                <button class="plugin-btn plugin-btn-primary" data-action="install">安装</button>
            </div>
        `;
    }

    renderInstalledActions(plugin) {
        if (!plugin) return '';

        const { status } = plugin;

        if (status === PluginStatus.INCOMPATIBLE) {
            return `
                <div class="plugin-card-actions">
                    <button class="plugin-btn plugin-btn-secondary" data-action="details">详情</button>
                    <button class="plugin-btn plugin-btn-danger" data-action="uninstall">卸载</button>
                </div>
            `;
        }

        if (status === PluginStatus.ACTIVE) {
            return `
                <div class="plugin-card-actions">
                    <button class="plugin-btn plugin-btn-secondary" data-action="details">详情</button>
                    <button class="plugin-btn plugin-btn-secondary" data-action="disable">禁用</button>
                    <button class="plugin-btn plugin-btn-danger" data-action="uninstall">卸载</button>
                </div>
            `;
        }

        if (status === PluginStatus.DISABLED || status === PluginStatus.LOADED) {
            return `
                <div class="plugin-card-actions">
                    <button class="plugin-btn plugin-btn-secondary" data-action="details">详情</button>
                    <button class="plugin-btn plugin-btn-primary" data-action="enable">启用</button>
                    <button class="plugin-btn plugin-btn-danger" data-action="uninstall">卸载</button>
                </div>
            `;
        }

        if (status === PluginStatus.ERROR) {
            return `
                <div class="plugin-card-actions">
                    <button class="plugin-btn plugin-btn-secondary" data-action="details">详情</button>
                    <button class="plugin-btn plugin-btn-secondary" data-action="retry">重试</button>
                    <button class="plugin-btn plugin-btn-danger" data-action="uninstall">卸载</button>
                </div>
            `;
        }

        return '';
    }

    bindCardEvents(container, view) {
        container.querySelectorAll('.plugin-card').forEach(card => {
            const pluginId = card.dataset.pluginId;

            card.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    await this.handleAction(pluginId, action, view);
                });
            });

            card.addEventListener('click', () => this.showPluginDetail(pluginId, view));
        });
    }

    async handleAction(pluginId, action, view) {
        try {
            switch (action) {
                case 'install':
                    await this.installPlugin(pluginId);
                    break;
                case 'uninstall':
                    if (confirm('确定要卸载这个插件吗？')) {
                        await this.pluginManager.uninstallPlugin(pluginId);
                        this.showToast('插件已卸载', 'success');
                    }
                    break;
                case 'enable':
                    await this.pluginManager.enablePlugin(pluginId);
                    this.showToast('插件已启用', 'success');
                    break;
                case 'disable':
                    await this.pluginManager.disablePlugin(pluginId);
                    this.showToast('插件已禁用', 'success');
                    break;
                case 'details':
                    this.showPluginDetail(pluginId, view);
                    break;
                case 'retry':
                    const plugin = this.pluginManager.getPlugin(pluginId);
                    if (plugin) {
                        await this.pluginManager.uninstallPlugin(pluginId);
                        await this.installPlugin(pluginId);
                    }
                    break;
            }
            this.renderContent();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async installPlugin(pluginId) {
        const pluginPackage = this.marketPlugins.find(p => p.manifest.id === pluginId);
        if (!pluginPackage) throw new Error('插件不存在');

        const result = await this.pluginManager.registerPlugin(pluginPackage);
        if (!result.success) {
            throw new Error(result.error || '安装失败');
        }

        this.pluginManager.savePlugins();
        this.showToast('插件安装成功', 'success');
    }

    async handleFileUpload(files) {
        for (const file of files) {
            try {
                const content = await file.text();
                let pluginPackage;

                if (file.name.endsWith('.json')) {
                    pluginPackage = JSON.parse(content);
                } else {
                    pluginPackage = {
                        manifest: {
                            id: file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                            name: file.name.replace(/\.[^/.]+$/, ''),
                            version: '1.0.0',
                            type: 'interactive_component',
                            description: '用户上传的插件',
                            author: { name: '用户' },
                            hostVersion: '>=1.0.0'
                        },
                        code: content
                    };
                }

                const result = await this.pluginManager.registerPlugin(pluginPackage);
                if (result.success) {
                    this.pluginManager.savePlugins();
                    this.showToast(`插件 "${pluginPackage.manifest.name}" 安装成功`, 'success');
                } else {
                    this.showToast(`安装失败: ${result.error}`, 'error');
                }
            } catch (error) {
                this.showToast(`文件处理失败: ${error.message}`, 'error');
            }
        }

        this.currentTab = 'installed';
        this.modal.querySelectorAll('.plugin-market-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === 'installed');
        });
        this.renderContent();
    }

    showPluginDetail(pluginId, view) {
        let pluginData;
        if (view === 'market') {
            pluginData = this.marketPlugins.find(p => p.manifest.id === pluginId);
        } else {
            const installed = this.pluginManager.getPlugin(pluginId);
            pluginData = installed || this.marketPlugins.find(p => p.manifest.id === pluginId);
        }

        if (!pluginData) return;

        const manifest = pluginData.manifest;
        const isInstalled = this.pluginManager.getPlugin(pluginId);
        const compatibility = this.pluginManager.versionChecker.checkCompatibility(manifest.hostVersion);

        const typeLabels = {
            render_effect: '渲染效果',
            export_format: '导出格式',
            interactive_component: '交互组件'
        };

        const typeIcons = {
            render_effect: '🎨',
            export_format: '💾',
            interactive_component: '🧩'
        };

        const detailModal = document.createElement('div');
        detailModal.className = 'plugin-detail-modal';
        detailModal.innerHTML = `
            <div class="plugin-detail-content">
                <div class="plugin-detail-header">
                    <div class="plugin-detail-icon plugin-icon ${manifest.type}">${manifest.icon || typeIcons[manifest.type]}</div>
                    <div class="plugin-detail-info">
                        <h3>${manifest.name}</h3>
                        <div class="plugin-detail-version">
                            v${manifest.version} · ${typeLabels[manifest.type]}
                        </div>
                    </div>
                </div>
                
                <div class="plugin-compatibility ${compatibility.isCompatible ? 'compatible' : 'incompatible'}">
                    <span>${compatibility.isCompatible ? '✅' : '⚠️'}</span>
                    <span>${compatibility.isCompatible ? '与当前版本兼容' : compatibility.reason}</span>
                </div>
                
                <div class="plugin-detail-section">
                    <h4>描述</h4>
                    <p>${manifest.description}</p>
                </div>
                
                <div class="plugin-detail-section">
                    <h4>作者</h4>
                    <p>${manifest.author.name}${manifest.author.email ? ` <${manifest.author.email}>` : ''}</p>
                </div>
                
                ${manifest.keywords && manifest.keywords.length > 0 ? `
                <div class="plugin-detail-section">
                    <h4>标签</h4>
                    <div class="plugin-permissions">
                        ${manifest.keywords.map(k => `<span class="permission-tag">#${k}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${manifest.permissions && manifest.permissions.length > 0 ? `
                <div class="plugin-detail-section">
                    <h4>所需权限</h4>
                    <div class="plugin-permissions">
                        ${manifest.permissions.map(p => `<span class="permission-tag">${this.getPermissionLabel(p)}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="plugin-detail-section">
                    <h4>版本要求</h4>
                    <p>宿主系统: ${manifest.hostVersion} (当前: ${this.pluginManager.hostVersion})</p>
                </div>
                
                <div class="plugin-detail-actions">
                    <button class="plugin-btn plugin-btn-secondary" data-action="close">关闭</button>
                    ${isInstalled ? `
                        <button class="plugin-btn plugin-btn-danger" data-action="uninstall">卸载</button>
                    ` : `
                        <button class="plugin-btn plugin-btn-primary" data-action="install" ${compatibility.isCompatible ? '' : 'disabled'}>
                            ${compatibility.isCompatible ? '安装' : '不兼容'}
                        </button>
                    `}
                </div>
            </div>
        `;

        this.modal.querySelector('.plugin-market-container').appendChild(detailModal);

        detailModal.querySelector('[data-action="close"]').addEventListener('click', () => detailModal.remove());
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) detailModal.remove();
        });

        const installBtn = detailModal.querySelector('[data-action="install"]');
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                try {
                    await this.installPlugin(pluginId);
                    detailModal.remove();
                    this.renderContent();
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            });
        }

        const uninstallBtn = detailModal.querySelector('[data-action="uninstall"]');
        if (uninstallBtn) {
            uninstallBtn.addEventListener('click', async () => {
                if (confirm('确定要卸载这个插件吗？')) {
                    try {
                        await this.pluginManager.uninstallPlugin(pluginId);
                        detailModal.remove();
                        this.showToast('插件已卸载', 'success');
                        this.renderContent();
                    } catch (error) {
                        this.showToast(error.message, 'error');
                    }
                }
            });
        }
    }

    getPermissionLabel(permission) {
        const labels = {
            read_config: '读取配置',
            write_config: '写入配置',
            network: '网络访问',
            storage: '本地存储',
            canvas_access: '画布访问',
            dom_access: 'DOM访问'
        };
        return labels[permission] || permission;
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `plugin-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    createMarketButton() {
        const btn = document.createElement('button');
        btn.className = 'plugin-market-btn';
        btn.innerHTML = '🧩 插件市场';
        btn.style.cssText = `
            position: fixed;
            right: 24px;
            bottom: 24px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            z-index: 1000;
            transition: all 0.2s;
        `;
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        });
        btn.addEventListener('click', () => this.open());
        return btn;
    }
}

if (typeof window !== 'undefined') {
    window.PluginMarketUI = PluginMarketUI;
}
