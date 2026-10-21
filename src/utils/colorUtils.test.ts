import { describe, it, expect } from 'vitest';
import { hexToRgb, interpolate, getPaletteColor } from './colorUtils';
import type { ColorPalette } from '../types';

describe('hexToRgb', () => {
    it('parses a 6-digit hex color with a leading #', () => {
        expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses a 6-digit hex color without a leading #', () => {
        expect(hexToRgb('00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('parses uppercase hex digits', () => {
        expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('parses mixed-case hex digits', () => {
        expect(hexToRgb('#AaBbCc')).toEqual({ r: 170, g: 187, b: 204 });
    });

    it('parses black and white', () => {
        expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
        expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('falls back to {r:0,g:0,b:0} for a non-hex string', () => {
        expect(hexToRgb('notacolor')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('falls back to {r:0,g:0,b:0} for an empty string', () => {
        expect(hexToRgb('')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('falls back to {r:0,g:0,b:0} for 3-digit shorthand hex (not supported by the regex)', () => {
        expect(hexToRgb('#fff')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('falls back to {r:0,g:0,b:0} for a hex string with too many digits', () => {
        expect(hexToRgb('#ff00001')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('falls back to {r:0,g:0,b:0} for a hex string containing non-hex characters', () => {
        expect(hexToRgb('#gg0000')).toEqual({ r: 0, g: 0, b: 0 });
    });
});

describe('interpolate', () => {
    it('returns color1 exactly at factor 0', () => {
        expect(interpolate('#000000', '#ffffff', 0)).toBe('rgb(0,0,0)');
    });

    it('returns color2 exactly at factor 1', () => {
        expect(interpolate('#000000', '#ffffff', 1)).toBe('rgb(255,255,255)');
    });

    it('rounds .5 up (Math.round behavior) at the midpoint between black and white', () => {
        // channel = 0 + 0.5 * (255 - 0) = 127.5 -> Math.round(127.5) = 128
        expect(interpolate('#000000', '#ffffff', 0.5)).toBe('rgb(128,128,128)');
    });

    it('interpolates a single non-zero channel at the midpoint', () => {
        // r: 0 + 0.5*(0-0) = 0
        // g: 0 + 0.5*(0-0) = 0
        // b: 0 + 0.5*(255-0) = 127.5 -> round -> 128
        expect(interpolate('#000000', '#0000ff', 0.5)).toBe('rgb(0,0,128)');
    });

    it('interpolates all three channels at a non-half factor', () => {
        // color1 = #102030 -> r:16, g:32, b:48
        // color2 = #504060 -> r:80, g:64, b:96
        // factor 0.25:
        // r: 16 + 0.25*(80-16) = 16 + 16 = 32
        // g: 32 + 0.25*(64-32) = 32 + 8 = 40
        // b: 48 + 0.25*(96-48) = 48 + 12 = 60
        expect(interpolate('#102030', '#504060', 0.25)).toBe('rgb(32,40,60)');
    });

    it('extrapolates for a factor outside [0,1]', () => {
        // color1 = #000000 (0,0,0), color2 = #0a0a0a (10,10,10)
        // factor 2: channel = 0 + 2*(10-0) = 20
        expect(interpolate('#000000', '#0a0a0a', 2)).toBe('rgb(20,20,20)');
    });

    it('treats an invalid hex color as black (0,0,0) via hexToRgb fallback', () => {
        // color1 invalid -> {0,0,0}; color2 = #ffffff -> {255,255,255}; factor 0.2
        // channel = 0 + 0.2*(255-0) = 51
        expect(interpolate('notacolor', '#ffffff', 0.2)).toBe('rgb(51,51,51)');
    });
});

describe('getPaletteColor', () => {
    const palettes: ColorPalette[] = ['standard', 'viridis', 'magma', 'cividis', 'plasma'];
    const rgbFormat = /^rgb\(\d+,\d+,\d+\)$/;
    const hexFormat = /^#[0-9a-f]{6}$/i;

    describe.each(palettes)('palette "%s"', (palette) => {
        it.each([0, 0.5, 1])('returns a syntactically valid color string for value %s', (value) => {
            const result = getPaletteColor(value, palette);
            if (palette === 'standard') {
                expect(result).toMatch(hexFormat);
            } else {
                expect(result).toMatch(rgbFormat);
            }
        });
    });

    it('returns the exact #cccccc fallback for NaN with the "standard" palette', () => {
        expect(getPaletteColor(NaN, 'standard')).toBe('#cccccc');
    });

    it('returns the exact #cccccc fallback for NaN with an unrecognized palette value', () => {
        expect(getPaletteColor(NaN, 'not-a-real-palette' as ColorPalette)).toBe('#cccccc');
    });

    it('falls back to the hslToRgb-derived hex string for an unrecognized palette value with a valid number', () => {
        const result = getPaletteColor(0.5, 'not-a-real-palette' as ColorPalette);
        expect(result).toMatch(hexFormat);
        // The fallback branch at the bottom uses the same formula as 'standard',
        // so the two should produce identical output for the same input value.
        expect(result).toBe(getPaletteColor(0.5, 'standard'));
    });

    it('cividis at value 0 matches interpolate across the full #002051 -> #fdea45 range', () => {
        // #002051 -> r:0, g:32, b:81; at factor 0 this is just the start color.
        expect(getPaletteColor(0, 'cividis')).toBe('rgb(0,32,81)');
        expect(getPaletteColor(0, 'cividis')).toBe(interpolate('#002051', '#fdea45', 0));
    });

    it('cividis at value 1 matches the exact #fdea45 endpoint', () => {
        // #fdea45 -> r:253, g:234, b:69; at factor 1 this is just the end color.
        expect(getPaletteColor(1, 'cividis')).toBe('rgb(253,234,69)');
        expect(getPaletteColor(1, 'cividis')).toBe(interpolate('#002051', '#fdea45', 1));
    });

    it('cividis at value 0.5 matches a direct interpolate call across the whole range', () => {
        expect(getPaletteColor(0.5, 'cividis')).toBe(interpolate('#002051', '#fdea45', 0.5));
    });

    describe('viridis quartile boundaries match the piecewise anchors', () => {
        it('value 0 matches the first anchor pair at factor 0', () => {
            expect(getPaletteColor(0, 'viridis')).toBe(interpolate('#440154', '#3b528b', 0));
        });

        it('value just under 0.25 uses the first anchor pair', () => {
            expect(getPaletteColor(0.2, 'viridis')).toBe(interpolate('#440154', '#3b528b', 0.2 * 4));
        });

        it('value exactly 0.25 switches to the second anchor pair', () => {
            expect(getPaletteColor(0.25, 'viridis')).toBe(interpolate('#3b528b', '#21918c', (0.25 - 0.25) * 4));
        });

        it('value exactly 0.5 switches to the third anchor pair', () => {
            expect(getPaletteColor(0.5, 'viridis')).toBe(interpolate('#21918c', '#5ec962', (0.5 - 0.5) * 4));
        });

        it('value exactly 0.75 switches to the fourth anchor pair', () => {
            expect(getPaletteColor(0.75, 'viridis')).toBe(interpolate('#5ec962', '#fde725', (0.75 - 0.75) * 4));
        });

        it('value 1 matches the fourth anchor pair at its end', () => {
            expect(getPaletteColor(1, 'viridis')).toBe(interpolate('#5ec962', '#fde725', (1 - 0.75) * 4));
        });
    });

    describe('magma and plasma piecewise interpolation at a mid-quartile sample', () => {
        it('magma at 0.6 falls in the third quartile and matches its anchor pair', () => {
            expect(getPaletteColor(0.6, 'magma')).toBe(interpolate('#b73779', '#fc8961', (0.6 - 0.5) * 4));
        });

        it('plasma at 0.9 falls in the fourth quartile and matches its anchor pair', () => {
            expect(getPaletteColor(0.9, 'plasma')).toBe(interpolate('#f89540', '#f0f921', (0.9 - 0.75) * 4));
        });
    });
});
