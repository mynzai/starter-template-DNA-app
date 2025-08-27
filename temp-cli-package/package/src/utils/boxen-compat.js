"use strict";
/**
 * @fileoverview Boxen compatibility layer for CommonJS builds
 * Provides a boxen-like interface using ASCII characters
 */
Object.defineProperty(exports, "__esModule", { value: true });
const borderStyles = {
    single: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│'
    },
    double: {
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        horizontal: '═',
        vertical: '║'
    },
    round: {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        horizontal: '─',
        vertical: '│'
    },
    bold: {
        topLeft: '┏',
        topRight: '┓',
        bottomLeft: '┗',
        bottomRight: '┛',
        horizontal: '━',
        vertical: '┃'
    },
    classic: {
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+',
        horizontal: '-',
        vertical: '|'
    }
};
function boxen(text, options = {}) {
    // Get border style
    const borderStyle = borderStyles[options.borderStyle] || borderStyles.single;
    // Parse padding
    let padTop = 0, padBottom = 0, padLeft = 1, padRight = 1;
    if (typeof options.padding === 'number') {
        padTop = padBottom = padLeft = padRight = options.padding;
    }
    else if (options.padding) {
        padTop = options.padding.top || 0;
        padBottom = options.padding.bottom || 0;
        padLeft = options.padding.left || 1;
        padRight = options.padding.right || 1;
    }
    // Parse margin
    let marginTop = 0, marginBottom = 0, marginLeft = 0, marginRight = 0;
    if (typeof options.margin === 'number') {
        marginTop = marginBottom = marginLeft = marginRight = options.margin;
    }
    else if (options.margin) {
        marginTop = options.margin.top || 0;
        marginBottom = options.margin.bottom || 0;
        marginLeft = options.margin.left || 0;
        marginRight = options.margin.right || 0;
    }
    // Split text into lines
    const lines = text.split('\n');
    // Calculate content width
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const contentWidth = options.width || maxLineLength + padLeft + padRight;
    const innerWidth = contentWidth - 2; // Account for borders
    // Apply text alignment
    const alignedLines = lines.map(line => {
        const lineLength = line.length;
        const totalPadding = innerWidth - lineLength;
        if (options.textAlignment === 'center') {
            const leftPad = Math.floor(totalPadding / 2);
            const rightPad = totalPadding - leftPad;
            return ' '.repeat(leftPad) + line + ' '.repeat(rightPad);
        }
        else if (options.textAlignment === 'right') {
            return ' '.repeat(totalPadding) + line;
        }
        else {
            return line + ' '.repeat(totalPadding);
        }
    });
    // Add vertical padding
    const paddedLines = [
        ...Array(padTop).fill(' '.repeat(innerWidth)),
        ...alignedLines,
        ...Array(padBottom).fill(' '.repeat(innerWidth))
    ];
    // Create the box
    let result = [];
    // Top margin
    for (let i = 0; i < marginTop; i++) {
        result.push('');
    }
    // Top border with optional title
    let topBorder = borderStyle.topLeft + borderStyle.horizontal.repeat(innerWidth) + borderStyle.topRight;
    if (options.title) {
        const title = ` ${options.title} `;
        const titleStart = options.titleAlignment === 'center' ? Math.floor((innerWidth - title.length) / 2) :
            options.titleAlignment === 'right' ? innerWidth - title.length - 1 : 1;
        topBorder = borderStyle.topLeft +
            borderStyle.horizontal.repeat(titleStart) +
            title +
            borderStyle.horizontal.repeat(innerWidth - titleStart - title.length) +
            borderStyle.topRight;
    }
    result.push(' '.repeat(marginLeft) + topBorder);
    // Content lines with borders
    paddedLines.forEach(line => {
        result.push(' '.repeat(marginLeft) + borderStyle.vertical + line + borderStyle.vertical);
    });
    // Bottom border
    result.push(' '.repeat(marginLeft) + borderStyle.bottomLeft + borderStyle.horizontal.repeat(innerWidth) + borderStyle.bottomRight);
    // Bottom margin
    for (let i = 0; i < marginBottom; i++) {
        result.push('');
    }
    return result.join('\n');
}
exports.default = boxen;
//# sourceMappingURL=boxen-compat.js.map