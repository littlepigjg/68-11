class PluginManager {
    constructor(hostVersion = '1.0.0') {
        this.hostVersion = hostVersion;
        this.plugins = new Map();
        this.pluginSandboxes = new Map();
        this.renderEffects = new Map();
        this.exportFormats = new Map();
        this.interactiveComponents = new Map();
        this.versionChecker = new VersionChecker(hostVersion);
        this.eventListeners = new Map();
        this.storage = this.initStorage();
        this.hostAPI = null;
        this.isInitialized = false;
    }

    initStorage() {
        const storagePrefix = 'plugin_manager_';
        return {
            getItem: (key) => {
                try {
                    return localStorage.getItem(storagePrefix + key);
                } catch (e) {
                    return null;
                }
            },
            setItem: (key, value) => {
                try {
                    localStorage.setItem(storagePrefix + key, value);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            removeItem: (key) => {
                try {
                    localStorage.removeItem(storagePrefix + key);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            getPluginData: (pluginId, key) => {
                const data = this.storage.getItem(`plugin_${pluginId}_data`);
                if (!data) return null;
                try {
                    const parsed = JSON.parse(data);
                    return parsed[key];
                } catch (e) {
                    return null;
                }
            },
            setPluginData: (pluginId, key, value) => {
                const dataKey = `plugin_${pluginId}_data`;
                let data = {};
                try {
                    const existing = this.storage.getItem(dataKey);
                    if (existing) data = JSON.parse(existing);
                } catch (e) {}
                data[key] = value;
                return this.storage.setItem(dataKey, JSON.stringify(data));
            },
            getPluginConfig: (pluginId) => {
                const config = this.storage.getItem(`plugin_${pluginId}_config`);
                return config ? JSON.parse(config) : null;
            },
            setPluginConfig: (pluginId, config) => {
                return this.storage.setItem(`plugin_${pluginId}_config`, JSON.stringify(config));
            }
        };
    }

    setHostAPI(api) {
        this.hostAPI = api;
    }

    validateManifest(manifest) {
        const errors = [];
        const schema = PluginManifestSchema;

        for (const field of schema.required) {
            if (manifest[field] === undefined) {
                errors.push(`缺少必填字段: ${field}`);
            }
        }

        if (manifest.id && !/^[a-z0-9-]+$/.test(manifest.id)) {
            errors.push('插件ID只能包含小写字母、数字和横杠');
        }

        if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
            errors.push('版本号格式不正确，应为 x.y.z');
        }

        if (manifest.type && !PluginTypes.ALL.includes(manifest.type)) {
            errors.push(`插件类型不正确，应为: ${PluginTypes.ALL.join(', ')}`);
        }

        if (manifest.author && typeof manifest.author === 'object' && !manifest.author.name) {
            errors.push('作者信息缺少name字段');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateInterface(plugin, type) {
        const errors = [];
        let iface;

        switch (type) {
            case PluginTypes.RENDER_EFFECT:
                iface = RenderEffectInterface;
                break;
            case PluginTypes.EXPORT_FORMAT:
                iface = ExportFormatInterface;
                break;
            case PluginTypes.INTERACTIVE_COMPONENT:
                iface = InteractiveComponentInterface;
                break;
            default:
                errors.push(`未知的插件类型: ${type}`);
                return { isValid: false, errors };
        }

        for (const [method, expectedType] of Object.entries(iface)) {
            if (typeof plugin[method] !== expectedType) {
                errors.push(`缺少接口方法: ${method} (应为 ${expectedType})`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    async registerPlugin(pluginPackage, options = {}) {
        const { manifest, code, useSandbox = true } = pluginPackage;

        const manifestValidation = this.validateManifest(manifest);
        if (!manifestValidation.isValid) {
            return {
                success: false,
                status: PluginStatus.ERROR,
                error: `清单验证失败: ${manifestValidation.errors.join('; ')}`
            };
        }

        if (this.plugins.has(manifest.id)) {
            return {
                success: false,
                status: PluginStatus.ERROR,
                error: `插件ID已存在: ${manifest.id}`
            };
        }

        const compatibility = this.versionChecker.checkCompatibility(manifest.hostVersion);
        if (!compatibility.isCompatible) {
            this.plugins.set(manifest.id, {
                manifest,
                status: PluginStatus.INCOMPATIBLE,
                error: compatibility.reason
            });
            return {
                success: false,
                status: PluginStatus.INCOMPATIBLE,
                error: compatibility.reason
            };
        }

        const pluginRecord = {
            manifest,
            code,
            status: PluginStatus.PENDING,
            instance: null,
            sandbox: null,
            config: {},
            enabled: !options.disabled,
            installedAt: Date.now(),
            updatedAt: Date.now()
        };

        try {
            const api = this.createPluginAPI(manifest);

            if (useSandbox) {
                const sandbox = new PluginSandbox(manifest.id, manifest.permissions || []);
                pluginRecord.sandbox = sandbox;
                this.pluginSandboxes.set(manifest.id, sandbox);

                await sandbox.init();
                const instance = await this.createSandboxedInstance(code, api, manifest);
                pluginRecord.instance = instance;
            } else {
                pluginRecord.instance = this.createDirectInstance(code, api, manifest);
            }

            const interfaceValidation = this.validateInterface(pluginRecord.instance, manifest.type);
            if (!interfaceValidation.isValid) {
                throw new Error(`接口验证失败: ${interfaceValidation.errors.join('; ')}`);
            }

            pluginRecord.status = PluginStatus.LOADED;

            if (pluginRecord.enabled) {
                await this.enablePlugin(manifest.id);
            }

            this.plugins.set(manifest.id, pluginRecord);
            this.emit('plugin:registered', { pluginId: manifest.id, manifest });

            return {
                success: true,
                status: pluginRecord.status,
                pluginId: manifest.id
            };
        } catch (error) {
            pluginRecord.status = PluginStatus.ERROR;
            pluginRecord.error = error.message;
            this.plugins.set(manifest.id, pluginRecord);

            return {
                success: false,
                status: PluginStatus.ERROR,
                error: error.message
            };
        }
    }

    createPluginAPI(manifest) {
        const self = this;
        const pluginId = manifest.id;
        const permissions = manifest.permissions || [];

        const api = {
            id: pluginId,
            name: manifest.name,
            version: manifest.version,
            type: manifest.type,

            log: (...args) => console.log(`[插件:${pluginId}]`, ...args),
            warn: (...args) => console.warn(`[插件:${pluginId}]`, ...args),
            error: (...args) => console.error(`[插件:${pluginId}]`, ...args),

            getConfig: () => {
                return self.storage.getPluginConfig(pluginId) || manifest.defaultConfig || {};
            },
            setConfig: (config) => {
                return self.storage.setPluginConfig(pluginId, config);
            },
            getData: (key) => {
                if (!permissions.includes('storage')) return null;
                return self.storage.getPluginData(pluginId, key);
            },
            setData: (key, value) => {
                if (!permissions.includes('storage')) return false;
                return self.storage.setPluginData(pluginId, key, value);
            },

            on: (event, callback) => self.on(`${pluginId}:${event}`, callback),
            off: (event, callback) => self.off(`${pluginId}:${event}`, callback),
            emit: (event, data) => self.emit(`${pluginId}:${event}`, data),

            getHostAPI: () => {
                if (!permissions.includes('dom_access')) return null;
                return self.hostAPI ? { ...self.hostAPI } : null;
            },

            getVersion: () => ({
                plugin: manifest.version,
                host: self.hostVersion
            })
        };

        return Object.freeze(api);
    }

    createDirectInstance(code, api, manifest) {
        const module = { exports: {} };
        const require = () => {
            throw new Error('插件不支持require');
        };

        const wrapper = new Function('module', 'exports', 'require', 'api', code);
        wrapper(module, module.exports, require, api);

        const PluginClass = module.exports.default || module.exports;
        if (typeof PluginClass === 'function') {
            return new PluginClass(api);
        } else if (typeof module.exports === 'object') {
            return module.exports;
        } else {
            throw new Error('插件代码必须导出一个类或对象');
        }
    }

    async createSandboxedInstance(code, api, manifest) {
        const sandbox = this.pluginSandboxes.get(manifest.id);
        const proxyAPI = this.createProxyAPI(api, manifest);
        await sandbox.executePluginCode(code, proxyAPI);

        return new Proxy({}, {
            get: (target, prop) => {
                return async (...args) => {
                    return sandbox.callPluginMethod(prop, ...args);
                };
            }
        });
    }

    createProxyAPI(api, manifest) {
        const proxy = {};
        for (const [key, value] of Object.entries(api)) {
            if (typeof value === 'function') {
                proxy[key] = value.bind(api);
            } else {
                proxy[key] = value;
            }
        }
        return proxy;
    }

    async enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) throw new Error(`插件不存在: ${pluginId}`);
        if (plugin.status === PluginStatus.INCOMPATIBLE) {
            throw new Error('插件版本不兼容，无法启用');
        }

        try {
            if (plugin.instance && typeof plugin.instance.onEnable === 'function') {
                await plugin.instance.onEnable();
            }

            this.registerExtension(plugin);
            plugin.status = PluginStatus.ACTIVE;
            plugin.enabled = true;
            plugin.updatedAt = Date.now();

            this.emit('plugin:enabled', { pluginId });
            return true;
        } catch (error) {
            plugin.status = PluginStatus.ERROR;
            plugin.error = error.message;
            throw error;
        }
    }

    async disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) throw new Error(`插件不存在: ${pluginId}`);

        try {
            if (plugin.instance && typeof plugin.instance.onDisable === 'function') {
                await plugin.instance.onDisable();
            }

            this.unregisterExtension(plugin);
            plugin.status = PluginStatus.DISABLED;
            plugin.enabled = false;
            plugin.updatedAt = Date.now();

            this.emit('plugin:disabled', { pluginId });
            return true;
        } catch (error) {
            plugin.error = error.message;
            throw error;
        }
    }

    async uninstallPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) throw new Error(`插件不存在: ${pluginId}`);

        try {
            if (plugin.enabled) {
                await this.disablePlugin(pluginId);
            }

            if (plugin.instance && typeof plugin.instance.onUninstall === 'function') {
                await plugin.instance.onUninstall();
            }

            if (plugin.sandbox) {
                plugin.sandbox.destroy();
                this.pluginSandboxes.delete(pluginId);
            }

            this.storage.removeItem(`plugin_${pluginId}_config`);
            this.storage.removeItem(`plugin_${pluginId}_data`);

            this.plugins.delete(pluginId);
            this.emit('plugin:uninstalled', { pluginId });
            return true;
        } catch (error) {
            throw error;
        }
    }

    registerExtension(plugin) {
        const { manifest, instance } = plugin;

        switch (manifest.type) {
            case PluginTypes.RENDER_EFFECT:
                this.renderEffects.set(manifest.id, {
                    manifest,
                    instance,
                    enabled: true
                });
                break;
            case PluginTypes.EXPORT_FORMAT:
                this.exportFormats.set(manifest.id, {
                    manifest,
                    instance,
                    enabled: true
                });
                break;
            case PluginTypes.INTERACTIVE_COMPONENT:
                this.interactiveComponents.set(manifest.id, {
                    manifest,
                    instance,
                    enabled: true
                });
                break;
        }
    }

    unregisterExtension(plugin) {
        const { manifest } = plugin;

        switch (manifest.type) {
            case PluginTypes.RENDER_EFFECT:
                this.renderEffects.delete(manifest.id);
                break;
            case PluginTypes.EXPORT_FORMAT:
                this.exportFormats.delete(manifest.id);
                break;
            case PluginTypes.INTERACTIVE_COMPONENT:
                this.interactiveComponents.delete(manifest.id);
                break;
        }
    }

    getPlugin(pluginId) {
        return this.plugins.get(pluginId);
    }

    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    getPluginsByType(type) {
        return this.getAllPlugins().filter(p => p.manifest.type === type);
    }

    getActivePlugins() {
        return this.getAllPlugins().filter(p => p.status === PluginStatus.ACTIVE);
    }

    getRenderEffects() {
        return Array.from(this.renderEffects.values());
    }

    getExportFormats() {
        return Array.from(this.exportFormats.values());
    }

    getInteractiveComponents() {
        return Array.from(this.interactiveComponents.values());
    }

    async applyRenderEffects(ctx, options, seed) {
        const effects = this.getRenderEffects().filter(e => e.enabled);
        for (const effect of effects) {
            try {
                await effect.instance.apply(ctx, options, seed);
            } catch (e) {
                console.error(`渲染效果[${effect.manifest.id}]执行失败:`, e);
            }
        }
    }

    async exportWithFormat(pluginId, canvases, options) {
        const format = this.exportFormats.get(pluginId);
        if (!format || !format.enabled) {
            throw new Error(`导出格式不存在或未启用: ${pluginId}`);
        }
        return format.instance.export(canvases, options);
    }

    mountInteractiveComponent(pluginId, container) {
        const component = this.interactiveComponents.get(pluginId);
        if (!component || !component.enabled) {
            throw new Error(`交互组件不存在或未启用: ${pluginId}`);
        }
        const api = this.createPluginAPI(component.manifest);
        return component.instance.mount(container, api);
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`事件监听[${event}]执行失败:`, e);
                }
            }
        }
    }

    async init() {
        if (this.isInitialized) return;

        const storedPlugins = this.storage.getItem('installed_plugins');
        if (storedPlugins) {
            try {
                const savedPlugins = JSON.parse(storedPlugins);
                for (const pluginData of savedPlugins) {
                    try {
                        await this.registerPlugin(pluginData);
                    } catch (e) {
                        console.error(`加载保存的插件失败:`, e);
                    }
                }
            } catch (e) {
                console.error('解析已安装插件失败:', e);
            }
        }

        this.isInitialized = true;
        this.emit('manager:initialized');
    }

    savePlugins() {
        const pluginsToSave = [];
        for (const [id, plugin] of this.plugins) {
            if (plugin.status !== PluginStatus.ERROR) {
                pluginsToSave.push({
                    manifest: plugin.manifest,
                    code: plugin.code,
                    disabled: !plugin.enabled
                });
            }
        }
        this.storage.setItem('installed_plugins', JSON.stringify(pluginsToSave));
    }

    static getInstance(hostVersion) {
        if (!PluginManager._instance) {
            PluginManager._instance = new PluginManager(hostVersion);
        }
        return PluginManager._instance;
    }
}

if (typeof window !== 'undefined') {
    window.PluginManager = PluginManager;
}
