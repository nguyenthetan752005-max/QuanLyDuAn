// Configuration for image filters and transforms
// Easily extensible: Just add a new object to these arrays to add a new control.

// Each filter declares how it maps to a CSS filter function via `css(value)`.
// Adding a new filter here automatically adds its slider, default, export support.
export const FILTER_CONFIG = [
    { id: 'brightness', label: 'Độ sáng', min: 0, max: 200, default: 100, unit: '%', css: v => `brightness(${v}%)` },
    { id: 'contrast', label: 'Tương phản', min: 0, max: 200, default: 100, unit: '%', css: v => `contrast(${v}%)` },
    { id: 'saturation', label: 'Độ bão hòa', min: 0, max: 200, default: 100, unit: '%', css: v => `saturate(${v}%)` },
    { id: 'hue', label: 'Sắc độ (Hue)', min: -180, max: 180, default: 0, unit: '°', css: v => `hue-rotate(${v}deg)` },
    { id: 'blur', label: 'Làm mờ', min: 0, max: 20, default: 0, unit: 'px', css: v => `blur(${v}px)` },
    { id: 'grayscale', label: 'Trắng đen', min: 0, max: 100, default: 0, unit: '%', css: v => `grayscale(${v}%)` },
    { id: 'sepia', label: 'Cổ điển (Sepia)', min: 0, max: 100, default: 0, unit: '%', css: v => `sepia(${v}%)` },
    { id: 'invert', label: 'Đảo màu', min: 0, max: 100, default: 0, unit: '%', css: v => `invert(${v}%)` }
];

// One-click filter presets. Values omitted fall back to each filter's default.
export const FILTER_PRESETS = [
    { id: 'none', label: 'Gốc', values: {} },
    { id: 'mono', label: 'Đen trắng', values: { grayscale: 100, contrast: 110 } },
    { id: 'vintage', label: 'Hoài cổ', values: { sepia: 60, saturation: 120, contrast: 95, brightness: 105 } },
    { id: 'warm', label: 'Ấm', values: { saturation: 130, hue: -10, brightness: 105 } },
    { id: 'cool', label: 'Lạnh', values: { saturation: 110, hue: 15, brightness: 102 } },
    { id: 'vivid', label: 'Rực rỡ', values: { saturation: 160, contrast: 120 } },
    { id: 'fade', label: 'Mờ phai', values: { saturation: 80, contrast: 90, brightness: 110 } },
    { id: 'invert', label: 'Âm bản', values: { invert: 100 } }
];

export const TRANSFORM_CONFIG = [
    { id: 'rotate', label: 'Xoay (Rotation)', min: 0, max: 360, default: 0, unit: '°' }
];

// Generates default state for a new image instance
export function getDefaultFilters() {
    const filters = {};
    FILTER_CONFIG.forEach(config => {
        filters[config.id] = config.default;
    });
    return filters;
}

export function getDefaultTransform() {
    const transform = { flipX: 1, flipY: 1 };
    TRANSFORM_CONFIG.forEach(config => {
        transform[config.id] = config.default;
    });
    return transform;
}

// Builds the CSS filter string from any configured filters (single source of truth).
// `blurScale` lets the export path scale blur with the output resolution.
export function getFilterCSSString(filters, blurScale = 1) {
    if (!filters) return '';
    return FILTER_CONFIG.map(config => {
        let v = (filters[config.id] !== undefined && filters[config.id] !== null)
            ? filters[config.id]
            : config.default;
        if (config.id === 'blur') v = v * blurScale;
        return config.css(v);
    }).join(' ');
}

export function getTransformCSSString(transform) {
    if (!transform) return '';
    return `rotate(${transform.rotate || 0}deg) scaleX(${transform.flipX || 1}) scaleY(${transform.flipY || 1})`;
}
