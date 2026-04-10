/**
 * SBTI Share Module — Thai Version
 * Handles: LINE share, Facebook share, Copy link, Save result image
 */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-share-line').addEventListener('click', shareLINE);
  document.getElementById('btn-share-fb').addEventListener('click', shareFacebook);
  document.getElementById('btn-share-copy').addEventListener('click', copyLink);
  document.getElementById('btn-share-save').addEventListener('click', saveImage);
});

// ── Share URL helpers ──────────────────────────────────
function getShareURL() {
  return window.location.href.split('?')[0];
}

function getShareText() {
  if (!state.result) return 'ลองทำ SBTI แบบทดสอบบุคลิกภาพแบบสัตว์ๆ กัน!';
  const type = state.result.finalType;
  return `กูทำ SBTI แล้ว กูเป็น ${type.code} — ${type.thaiName}! มาลองดูว่ามึงเป็นอะไร 👉`;
}

// ── LINE Share ─────────────────────────────────────────
function shareLINE() {
  const text = encodeURIComponent(getShareText() + '\n' + getShareURL());
  window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(getShareURL())}&text=${text}`, '_blank');
}

// ── Facebook Share ─────────────────────────────────────
function shareFacebook() {
  const url = encodeURIComponent(getShareURL());
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

// ── Copy Link ──────────────────────────────────────────
function copyLink() {
  const text = getShareText() + '\n' + getShareURL();
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-share-copy');
    const label = btn.querySelector('.share-label');
    const original = label.textContent;
    label.textContent = 'คัดลอกแล้ว!';
    btn.classList.add('copied');
    setTimeout(() => {
      label.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ── Save Result as Image (Canvas) ──────────────────────
function saveImage() {
  if (!state.result) return;

  const type = state.result.finalType;
  const levels = state.result.levels;
  const badge = state.result.badge;

  const canvas = document.createElement('canvas');
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#1a1a2e');
  bgGrad.addColorStop(1, '#16213e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Decorative accent line at top
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, '#667eea');
  topGrad.addColorStop(1, '#e94560');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 6);

  // SBTI header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px "Noto Sans Thai", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SBTI — แบบทดสอบบุคลิกภาพแบบสัตว์ๆ', W / 2, 80);

  // Type code (large)
  const codeGrad = ctx.createLinearGradient(W/2 - 200, 200, W/2 + 200, 200);
  codeGrad.addColorStop(0, '#667eea');
  codeGrad.addColorStop(1, '#e94560');
  ctx.fillStyle = codeGrad;
  ctx.font = 'bold 120px "Noto Sans Thai", monospace';
  ctx.fillText(type.code, W / 2, 260);

  // Thai name
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 56px "Noto Sans Thai", sans-serif';
  ctx.fillText(type.thaiName, W / 2, 340);

  // Match badge
  ctx.fillStyle = 'rgba(233, 69, 96, 0.15)';
  roundRect(ctx, W/2 - 300, 370, 600, 48, 24);
  ctx.fill();
  ctx.fillStyle = '#e94560';
  ctx.font = '24px "Noto Sans Thai", sans-serif';
  ctx.fillText(badge, W / 2, 402);

  // Intro phrase
  ctx.fillStyle = '#ccc';
  ctx.font = '32px "Noto Sans Thai", sans-serif';
  ctx.fillText(`"${type.intro}"`, W / 2, 480);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 520);
  ctx.lineTo(W - 100, 520);
  ctx.stroke();

  // 15 Dimensions
  ctx.fillStyle = '#888';
  ctx.font = '28px "Noto Sans Thai", sans-serif';
  ctx.fillText('วิเคราะห์ 15 มิติ', W / 2, 570);

  const startY = 610;
  const rowH = 70;
  const colW = W / 3;

  DIMENSION_ORDER.forEach((dim, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = colW * col + colW / 2;
    const y = startY + row * rowH;

    const level = levels[dim];
    const meta = DIMENSION_META[dim];

    // Dimension name
    ctx.fillStyle = '#aaa';
    ctx.font = '22px "Noto Sans Thai", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(meta.name, x, y);

    // Level badge
    const colors = { L: '#e94560', M: '#f59e0b', H: '#10b981' };
    ctx.fillStyle = colors[level] || '#888';
    ctx.font = 'bold 28px "Noto Sans Thai", sans-serif';
    ctx.fillText(level, x, y + 34);
  });

  // Footer
  const footerY = startY + 5 * rowH + 60;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(100, footerY, W - 200, 1);

  ctx.fillStyle = '#666';
  ctx.font = '24px "Noto Sans Thai", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SBTI — แบบทดสอบบุคลิกภาพแบบสัตว์ๆ', W / 2, footerY + 50);
  ctx.fillText('ลองเลย! → ' + getShareURL(), W / 2, footerY + 85);

  // Disclaimer
  ctx.fillStyle = '#444';
  ctx.font = '20px "Noto Sans Thai", sans-serif';
  ctx.fillText('แบบทดสอบนี้จัดทำขึ้นเพื่อความบันเทิงเท่านั้น', W / 2, footerY + 130);

  // Download
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SBTI-${type.code}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ── Canvas helper: rounded rectangle ───────────────────
function roundRect(ctx, x, y, w, h, r) {
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
