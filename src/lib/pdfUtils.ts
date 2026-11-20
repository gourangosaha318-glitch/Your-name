import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PdfExportOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  title?: string;
  scale?: number;
}

/**
 * Helper to resolve modern CSS color functions (oklch, oklab, color-mix, lab, lch)
 * into standard rgb/rgba strings that html2canvas v1.4.1 can safely parse.
 */
function createColorNormalizer() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');

  return (cssColor: string): string => {
    if (!cssColor || cssColor === 'none' || cssColor === 'transparent') {
      return cssColor;
    }
    if (
      !cssColor.includes('oklch') &&
      !cssColor.includes('oklab') &&
      !cssColor.includes('color-mix') &&
      !cssColor.includes('lab(') &&
      !cssColor.includes('lch(')
    ) {
      return cssColor;
    }

    if (!ctx) return '#1c1917';
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000000';
      ctx.fillStyle = cssColor;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      const a = Number((data[3] / 255).toFixed(3));
      if (a === 0) return 'transparent';
      if (a === 1) return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
      return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${a})`;
    } catch {
      return '#1c1917';
    }
  };
}

/**
 * Inline computed RGB colors & unclip nested scroll containers in cloned DOM
 * so html2canvas renders full tables cleanly without crashing on Tailwind v4 oklch().
 */
function sanitizeClonedStylesForCanvas(
  originalRoot: HTMLElement,
  clonedRoot: HTMLElement,
  clonedDoc: Document
) {
  const normalizeColor = createColorNormalizer();

  const colorProps = [
    'color',
    'backgroundColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'textDecorationColor',
    'fill',
    'stroke',
  ] as const;

  const origElements = [originalRoot, ...Array.from(originalRoot.querySelectorAll('*'))];
  const clonedElements = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll('*'))];

  const len = Math.min(origElements.length, clonedElements.length);
  for (let i = 0; i < len; i++) {
    const origEl = origElements[i] as HTMLElement;
    const cloneEl = clonedElements[i] as HTMLElement;
    if (!origEl || !cloneEl || !cloneEl.style) continue;

    const computed = window.getComputedStyle(origEl);
    for (const prop of colorProps) {
      const val = computed[prop as any];
      if (typeof val === 'string' && val) {
        const normalized = normalizeColor(val);
        if (normalized !== val) {
          (cloneEl.style as any)[prop] = normalized;
        }
      }
    }

    const bgImg = computed.backgroundImage;
    if (
      bgImg &&
      (bgImg.includes('oklch') ||
        bgImg.includes('oklab') ||
        bgImg.includes('color-mix') ||
        bgImg.includes('lab(') ||
        bgImg.includes('lch('))
    ) {
      const fallbackBg = normalizeColor(computed.backgroundColor);
      cloneEl.style.backgroundImage = 'none';
      cloneEl.style.backgroundColor =
        fallbackBg && fallbackBg !== 'transparent' ? fallbackBg : '#0d381e';
    }

    const shadow = computed.boxShadow;
    if (
      shadow &&
      (shadow.includes('oklch') ||
        shadow.includes('oklab') ||
        shadow.includes('color-mix') ||
        shadow.includes('lab(') ||
        shadow.includes('lch('))
    ) {
      cloneEl.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
    }

    // Ensure nested scroll wrappers (overflow-x-auto, overflow-y-auto, max-h-*) never clip table cells/rows in PDF
    if (
      computed.overflowX === 'auto' ||
      computed.overflowX === 'scroll' ||
      computed.overflowY === 'auto' ||
      computed.overflowY === 'scroll'
    ) {
      cloneEl.style.overflow = 'visible';
      cloneEl.style.overflowX = 'visible';
      cloneEl.style.overflowY = 'visible';
      cloneEl.style.maxHeight = 'none';
    }

    // Hide print:hidden action elements inside PDF capture if marked
    if (origEl.classList?.contains('pdf-hide') || origEl.classList?.contains('print:hidden')) {
      cloneEl.style.display = 'none';
    }
  }

  // Reveal elements marked exclusively for PDF/print headers
  clonedRoot.querySelectorAll('.pdf-only-block').forEach((el) => {
    (el as HTMLElement).style.display = 'block';
  });

  // Neutralize modern CSS color syntax in <style> tags so html2canvas CSS parser never chokes
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((tag) => {
    if (
      tag.textContent &&
      (tag.textContent.includes('oklch') ||
        tag.textContent.includes('oklab') ||
        tag.textContent.includes('color-mix') ||
        tag.textContent.includes('lab(') ||
        tag.textContent.includes('lch('))
    ) {
      tag.textContent = tag.textContent
        .replace(/oklch\([^)]*\)/g, 'rgb(30, 41, 59)')
        .replace(/oklab\([^)]*\)/g, 'rgb(30, 41, 59)')
        .replace(/lab\([^)]*\)/g, 'rgb(30, 41, 59)')
        .replace(/lch\([^)]*\)/g, 'rgb(30, 41, 59)')
        .replace(/color-mix\([^;{}]+\)/g, 'rgba(0, 0, 0, 0.1)');
    }
  });
}

/**
 * Wait until an element with given ID is mounted in the DOM (useful after tab switches).
 */
export async function waitForElementById(id: string, timeoutMs = 600): Promise<HTMLElement | null> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    const el = document.getElementById(id);
    if (el) return el;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return document.getElementById(id);
}

/**
 * Capture an HTMLElement and export it directly as a high-resolution A4 PDF file
 * with Bengali font rendering, full unclipped tables, and clean pagination.
 */
export async function exportElementToPdf(
  element: HTMLElement | string,
  options: PdfExportOptions = {}
): Promise<boolean> {
  let targetEl: HTMLElement | null = null;
  let originalOverflow = '';
  let originalMaxHeight = '';

  try {
    targetEl =
      typeof element === 'string'
        ? await waitForElementById(element, 600)
        : element;

    if (!targetEl) {
      console.error('Target element for PDF generation not found:', element);
      return false;
    }

    // Ensure Bengali & icon web fonts have finished loading before snapshot
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const {
      filename = `মা_ফ্লাওয়ার_মিল_রিপোর্ট_${new Date().toISOString().slice(0, 10)}`,
      orientation = 'portrait',
      scale = 2,
    } = options;

    const captureAttr = 'data-pdf-capture-target';
    targetEl.setAttribute(captureAttr, 'true');

    originalOverflow = targetEl.style.overflow;
    originalMaxHeight = targetEl.style.maxHeight;
    targetEl.style.overflow = 'visible';
    targetEl.style.maxHeight = 'none';

    const capturedRef = targetEl;
    const captureWidth = Math.max(targetEl.scrollWidth || 960, targetEl.offsetWidth || 960, 860);

    const canvas = await html2canvas(targetEl, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: captureWidth,
      windowWidth: Math.max(captureWidth + 40, 1024),
      onclone: (clonedDoc) => {
        const clonedTarget = clonedDoc.querySelector(`[${captureAttr}="true"]`) as HTMLElement;
        if (clonedTarget) {
          clonedTarget.style.overflow = 'visible';
          clonedTarget.style.maxHeight = 'none';
          clonedTarget.style.width = `${captureWidth}px`;
          sanitizeClonedStylesForCanvas(capturedRef, clonedTarget, clonedDoc);
        }
      },
    });

    targetEl.removeAttribute(captureAttr);
    targetEl.style.overflow = originalOverflow;
    targetEl.style.maxHeight = originalMaxHeight;

    if (!canvas.width || !canvas.height) {
      throw new Error('Captured canvas is empty');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.96);

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const pageHeight = orientation === 'portrait' ? 297 : 210;

    const margin = 8;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= printableHeight;

    // 1.5mm tolerance avoids emitting an extra blank trailing page
    while (heightLeft > 1.5) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;
    }

    const finalFileName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(finalFileName);

    return true;
  } catch (error) {
    console.error('Failed to export PDF:', error);
    if (targetEl) {
      targetEl.removeAttribute('data-pdf-capture-target');
      targetEl.style.overflow = originalOverflow;
      targetEl.style.maxHeight = originalMaxHeight;
    }
    printAsPdf(options.filename, typeof element === 'string' ? element : undefined);
    return false;
  }
}

/**
 * Universal browser print trigger that isolates only the requested elementId (if given)
 * and sets a clean document title for "Save as PDF".
 */
export function printAsPdf(documentTitle?: string, elementId?: string) {
  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  let targetEl: HTMLElement | null = null;
  if (elementId) {
    targetEl = document.getElementById(elementId);
    if (targetEl) {
      document.body.classList.add('printing-target');
      targetEl.setAttribute('data-print-active', 'true');
    }
  }

  const cleanup = () => {
    if (documentTitle) {
      document.title = originalTitle;
    }
    document.body.classList.remove('printing-target');
    if (targetEl) {
      targetEl.removeAttribute('data-print-active');
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  // Safety fallback in case afterprint doesn't fire in embedded iframes
  setTimeout(cleanup, 1500);
}
