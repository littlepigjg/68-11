class PluginSandbox {
    constructor(pluginId, permissions = []) {
        this.pluginId = pluginId;
        this.permissions = permissions;
        this.iframe = null;
        this.messageId = 0;
        this.pendingMessages = new Map();
        this.isReady = false;
        this.readyPromise = null;
        this.allowedAPIs = this.buildAllowedAPIs();
    }

    buildAllowedAPIs() {
        const baseAPIs = {
            console: ['log', 'warn', 'error', 'info', 'debug'],
            Math: Object.getOwnPropertyNames(Math),
            JSON: ['parse', 'stringify'],
            Date: ['now', 'parse', 'UTC'],
            setTimeout: true,
            setInterval: true,
            clearTimeout: true,
            clearInterval: true,
            Promise: true,
            Object: ['keys', 'values', 'entries', 'assign', 'freeze', 'seal'],
            Array: ['isArray', 'from', 'of'],
            String: ['fromCharCode', 'fromCodePoint'],
            Number: ['isNaN', 'isFinite', 'parseInt', 'parseFloat']
        };

        if (this.permissions.includes('storage')) {
            baseAPIs.localStorage = ['getItem', 'setItem', 'removeItem', 'clear'];
        }

        if (this.permissions.includes('canvas_access')) {
            baseAPIs.canvas = ['getContext', 'toDataURL', 'toBlob'];
        }

        return baseAPIs;
    }

    async init() {
        if (this.readyPromise) return this.readyPromise;

        this.readyPromise = new Promise((resolve, reject) => {
            this.iframe = document.createElement('iframe');
            this.iframe.style.display = 'none';
            this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
            this.iframe.setAttribute('referrerpolicy', 'no-referrer');
            this.iframe.setAttribute('csp', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: *;");

            this.iframe.onload = () => {
                this.setupSandboxCommunication();
                this.injectSecureEnvironment();
                resolve(true);
            };

            this.iframe.onerror = reject;

            const blob = new Blob([this.createSandboxHTML()], { type: 'text/html' });
            this.iframe.src = URL.createObjectURL(blob);

            document.body.appendChild(this.iframe);
        });

        return this.readyPromise;
    }

    createSandboxHTML() {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <base href="about:blank">
    <script>
        'use strict';
        
        const _secureGlobal = Object.create(null);
        const _originalProto = Object.prototype;
        
        Object.freeze(Object.prototype);
        Object.freeze(Array.prototype);
        Object.freeze(Function.prototype);
        
        let _messageHandler = null;
        
        Object.defineProperty(window, 'sandboxAPI', {
            value: Object.create(null),
            writable: false,
            configurable: false
        });
        
        Object.defineProperty(window.sandboxAPI, 'setMessageHandler', {
            value: function(handler) {
                _messageHandler = handler;
            },
            writable: false,
            configurable: false
        });
        
        Object.defineProperty(window.sandboxAPI, 'sendMessage', {
            value: function(message) {
                parent.postMessage({
                    type: 'plugin-message',
                    pluginId: '${this.pluginId}',
                    data: message
                }, '*');
            },
            writable: false,
            configurable: false
        });
        
        window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'sandbox-message' && _messageHandler) {
                try {
                    const result = _messageHandler(e.data.data);
                    if (result && typeof result.then === 'function') {
                        result.then(
                            r => e.source.postMessage({
                                type: 'sandbox-response',
                                id: e.data.id,
                                success: true,
                                data: r
                            }, '*'),
                            err => e.source.postMessage({
                                type: 'sandbox-response',
                                id: e.data.id,
                                success: false,
                                error: err.message
                            }, '*')
                        );
                    } else {
                        e.source.postMessage({
                            type: 'sandbox-response',
                            id: e.data.id,
                            success: true,
                            data: result
                        }, '*');
                    }
                } catch (err) {
                    e.source.postMessage({
                        type: 'sandbox-response',
                        id: e.data.id,
                        success: false,
                        error: err.message
                    }, '*');
                }
            }
        });
        
        Object.defineProperty(window, 'onerror', {
            value: function(message, source, lineno, colno, error) {
                parent.postMessage({
                    type: 'plugin-error',
                    pluginId: '${this.pluginId}',
                    error: {
                        message: message,
                        source: source,
                        lineno: lineno,
                        colno: colno,
                        stack: error ? error.stack : null
                    }
                }, '*');
                return true;
            },
            writable: false,
            configurable: false
        });
        
        delete window.parent;
        delete window.top;
        delete window.frameElement;
        delete window.opener;
        
        Object.freeze(window.sandboxAPI);
    <\/script>
