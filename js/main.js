class HandwritingApp {
    constructor() {
        this.canvas = document.getElementById('previewCanvas');
        this.renderer = new HandwritingRenderer(this.canvas);
        this.exportManager = new ExportManager();
        this.exportHandlers = new ExportHandlers(this);
        this.eventHandlers = new EventHandlers(this);
        this.fontManager = new FontManager();
        
        this.currentStyle = 'kaishu';
        this.customFontFamily = null;
        this.debounceTimer = null;
        
        this.pluginManager = null;
        this.pluginIntegration = null;
        this.pluginMarketUI = null;
        
        this.init();
    }

    async init() {
        console.log('开始初始化应用...');
        this.showLoading();
        
        try {
            await FontLoader.loadAllFonts();
            console.log('所有字体预加载完成');
        } catch (error) {
            console.warn('预加载字体失败:', error);
        }
        
        console.log('绑定事件处理...');
        this.eventHandlers.bindAll();
        
        console.log('应用初始样式...');
        await this.eventHandlers.applyStyle('kaishu');
        
        console.log('生成预览...');
        this.generatePreview();
        
        console.log('准备初始化插件系统...');
        try {
            await this.initPluginSystem();
            console.log('插件系统初始化调用完成');
        } catch (e) {
            console.error('插件系统初始化调用异常:', e);
        }
        
        console.log('隐藏加载动画...');
        this.hideLoading();
        console.log('应用初始化完成');
    }

    async initPluginSystem() {
        console.log('开始初始化插件系统...');
        console.log('PluginManager:', typeof PluginManager);
        console.log('PluginIntegration:', typeof PluginIntegration);
        console.log('PluginMarketUI:', typeof PluginMarketUI);
        try {
            const HOST_VERSION = '1.0.0';
            
            this.pluginManager = new PluginManager(HOST_VERSION);
            await this.pluginManager.init();
            
            this.pluginIntegration = new PluginIntegration(this, this.pluginManager);
            this.pluginIntegration.init();
            
            this.pluginMarketUI = new PluginMarketUI(this.pluginManager);
            this.pluginMarketUI.init();
            
            const marketBtn = this.pluginIntegration.createPluginMenuButton();
            marketBtn.addEventListener('click', () => this.pluginMarketUI.open());
            
            document.body.appendChild(this.pluginMarketUI.createMarketButton());
            
            console.log('插件系统初始化完成');
            console.log('已安装插件:', this.pluginManager.getAllPlugins().length);
        } catch (error) {
            console.error('插件系统初始化失败:', error);
        }
    }

    debouncedGenerate() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.generatePreview();
        }, 150);
    }

    generatePreview() {
        const text = document.getElementById('textInput').value;
        this.renderer.setOptions({ text });
        
        this.showLoading();
        
        requestAnimationFrame(() => {
            const startTime = performance.now();
            
            const pageCount = this.renderer.renderPage(this.renderer.currentPage);
            
            const endTime = performance.now();
            console.log(`生成耗时: ${(endTime - startTime).toFixed(2)}ms, 共 ${pageCount} 页`);
            
            this.updatePageInfo();
            this.hideLoading();
        });
    }

    changePage(direction) {
        const pageCount = this.renderer.getPageCount();
        let newPage = this.renderer.currentPage + direction;
        
        if (newPage < 0) newPage = 0;
        if (newPage >= pageCount) newPage = pageCount - 1;
        
        if (newPage !== this.renderer.currentPage) {
            this.renderer.renderPage(newPage);
            this.updatePageInfo();
        }
    }

    updatePageInfo() {
        const current = this.renderer.currentPage + 1;
        const total = this.renderer.getPageCount();
        document.getElementById('pageInfo').textContent = `第 ${current} 页 / 共 ${total} 页`;
        
        document.getElementById('prevPage').disabled = this.renderer.currentPage === 0;
        document.getElementById('nextPage').disabled = this.renderer.currentPage >= total - 1;
    }

    async exportCurrentPage() {
        await this.exportHandlers.exportCurrentPageDirect();
    }

    async exportAllPages() {
        await this.exportHandlers.exportAllPages();
    }

    async exportLongImage() {
        await this.exportHandlers.exportLongImage();
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const initApp = async () => {
        if (document.fonts && document.fonts.ready) {
            try {
                await document.fonts.ready;
            } catch (e) {
                console.warn('字体加载等待超时');
            }
        }
        window.app = new HandwritingApp();
    };
    
    initApp();
});
