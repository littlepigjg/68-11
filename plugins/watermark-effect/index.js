class WatermarkEffect {
    constructor(api) {
        this.api = api;
        this.defaultOptions = {
            text: '手写体生成器',
            fontSize: 48,
            opacity: 0.3,
            position: 'bottom-right',
            rotation: -30,
            color: '#999999'
        };
    }

    async apply(ctx, renderOptions, seed) {
        const canvas = ctx.canvas;
        const config = this.api.getConfig();
        const opts = { ...this.defaultOptions, ...config };

        if (!opts.text || opts.text.trim() === '') {
            return;
        }

        ctx.save();
        ctx.globalAlpha = opts.opacity;
        ctx.font = `bold ${opts.fontSize}px sans-serif`;
        ctx.fillStyle = opts.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const positions = {
            'top-left': { x: canvas.width * 0.2, y: canvas.height * 0.2 },
            'top-center': { x: canvas.width * 0.5, y: canvas.height * 0.15 },
            'top-right': { x: canvas.width * 0.8, y: canvas.height * 0.2 },
            'center': { x: canvas.width * 0.5, y: canvas.height * 0.5 },
            'bottom-left': { x: canvas.width * 0.2, y: canvas.height * 0.8 },
            'bottom-center': { x: canvas.width * 0.5, y: canvas.height * 0.85 },
            'bottom-right': { x: canvas.width * 0.8, y: canvas.height * 0.8 }
        };

        const pos = positions[opts.position] || positions['bottom-right'];

        ctx.translate(pos.x, pos.y);
        ctx.rotate((opts.rotation * Math.PI) / 180);
        ctx.fillText(opts.text, 0, 0);
        ctx.restore();

        this.api.log('水印效果已应用');
    }

    getOptions() {
        return this.api.getConfig() || this.defaultOptions;
    }

    getDefaultOptions() {
        return this.defaultOptions;
    }

    onEnable() {
        this.api.log('水印效果插件已启用');
        this.api.emit('effect:enabled', { id: this.api.id });
    }

    onDisable() {
        this.api.log('水印效果插件已禁用');
    }

    onUninstall() {
        this.api.log('水印效果插件已卸载');
    }
}

module.exports = WatermarkEffect;
