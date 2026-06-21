const fs = require('fs');
const path = require('path');

function packagePlugin(pluginDir, outputDir = 'dist') {
    const pluginName = path.basename(pluginDir);
    const manifestPath = path.join(pluginDir, 'manifest.json');
    const codePath = path.join(pluginDir, 'index.js');

    if (!fs.existsSync(manifestPath)) {
        throw new Error(`找不到清单文件: ${manifestPath}`);
    }
    if (!fs.existsSync(codePath)) {
        throw new Error(`找不到代码文件: ${codePath}`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const code = fs.readFileSync(codePath, 'utf-8');

    const packageData = { manifest, code };

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${pluginName}-${manifest.version}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(packageData, null, 2));

    console.log(`✓ 插件已打包: ${outputPath}`);
    console.log(`  插件ID: ${manifest.id}`);
    console.log(`  版本: ${manifest.version}`);
    console.log(`  类型: ${manifest.type}`);
    console.log(`  大小: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

    return outputPath;
}

function packageAllPlugins(pluginsDir = './plugins', outputDir = './plugins/dist') {
    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    const pluginDirs = entries
        .filter(e => e.isDirectory() && e.name !== 'dist')
        .map(e => path.join(pluginsDir, e.name));

    console.log(`发现 ${pluginDirs.length} 个插件，开始打包...\n`);

    const results = [];
    for (const dir of pluginDirs) {
        try {
            const output = packagePlugin(dir, outputDir);
            results.push({ success: true, plugin: path.basename(dir), output });
        } catch (error) {
            console.error(`✗ 打包失败[${path.basename(dir)}]: ${error.message}`);
            results.push({ success: false, plugin: path.basename(dir), error: error.message });
        }
    }

    console.log(`\n完成: ${results.filter(r => r.success).length}/${results.length} 成功`);
    return results;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length > 0) {
        packagePlugin(args[0], args[1]);
    } else {
        packageAllPlugins();
    }
}

module.exports = { packagePlugin, packageAllPlugins };
