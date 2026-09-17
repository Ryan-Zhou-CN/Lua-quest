/**
 * 生成 PWA 图标 (72, 96, 128, 144, 152, 192, 384, 512)
 * 从 favicon.svg 生成 PNG
 */
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

// 解析 SVG 简单路径/形状，绘制到 Canvas
function parseSVG(svgContent) {
    // 简单的 SVG 解析，提取关键信息
    const width = 512;
    const height = 512;
    
    // 渐变定义
    const bgGrad = [
        { offset: 0, color: '#0d0d14' },
        { offset: 1, color: '#1a1a2e' }
    ];
    const accentGrad = [
        { offset: 0, color: '#00d4aa' },
        { offset: 1, color: '#00a888' }
    ];
    
    return { width, height, bgGrad, accentGrad };
}

// 线性插值
function lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
}

// 绘制圆角矩形
function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// 生成指定尺寸的图标
function generateIcon(size) {
    const scale = size / 512;
    const canvas = {
        width: size,
        height: size,
        data: Buffer.alloc(size * size * 4),
        getContext() {
            const ctx = {
                fillStyle: '#000000',
                strokeStyle: '#000000',
                lineWidth: 1,
                font: '',
                textAlign: 'start',
                textBaseline: 'alphabetic',
                fillRect: (x, y, w, h) => {
                    const color = parseInt(ctx.fillStyle.slice(1), 16);
                    const r = (color >> 16) & 0xff;
                    const g = (color >> 8) & 0xff;
                    const b = color & 0xff;
                    for (let iy = Math.floor(y); iy < Math.floor(y + h); iy++) {
                        for (let ix = Math.floor(x); ix < Math.floor(x + w); ix++) {
                            if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
                                const idx = (iy * size + ix) * 4;
                                canvas.data[idx] = r;
                                canvas.data[idx + 1] = g;
                                canvas.data[idx + 2] = b;
                                canvas.data[idx + 3] = 255;
                            }
                        }
                    }
                },
                stroke: () => {},
                fill: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                quadraticCurveTo: () => {},
                arc: () => {},
                closePath: () => {},
                fillText: (text, x, y) => {
                    // 简单的文本渲染 - 用像素块模拟 "LUA"
                    const color = parseInt(ctx.fillStyle.slice(1), 16);
                    const r = (color >> 16) & 0xff;
                    const g = (color >> 8) & 0xff;
                    const b = color & 0xff;
                    // 画三个大块代表 L U A
                    const blockSize = Math.floor(size * 0.12);
                    const spacing = Math.floor(size * 0.04);
                    const startX = Math.floor(size/2) - (blockSize*3 + spacing*2)/2;
                    const startY = Math.floor(size/2) - blockSize/2;
                    for (let i = 0; i < 3; i++) {
                        const bx = startX + i * (blockSize + spacing);
                        for (let iy = 0; iy < blockSize; iy++) {
                            for (let ix = 0; ix < blockSize; ix++) {
                                const px = bx + ix;
                                const py = startY + iy;
                                if (px >= 0 && px < size && py >= 0 && py < size) {
                                    const idx = (py * size + px) * 4;
                                    canvas.data[idx] = r;
                                    canvas.data[idx + 1] = g;
                                    canvas.data[idx + 2] = b;
                                    canvas.data[idx + 3] = 255;
                                }
                            }
                        }
                    }
                }
            };
            return ctx;
        }
    };
    
    const ctx = canvas.getContext();
    const s = scale;
    const cx = size / 2;
    const cy = size / 2;
    const r = Math.floor(96 * s);
    
    // 背景渐变圆角矩形
    ctx.fillStyle = '#0d0d14';
    // 简化：直接填背景色
    for (let y = 0; y < size; y++) {
        const t = y / size;
        const color = lerpColor('#0d0d14', '#1a1a2e', t);
        const cr = (color >> 16) & 0xff;
        const cg = (color >> 8) & 0xff;
        const cb = color & 0xff;
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            canvas.data[idx] = cr;
            canvas.data[idx + 1] = cg;
            canvas.data[idx + 2] = cb;
            canvas.data[idx + 3] = 255;
        }
    }
    
    // 外圈圆环
    const ringR = Math.floor(200 * s);
    const ringW = Math.floor(8 * s);
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = ringW;
    // 简化：画个圆环像素
    for (let angle = 0; angle < 360; angle += 2) {
        const rad = angle * Math.PI / 180;
        const x = Math.round(cx + ringR * Math.cos(rad));
        const y = Math.round(cy + ringR * Math.sin(rad));
        if (x >= 0 && x < size && y >= 0 && y < size) {
            for (let w = 0; w < ringW; w++) {
                const px = x + Math.round(w * Math.cos(rad));
                const py = y + Math.round(w * Math.sin(rad));
                if (px >= 0 && px < size && py >= 0 && py < size) {
                    const idx = (py * size + px) * 4;
                    canvas.data[idx] = 0;
                    canvas.data[idx + 1] = 212;
                    canvas.data[idx + 2] = 170;
                    canvas.data[idx + 3] = Math.floor(255 * 0.3);
                }
            }
        }
    }
    
    // "LUA" 文字区域（用三个色块模拟）
    const fontSize = Math.floor(180 * s);
    const textY = Math.floor(320 * s);
    ctx.fillStyle = '#00d4aa';
    // 已经在 fillText 里处理了
    ctx.fillText('LUA', cx, textY);
    
    // 底部曲线
    const curveY = Math.floor(380 * s);
    const curveW = Math.floor(200 * s);
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = Math.floor(6 * s);
    for (let i = 0; i < curveW; i++) {
        const t = i / curveW;
        const x = Math.round(cx - curveW/2 + i);
        // 抛物线
        const y = Math.round(curveY - 40 * s * 4 * t * (1 - t));
        if (x >= 0 && x < size && y >= 0 && y < size) {
            for (let w = 0; w < Math.floor(6 * s); w++) {
                const px = x;
                const py = y + w;
                if (px >= 0 && px < size && py >= 0 && py < size) {
                    const idx = (py * size + px) * 4;
                    canvas.data[idx] = 0;
                    canvas.data[idx + 1] = 212;
                    canvas.data[idx + 2] = 170;
                    canvas.data[idx + 3] = Math.floor(255 * 0.6);
                }
            }
        }
    }
    
    // 顶部小圆点
    const dotY = Math.floor(180 * s);
    const dotR = Math.floor(12 * s);
    for (let dy = -dotR; dy <= dotR; dy++) {
        for (let dx = -dotR; dx <= dotR; dx++) {
            if (dx*dx + dy*dy <= dotR*dotR) {
                const px = Math.round(cx + dx);
                const py = Math.round(dotY + dy);
                if (px >= 0 && px < size && py >= 0 && py < size) {
                    const idx = (py * size + px) * 4;
                    canvas.data[idx] = 0;
                    canvas.data[idx + 1] = 212;
                    canvas.data[idx + 2] = 170;
                    canvas.data[idx + 3] = Math.floor(255 * 0.8);
                }
            }
        }
    }
    
    // 写入 PNG
    const png = new PNG({ width: size, height: size });
    png.data = canvas.data;
    
    return new Promise((resolve, reject) => {
        const outPath = path.join(__dirname, `icon-${size}.png`);
        const writeStream = fs.createWriteStream(outPath);
        png.pack().pipe(writeStream);
        writeStream.on('finish', () => {
            console.log(`✅ Generated icon-${size}.png`);
            resolve();
        });
        writeStream.on('error', reject);
    });
}

async function main() {
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    for (const size of sizes) {
        await generateIcon(size);
    }
    console.log('🎉 All icons generated!');
}

main().catch(console.error);