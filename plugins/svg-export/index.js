class SVGExport {
    constructor(api) {
        this.api = api;
        this.defaultOptions = {
            embedFonts: true,
            compress: false,
            includeMetadata: true
        };
    }

    async export(canvases, options) {
        this.api.log('开始导出SVG格式...');
        const config = this.api.getConfig();
        const opts = { ...this.defaultOptions, ...config, ...options };

        const results = [];

        for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            const svg = await this.canvasToSVG(canvas, opts, i);
            results.push({
                pageIndex: i,
                imageData: this.svgToDataURL(svg),
                svgContent: svg
            });

            this.api.setData(`page_${i}_exported`, Date.now());
        }

        this.api.log(`SVG导出完成，共 ${results.length} 页`);

        return {
            type: 'svg',
            pages: results,
            pageCount: results.length,
            options: opts
        };
    }

    async canvasToSVG(canvas, options, pageIndex) {
        const width = canvas.width;
        const height = canvas.height;

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

        if (options.includeMetadata) {
            const date = new Date().toISOString();
            svgContent += `
                <metadata>
                    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
                        <rdf:Description>
                            <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">手写图片生成器</dc:creator>
                            <dc:date xmlns:dc="http://purl.org/dc/elements/1.1/">${date}</dc:date>
                            <dc:description xmlns:dc="http://purl.org/dc/elements/1.1/">第 ${pageIndex + 1} 页</dc:description>
                        </rdf:Description>
                    </rdf:RDF>
                </metadata>
            `;
        }

        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png');

        svgContent += `<image width="${width}" height="${height}" href="${dataUrl}" />`;

        svgContent += '</svg>';

        return svgContent;
    }

    svgToDataURL(svgContent) {
        const encoded = encodeURIComponent(svgContent)
            .replace(/'/g, '%27')
            .replace(/"/g, '%22');
        return `data:image/svg+xml;charset=utf-8,${encoded}`;
    }

    getOptions() {
        return this.api.getConfig() || this.defaultOptions;
    }

    getDefaultOptions() {
        return this.defaultOptions;
    }

    getFileExtension() {
        return '.svg';
    }

    onEnable() {
        this.api.log('SVG导出插件已启用');
    }

    onDisable() {
        this.api.log('SVG导出插件已禁用');
    }
}

module.exports = SVGExport;
