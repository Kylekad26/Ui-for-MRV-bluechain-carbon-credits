/**
 * BlueChain Certificate Generator (cert.js)
 *
 * Generates a professional PDF carbon credit certificate using jsPDF.
 * All values come from the live /api/estimate + /api/verify-and-mint response data.
 *
 * Public API:
 *   BlueChainCert.generate(mintResult, estimateData, ownerData) → void (triggers download)
 *   BlueChainCert.canGenerate(mintResult, estimateData)         → boolean
 *
 * Dependencies (loaded from CDN in index.html):
 *   - jsPDF  (https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js)
 *   - QRCode (https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js)
 */

const BlueChainCert = (() => {

    // ── Palette (matches BlueChain design system) ──────────────────────────────
    const C = {
        forest:   [7,   20,  15],    // #07140F
        panel:    [11,  31,  23],    // #0B1F17
        border:   [18,  60,  42],    // #123C2A
        green:    [114, 168, 74],    // #72A84A
        sage:     [141, 168, 152],   // #8DA898
        teal:     [121, 184, 200],   // #79B8C8
        white:    [243, 241, 232],   // #F3F1E8
        dim:      [80,  100, 88],    // muted text
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    function rgb(arr) { return { r: arr[0], g: arr[1], b: arr[2] }; }
    function setFill(doc, arr)   { doc.setFillColor(arr[0], arr[1], arr[2]); }
    function setDraw(doc, arr)   { doc.setDrawColor(arr[0], arr[1], arr[2]); }
    function setFont(doc, arr)   { doc.setTextColor(arr[0], arr[1], arr[2]); }

    function num(v, dp = 2) {
        if (v === undefined || v === null || isNaN(Number(v))) return 'N/A';
        return Number(v).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    }

    function genCertId(siteId, txHash) {
        const raw = (siteId || '') + (txHash || '') + Date.now();
        let h = 0;
        for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0; }
        const hex = Math.abs(h).toString(16).toUpperCase().padStart(6, '0');
        return 'BC-CERT-' + new Date().getFullYear() + '-' + hex;
    }

    // ── QR generation via hidden canvas ───────────────────────────────────────
    async function generateQRDataUrl(text) {
        return new Promise((resolve, reject) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:128px;height:128px;';
            document.body.appendChild(wrapper);

            try {
                new QRCode(wrapper, {
                    text: text,
                    width: 128,
                    height: 128,
                    colorDark: '#07140F',
                    colorLight: '#F3F1E8',
                    correctLevel: QRCode.CorrectLevel.M
                });

                // QRCode renders async — wait a tick
                setTimeout(() => {
                    const canvas = wrapper.querySelector('canvas');
                    const img    = wrapper.querySelector('img');
                    let dataUrl;
                    if (canvas) {
                        dataUrl = canvas.toDataURL('image/png');
                    } else if (img) {
                        dataUrl = img.src;
                    } else {
                        dataUrl = null;
                    }
                    document.body.removeChild(wrapper);
                    resolve(dataUrl);
                }, 300);
            } catch (e) {
                document.body.removeChild(wrapper);
                reject(e);
            }
        });
    }

    // ── Pixel mangrove art (tiny rasterized look via rectangles) ──────────────
    function drawMangroveArt(doc, x, y, scale = 1) {
        // Simplified pixel art: stem + leaf clusters
        const px = (n) => n * scale;
        const blocks = [
            // trunk
            [1, 5], [1, 4], [1, 3], [1, 6],
            [2, 5], [2, 4], [2, 3],
            // left roots
            [0, 7], [0, 8],
            // right roots
            [3, 7], [3, 8],
            // canopy left
            [0, 2], [0, 1],
            [1, 1], [1, 0],
            // canopy right
            [2, 1], [2, 0],
            [3, 2], [3, 1],
            // extra leaves
            [-1, 2], [4, 2],
        ];
        setFill(doc, C.green);
        blocks.forEach(([bx, by]) => {
            doc.rect(x + px(bx * 2), y + px(by * 2), px(2), px(2), 'F');
        });
    }

    // ── Repeating pixel top bar ────────────────────────────────────────────────
    function drawPixelBar(doc, y, pageW) {
        const blockW = 4, gap = 2;
        let x = 0;
        let toggle = true;
        while (x < pageW) {
            setFill(doc, toggle ? C.green : C.border);
            doc.rect(x, y, blockW, 2, 'F');
            x += blockW + gap;
            toggle = !toggle;
        }
    }

    // ── Key-value row helper ───────────────────────────────────────────────────
    function dataRow(doc, label, value, y, x1, x2, colW, rowH, even) {
        if (even) {
            setFill(doc, [14, 38, 28]);
            doc.rect(x1, y - 3, colW, rowH, 'F');
        }
        setFont(doc, C.sage);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(label, x1 + 3, y + 3);

        setFont(doc, C.white);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(String(value ?? 'N/A'), x2, y + 3, { maxWidth: colW - x2 + x1 - 5 });

        return y + rowH;
    }

    // ── Main generate function ─────────────────────────────────────────────────
    async function generate(mintResult, estimateData, ownerData) {
        if (!window.jspdf) {
            alert('PDF library not loaded. Please ensure jsPDF CDN script is included.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();

        // ── Background ─────────────────────────────────────────────────────────
        setFill(doc, C.forest);
        doc.rect(0, 0, pageW, pageH, 'F');

        // ── Outer border ───────────────────────────────────────────────────────
        setDraw(doc, C.border);
        doc.setLineWidth(0.4);
        doc.rect(8, 6, pageW - 16, pageH - 12);

        // ── Inner accent border ────────────────────────────────────────────────
        setDraw(doc, C.green);
        doc.setLineWidth(0.15);
        doc.rect(10, 8, pageW - 20, pageH - 16);

        // ── Header panel ───────────────────────────────────────────────────────
        setFill(doc, C.panel);
        doc.rect(10, 8, pageW - 20, 38, 'F');

        // Bottom border line of header
        setDraw(doc, C.border);
        doc.setLineWidth(0.3);
        doc.line(10, 46, pageW - 10, 46);

        // BLUECHAIN wordmark (left-aligned, no pixel art)
        setFont(doc, C.white);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('BLUE', 16, 22);
        setFont(doc, C.green);
        doc.text('CHAIN', 16 + doc.getTextWidth('BLUE') + 1, 22);

        // Tagline
        setFont(doc, C.sage);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Carbon intelligence. Verified impact.', 16, 28);

        // Decorative green accent line
        setDraw(doc, C.green);
        doc.setLineWidth(0.5);
        doc.line(16, 31, 80, 31);

        // TESTNET badge (if mintResult is mock)
        const isMock = !mintResult.tx_hash || mintResult.tx_hash.startsWith('0x' + 'a'.repeat(10));
        if (mintResult.status?.includes('mock') || isMock) {
            setFill(doc, [40, 30, 10]);
            doc.roundedRect(pageW - 45, 12, 32, 8, 1.5, 1.5, 'F');
            setFont(doc, [245, 161, 61]);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('TESTNET', pageW - 38, 17, { align: 'center' });
        }

        // Certificate title
        setFont(doc, C.green);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('CARBON PROJECT CERTIFICATE', pageW / 2, 34, { align: 'center' });
        setFont(doc, C.sage);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Sundarbans Mangrove Ecosystem · Blockchain Verified', pageW / 2, 41, { align: 'center' });

        // ── Certificate ID + Date row ──────────────────────────────────────────
        const certId   = genCertId(estimateData?.site_id, mintResult?.tx_hash);
        const certDate = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

        setFill(doc, C.border);
        doc.rect(10, 50, pageW - 20, 10, 'F');

        setFont(doc, C.sage);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('CERTIFICATE ID', 15, 55.5);
        setFont(doc, C.green);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(certId, 15, 58.5);

        setFont(doc, C.sage);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('ISSUED', pageW - 15, 55.5, { align: 'right' });
        setFont(doc, C.white);
        doc.setFontSize(7.5);
        doc.text(certDate, pageW - 15, 58.5, { align: 'right' });

        // ── Two-column data table ──────────────────────────────────────────────
        const col1X   = 10;
        const col2X   = pageW / 2 + 2;
        const colW    = pageW / 2 - 12;
        const rowH    = 10;
        const startY  = 64;

        const e = estimateData || {};
        const m = mintResult   || {};
        const o = ownerData    || {};

        const col1Data = [
            ['PROJECT SITE ID',      e.site_id || 'N/A'],
            ['PROJECT OWNER',        o.walletAddress || 'N/A'],
            ['ORGANIZATION',         o.organization || 'N/A'],
            ['PROJECT AREA',         num(e.area_hectares || o.area_hectares, 2) + ' ha'],
            ['LATITUDE',             num(e.latitude || o.latitude, 4) + '°'],
            ['LONGITUDE',            num(e.longitude || o.longitude, 4) + '°'],
            ['TYPOLOGY',             'Sundarbans Mangrove'],
            ['SATELLITE SCENE ID',   e.satellite_meta?.scene_id || 'N/A'],
        ];

        const col2Data = [
            ['NDVI',                 num(e.NDVI, 4)],
            ['NDVI SOURCE',          e.ndvi_source || 'N/A'],
            ['CARBON DENSITY',       num(e.carbon_density_tC_ha, 2) + ' tC/ha'],
            ['ABOVE-GROUND (AGB)',   num(e.aboveground_biomass_tC, 2) + ' tC'],
            ['SOIL ORGANIC (SOC)',   num(e.soil_organic_carbon_tC, 2) + ' tC'],
            ['TOTAL CARBON STOCK',   num(e.total_carbon_stock_tC, 2) + ' tC'],
            ['BCO2 CREDITS',         num(e.predicted_credits, 2) + ' tCO₂e'],
            ['CREDIT SCORE / GRADE', (e.credit_score?.total_score || 'N/A') + ' / 100  ·  ' + (e.credit_score?.grade || '')],
        ];

        let y1 = startY;
        let y2 = startY;
        col1Data.forEach(([label, val], i) => {
            y1 = dataRow(doc, label, val, y1, col1X, col1X + 35, colW, rowH, i % 2 === 0);
        });
        col2Data.forEach(([label, val], i) => {
            y2 = dataRow(doc, label, val, y2, col2X, col2X + 35, colW, rowH, i % 2 === 0);
        });

        const afterTable = Math.max(y1, y2) + 4;

        // ── Market tier bar ───────────────────────────────────────────────────
        setFill(doc, C.panel);
        doc.rect(10, afterTable, pageW - 20, 12, 'F');
        setFont(doc, C.sage);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('MARKET TIER', 15, afterTable + 5.5);
        setFont(doc, C.green);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(e.credit_score?.market_tier || 'N/A', 15, afterTable + 10);

        // ── Blockchain Proof Panel ────────────────────────────────────────────
        const panelY = afterTable + 20;
        const panelH = 46;
        
        // Panel Background
        setFill(doc, [10, 28, 20]);
        doc.rect(10, panelY, pageW - 20, panelH, 'F');
        
        // Panel Border
        setDraw(doc, C.border);
        doc.setLineWidth(0.3);
        doc.rect(10, panelY, pageW - 20, panelH);

        // Verification Status Chip (Moved into the panel)
        const isVerified = m.status && !m.status.includes('fail');
        setFill(doc, isVerified ? C.border : [60, 20, 20]);
        doc.roundedRect(15, panelY + 6, 30, 6, 1, 1, 'F');
        setFont(doc, isVerified ? C.green : [228, 80, 80]);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(isVerified ? 'VERIFIED' : 'PENDING', 30, panelY + 10.2, { align: 'center' });

        // TX Hash
        setFont(doc, C.sage);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.text('TRANSACTION HASH', 15, panelY + 20);
        setFont(doc, C.teal);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        const txStr = m.tx_hash || 'N/A';
        doc.text(txStr.length > 60 ? txStr.substring(0, 60) + '...' : txStr, 15, panelY + 24);

        // IPFS Proof Hash
        setFont(doc, C.sage);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.text('IPFS METADATA HASH', 15, panelY + 32);
        setFont(doc, C.teal);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        const ipfsStr = m.ipfs_proof || 'N/A';
        doc.text(ipfsStr.length > 60 ? ipfsStr.substring(0, 60) + '...' : ipfsStr, 15, panelY + 36);

        // ── QR Code inside the panel (Right aligned) ──────────────────────────
        const siteId  = e.site_id || 'UNKNOWN';
        const verifyUrl = window.location.origin + '/verify/' + siteId;
        const qrSize = 34;
        const qrX = pageW - 15 - qrSize;
        const qrY = panelY + 6;

        try {
            const qrDataUrl = await generateQRDataUrl(verifyUrl);
            if (qrDataUrl) {
                // QR panel white background
                setFill(doc, C.white);
                doc.rect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 3, 'F');
                doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

                setFont(doc, C.sage);
                doc.setFontSize(6);
                doc.setFont('helvetica', 'normal');
                doc.text('Scan to verify on-chain', qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' });
            }
        } catch (e2) {
            console.warn('[Cert] QR generation failed:', e2);
        }

        // ── Bottom separator ──────────────────────────────────────────────
        const artY = pageH - 30;
        setDraw(doc, C.border);
        doc.setLineWidth(0.3);
        doc.line(10, artY, pageW - 10, artY);
        // Solid green accent line
        setDraw(doc, C.green);
        doc.setLineWidth(0.8);
        doc.line(10, artY + 1.5, 50, artY + 1.5);

        // ── Footer ────────────────────────────────────────────────────────────
        const footerY = pageH - 18;
        setDraw(doc, C.border);
        doc.setLineWidth(0.2);
        doc.line(10, footerY, pageW - 10, footerY);

        setFont(doc, C.sage);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('BLUECHAIN — Carbon intelligence. Verified impact.', pageW / 2, footerY + 5, { align: 'center' });
        doc.text('This certificate was generated by the BlueChain MRV platform.', pageW / 2, footerY + 9, { align: 'center' });
        if (mintResult.status?.includes('mock') || isMock) {
            setFont(doc, [245, 161, 61]);
            doc.text('TESTNET — Not a production carbon credit certificate.', pageW / 2, footerY + 13, { align: 'center' });
        } else {
            setFont(doc, C.dim);
            doc.text(certId + ' · ' + certDate, pageW / 2, footerY + 13, { align: 'center' });
        }

        // Pixel bar bottom
        drawPixelBar(doc, pageH - 4, pageW);

        // ── Save ──────────────────────────────────────────────────────────────
        const filename = 'BlueChain-Certificate-' + siteId + '-' + certId + '.pdf';
        doc.save(filename);
        return filename;
    }

    // ── canGenerate guard ─────────────────────────────────────────────────────
    function canGenerate(mintResult, estimateData) {
        return !!(
            mintResult &&
            mintResult.tx_hash &&
            estimateData &&
            estimateData.site_id &&
            estimateData.predicted_credits
        );
    }

    return { generate, canGenerate };
})();
