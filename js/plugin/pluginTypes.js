const PluginTypes = {
    RENDER_EFFECT: 'render_effect',
    EXPORT_FORMAT: 'export_format',
    INTERACTIVE_COMPONENT: 'interactive_component',
    ALL: ['render_effect', 'export_format', 'interactive_component']
};

const PluginManifestSchema = {
    type: 'object',
    required: ['id', 'name', 'version', 'type', 'description', 'author', 'hostVersion'],
    properties: {
        id: { type: 'string', pattern: '^[a-z0-9-]+$' },
        name: { type: 'string', minLength: 1 },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        type: { enum: PluginTypes.ALL },
        description: { type: 'string', minLength: 1 },
        author: {
            type: 'object',
            required: ['name'],
            properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                url: { type: 'string' }
            }
        },
        hostVersion: {
            type: 'string',
            description: '支持的宿主系统版本范围，如 ">=1.0.0 <2.0.0"'
        },
        icon: { type: 'string' },
        homepage: { type: 'string' },
        repository: { type: 'string' },
        license: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
        dependencies: {
            type: 'object',
            additionalProperties: { type: 'string' }
        },
        permissions: {
            type: 'array',
            items: {
                enum: ['read_config', 'write_config', 'network', 'storage', 'canvas_access', 'dom_access']
            }
        }
    }
};

const RenderEffectInterface = {
    apply: 'function(ctx, options, seed)',
    getOptions: 'function()',
    getDefaultOptions: 'function()'
};

const ExportFormatInterface = {
    export: 'function(canvases, options)',
    getOptions: 'function()',
    getDefaultOptions: 'function()',
    getFileExtension: 'function()'
};

const InteractiveComponentInterface = {
    mount: 'function(container, api)',
    unmount: 'function()',
    getOptions: 'function()',
    getDefaultOptions: 'function()'
};

const PluginStatus = {
    PENDING: 'pending',
    LOADED: 'loaded',
    ACTIVE: 'active',
    ERROR: 'error',
    DISABLED: 'disabled',
    INCOMPATIBLE: 'incompatible'
};

if (typeof window !== 'undefined') {
    window.PluginTypes = PluginTypes;
    window.PluginManifestSchema = PluginManifestSchema;
    window.RenderEffectInterface = RenderEffectInterface;
    window.ExportFormatInterface = ExportFormatInterface;
    window.InteractiveComponentInterface = InteractiveComponentInterface;
    window.PluginStatus = PluginStatus;
}
