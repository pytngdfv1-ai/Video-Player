import { jsPDF } from 'jspdf';
import { Track } from '../types';

/**
 * Loads an image from URL and converts to base64 data URL.
 * If CORS prevents direct reading, falls back to a custom vector cassette cover canvas.
 */
async function getCoverDataUrl(coverUrl: string, track: Track): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 400, 400);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
          return;
        }
      } catch (err) {
        console.warn('Canvas CORS error, using fallback cover:', err);
      }
      resolve(createFallbackCover(track));
    };
    img.onerror = () => {
      resolve(createFallbackCover(track));
    };
    img.src = coverUrl;
    // Safety timeout in case image never loads
    setTimeout(() => {
      resolve(createFallbackCover(track));
    }, 2500);
  });
}

function createFallbackCover(track: Track): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;

  // Retro gradient background
  const grad = ctx.createLinearGradient(0, 0, 400, 400);
  grad.addColorStop(0, '#1c1917');
  grad.addColorStop(0.5, '#292524');
  grad.addColorStop(1, '#0c0a09');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 400);

  // Retro vinyl / cassette concentric rings
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 2;
  for (let r = 50; r < 180; r += 20) {
    ctx.beginPath();
    ctx.arc(200, 170, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Accent badge
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(40, 40, 8, 50);

  ctx.fillStyle = '#fafaf9';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(track.title.slice(0, 22), 60, 65);

  ctx.fillStyle = '#a8a29e';
  ctx.font = '16px sans-serif';
  ctx.fillText(track.artist.slice(0, 28), 60, 90);

  // Center cassette badge
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(200, 170, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RETRO CASSETTE', 200, 175);

  // Track info at bottom
  ctx.textAlign = 'left';
  ctx.fillStyle = '#78716c';
  ctx.font = '14px monospace';
  ctx.fillText(`${track.trackNumber} • ${track.album}`, 40, 340);
  ctx.fillText(`SIDE ${track.side} • ${track.year} • HI-FI STEREO`, 40, 365);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export async function generateTrackPDF(track: Track): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Header background bar (Vintage dark theme)
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent stripe
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 26, pageWidth, 2, 'F');

  // App & Track Header
  doc.setTextColor(250, 250, 250);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('YOUTUBE CASSETTE ARCHIVE', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(212, 212, 216);
  doc.text(`FICHA TÉCNICA Y LETRA DEL TEMA • ${track.trackNumber.toUpperCase()}`, margin, 18);

  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.text(`FECHA: ${today}`, pageWidth - margin - 35, 12);
  doc.text(`LADO: ${track.side} | ESTÉREO`, pageWidth - margin - 35, 18);

  // Load and embed cover image
  const coverDataUrl = await getCoverDataUrl(track.coverUrl, track);
  const coverSize = 46; // 46mm x 46mm
  doc.addImage(coverDataUrl, 'JPEG', margin, 34, coverSize, coverSize);

  // Cover frame
  doc.setDrawColor(217, 119, 6); // amber-600
  doc.setLineWidth(0.6);
  doc.rect(margin, 34, coverSize, coverSize);

  // Track Details next to cover
  const detailsX = margin + coverSize + 8;
  let currentY = 40;

  // Track Title
  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(track.title, detailsX, currentY);

  currentY += 7;
  // Artist
  doc.setTextColor(217, 119, 6); // amber-600
  doc.setFontSize(12);
  doc.text(track.artist, detailsX, currentY);

  currentY += 7;
  // Meta box table
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);

  const infoLines = [
    `Álbum: ${track.album}`,
    `Año de lanzamiento: ${track.year}`,
    `Género musical: ${track.genre}`,
    `Duración estimada: ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')} min`,
    `Ubicación en cinta: ${track.trackNumber} (Lado ${track.side})`,
  ];

  infoLines.forEach((line) => {
    doc.text(line, detailsX, currentY);
    currentY += 4.8;
  });

  // Notes section if exists
  if (track.customNotes) {
    currentY = Math.max(currentY + 2, 85);
    doc.setFillColor(244, 244, 245);
    doc.rect(margin, 85, contentWidth, 14, 'F');
    doc.setDrawColor(228, 228, 231);
    doc.rect(margin, 85, contentWidth, 14, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    doc.text('INFORMACIÓN Y NOTAS DEL TEMA:', margin + 3, 90);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91);
    const splitNotes = doc.splitTextToSize(track.customNotes, contentWidth - 6);
    doc.text(splitNotes, margin + 3, 95);
  }

  // Lyrics Section Title
  const lyricsStartY = track.customNotes ? 106 : 90;
  doc.setFillColor(245, 158, 11);
  doc.rect(margin, lyricsStartY, 4, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text('LETRA COMPLETA DEL TEMA', margin + 7, lyricsStartY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('Transcripción oficial verificada para reproducción sincronizada', margin + 75, lyricsStartY + 6);

  // Horizontal separator
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.4);
  doc.line(margin, lyricsStartY + 10, pageWidth - margin, lyricsStartY + 10);

  // Split lyrics into two columns to fit elegantly on the page
  const colWidth = (contentWidth - 10) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + 10;
  let textY = lyricsStartY + 16;
  const maxPageY = pageHeight - 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(39, 39, 42);

  const lines = track.lyrics.split('\n');
  let currentCol = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    // Check if we need to advance to column 2 or next page
    if (textY > maxPageY) {
      if (currentCol === 1) {
        currentCol = 2;
        textY = lyricsStartY + 16;
      } else {
        doc.addPage();
        currentCol = 1;
        textY = margin + 10;
      }
    }

    if (!rawLine) {
      textY += 3; // stanza spacing
      continue;
    }

    const currentX = currentCol === 1 ? col1X : col2X;
    
    // Check if it's chorus or special bracket
    if (rawLine.startsWith('[') || rawLine.startsWith('(') || rawLine.endsWith(':')) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(39, 39, 42);
    }

    const wrapped = doc.splitTextToSize(rawLine, colWidth);
    doc.text(wrapped, currentX, textY);
    textY += (wrapped.length * 4.2);
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(24, 24, 27);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    doc.text('YouTube Cassette Player • Edición de Coleccionista • Audio High Fidelity', margin, pageHeight - 5);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 5);
  }

  return doc;
}