</head>
<body></body>
</html>
        `;
    }

    setupSandboxCommunication() {
        window.addEventListener('message', (e) => {
            if (!e.data || e.data.pluginId !== this.pluginId) return;

            if (e.data.type === 'sandbox-response') {
                const { id, success, data, error } = e.data;
                const pending = this.pendingMessages.get(id);
                if (pending) {
                    this.pendingMessages.delete(id);
                    if (success) {
                        pending.resolve(data);
                    } else {
                        pending.reject(new Error(error));
                    }
                }
            } else if (e.data.type === 'plugin-message') {
                this.handlePluginMessage(e.data.data);
            } else if (e.data.type === 'plugin-error') {
                console.error(`插件[${this.pluginId}]错误:`, e.data.error);
            }
        });
    }

    injectSecureEnvironment() {
        const secureEnvCode = `
            (function() {
                'use strict';
                
                const allowedAPIs = ${JSON.stringify(this.allowedAPIs)};
                
                const secureWindow = Object.create(null);
                
                for (const [apiName, members] of Object.entries(allowedAPIs)) {
                    if (members === true) {
                        if (typeof window[apiName] === 'function') {
                            secureWindow[apiName] = window[apiName].bind(window);
                        } else if (window[apiName]) {
                            secureWindow[apiName] = window[apiName];
                        }
                    } else if (Array.isArray(members)) {
                        if (typeof window[apiName] === 'function') {
                            secureWindow[apiName] = function(...args) {
                                return window[apiName](...args);
                            };
                            for (const member of members) {
                                if (typeof window[apiName][member] === 'function') {
                                    secureWindow[apiName][member] = window[apiName][member].bind(window[apiName]);
                                } else if (window[apiName][member] !== undefined) {
                                    secureWindow[apiName][member] = window[apiName][member];
                                }
                            }
                            Object.freeze(secureWindow[apiName]);
                        } else if (typeof window[apiName] === 'object') {
                            secureWindow[apiName] = Object.create(null);
                            for (const member of members) {
                                if (typeof window[apiName][member] === 'function') {
                                    secureWindow[apiName][member] = window[apiName][member].bind(window[apiName]);
                                } else if (window[apiName][member] !== undefined) {
                                    secureWindow[apiName][member] = window[apiName][member];
                                }
                            }
                            Object.freeze(secureWindow[apiName]);
                        }
                    }
                }
                
                secureWindow.self = secureWindow;
                secureWindow.globalThis = secureWindow;
                
                Object.freeze(secureWindow);
                
                window.__secureWindow = secureWindow;
            })();
        `;

        this.executeCode(secureEnvCode);
    }

    async executeCode(code) {
        await this.init();

        const script = `
            try {
                (function(window) {
                    'use strict';
                    ${code}
                })(window.__secureWindow);
            } catch(e) {
                console.error('沙箱执行错误:', e.message);
                throw e;
            }
        `;

        return this.sendMessageToSandbox({
            type: 'execute',
            code: script
        });
    }

    async executePluginCode(code, pluginAPI) {
        await this.init();

        const wrappedCode = `
            (function() {
                'use strict';
                
                const plugin = ${JSON.stringify(pluginAPI)};
                
                sandboxAPI.setMessageHandler(function(message) {
                    if (message && message.type === 'api-call') {
                        const { method, args } = message.data;
                        if (typeof plugin[method] === 'function') {
                            return plugin[method](...args);
                        }
                        throw new Error('方法不存在: ' + method);
                    }
                    return null;
                });
                
                ${code}
                
                if (typeof pluginMain === 'function') {
                    return pluginMain(plugin);
                }
            })();
        `;

        return this.executeCode(wrappedCode);
    }

    sendMessageToSandbox(message) {
        return new Promise((resolve, reject) => {
            const id = ++this.messageId;
            this.pendingMessages.set(id, { resolve, reject });

            this.iframe.contentWindow.postMessage({
                type: 'sandbox-message',
                id: id,
                data: message
            }, '*');

            setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error('沙箱消息超时'));
                }
            }, 30000);
        });
    }

    callPluginMethod(method, ...args) {
        return this.sendMessageToSandbox({
            type: 'api-call',
            data: { method, args }
        });
    }

    handlePluginMessage(message) {
        console.log(`插件[${this.pluginId}]消息:`, message);
    }

    hasPermission(permission) {
        return this.permissions.includes(permission);
    }

    checkPermission(permission) {
        if (!this.hasPermission(permission)) {
            throw new Error(`插件[${this.pluginId}]缺少权限: ${permission}`);
        }
    }

    destroy() {
        if (this.iframe) {
            this.iframe.remove();
            this.iframe = null;
        }
        this.pendingMessages.clear();
        this.isReady = false;
        this.readyPromise = null;
    }
}

if (typeof window !== 'undefined') {
    window.PluginSandbox = PluginSandbox;
}
