class PluginLoader {
    constructor(baseUrl = 'plugins') {
        this.baseUrl = baseUrl;
        this.loadedPlugins = new Map();
    }

    async loadPlugin(pluginId, useSandbox = true) {
        if (this.loadedPlugins.has(pluginId)) {
            return this.loadedPlugins.get(pluginId);
        }

        try {
            const [manifest, code] = await Promise.all([
                this.fetchManifest(pluginId),
                this.fetchCode(pluginId)
            ]);

            const pluginPackage = { manifest, code, useSandbox };
            this.loadedPlugins.set(pluginId, pluginPackage);

            return pluginPackage;
        } catch (error) {
            console.error(`加载插件失败[${pluginId}]:`, error);
            throw error;
        }
    }

    async fetchManifest(pluginId) {
        const url = `${this.baseUrl}/${pluginId}/manifest.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`无法加载插件清单: ${response.status}`);
        }
        return response.json();
    }

    async fetchCode(pluginId) {
        const url = `${this.baseUrl}/${pluginId}/index.js`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`无法加载插件代码: ${response.status}`);
        }
        return response.text();
    }

    async loadAllPlugins(pluginIds, useSandbox = true) {
        const results = await Promise.allSettled(
            pluginIds.map(id => this.loadPlugin(id, useSandbox))
        );

        return results.map((result, index) => ({
            pluginId: pluginIds[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason : null
        }));
    }

    async discoverPlugins() {
        try {
            const response = await fetch(`${this.baseUrl}/index.json`);
            if (response.ok) {
                return response.json();
            }
        } catch (e) {
            console.log('无法发现插件，使用内置列表');
        }

        return [
            'watermark-effect',
            'svg-export',
            'writing-assistant'
        ];
    }

    createPackageFromFiles(manifestFile, codeFile) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const manifest = JSON.parse(e.target.result);
                    const codeReader = new FileReader();

                    codeReader.onload = (ce) => {
                        resolve({
                            manifest,
                            code: ce.target.result
                        });
                    };

                    codeReader.onerror = reject;
                    codeReader.readAsText(codeFile);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsText(manifestFile);
        });
    }

    validatePluginPackage(packageData) {
        const { manifest, code } = packageData;

        if (!manifest || typeof manifest !== 'object') {
            return { valid: false, error: '缺少有效的清单文件' };
        }

        const requiredFields = ['id', 'name', 'version', 'type', 'description', 'author', 'hostVersion'];
        for (const field of requiredFields) {
            if (!manifest[field]) {
                return { valid: false, error: `缺少必填字段: ${field}` };
            }
        }

        if (!/^[a-z0-9-]+$/.test(manifest.id)) {
            return { valid: false, error: '插件ID只能包含小写字母、数字和横杠' };
        }

        if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
            return { valid: false, error: '版本号格式不正确，应为 x.y.z' };
        }

        if (!PluginTypes.ALL.includes(manifest.type)) {
            return { valid: false, error: `插件类型必须是: ${PluginTypes.ALL.join(', ')}` };
        }

        if (!code || typeof code !== 'string' || code.trim() === '') {
            return { valid: false, error: '插件代码不能为空' };
        }

        return { valid: true };
    }
}

if (typeof window !== 'undefined') {
    window.PluginLoader = PluginLoader;
}
