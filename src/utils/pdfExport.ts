import { jsPDF } from 'jspdf';
import { AuditRecord } from '../types';

// ==========================================
// PDF REPORT GENERATOR
// ==========================================

export const generateAuditPDF = (audit: AuditRecord, whiteLabel: boolean = false): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Colors
  const colors = {
    primary: [0, 242, 234] as [number, number, number],
    dark: [20, 20, 20] as [number, number, number],
    gray: [120, 120, 120] as [number, number, number],
    lightGray: [200, 200, 200] as [number, number, number],
    green: [34, 197, 94] as [number, number, number],
    yellow: [234, 179, 8] as [number, number, number],
    red: [239, 68, 68] as [number, number, number],
  };

  // Helper function to add text with word wrap
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 7): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  };

  // ==========================================
  // HEADER
  // ==========================================
  if (!whiteLabel) {
    doc.setFontSize(24);
    doc.setTextColor(...colors.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('ViralAudit', margin, y);
    
    doc.setFontSize(10);
    doc.setTextColor(...colors.gray);
    doc.setFont('helvetica', 'normal');
    doc.text('AI Video Ad Analysis Report', margin, y + 8);
  } else {
    doc.setFontSize(24);
    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text('Video Ad Analysis Report', margin, y);
  }

  // Date
  doc.setFontSize(10);
  doc.setTextColor(...colors.gray);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date(audit.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), y);

  y += 20;

  // Divider line
  doc.setDrawColor(...colors.lightGray);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // ==========================================
  // VIDEO INFO
  // ==========================================
  doc.setFontSize(12);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Video Analyzed', margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(audit.video_name, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(...colors.gray);
  doc.text(`File size: ${audit.video_size_mb?.toFixed(1) || '?'} MB`, margin, y);
  y += 15;

  // ==========================================
  // OVERALL SCORE
  // ==========================================
  // Score box
  const scoreBoxWidth = 60;
  const scoreBoxHeight = 40;
  const scoreBoxX = margin;
  
  // Background
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(scoreBoxX, y, scoreBoxWidth, scoreBoxHeight, 3, 3, 'F');

  // Score number
  const score = audit.overall_score || 0;
  let scoreColor = colors.red;
  if (score >= 5) scoreColor = colors.yellow;
  if (score >= 8) scoreColor = colors.green;

  doc.setFontSize(28);
  doc.setTextColor(...scoreColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`${score}/10`, scoreBoxX + 10, y + 27);

  // Verdict next to score
  const verdictX = scoreBoxX + scoreBoxWidth + 15;
  const verdictWidth = contentWidth - scoreBoxWidth - 15;

  doc.setFontSize(12);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Verdict', verdictX, y + 8);

  doc.setFontSize(10);
  doc.setTextColor(...colors.gray);
  doc.setFont('helvetica', 'italic');
  y = addWrappedText(`"${audit.verdict}"`, verdictX, y + 16, verdictWidth, 5);
  
  y = Math.max(y, y + scoreBoxHeight) + 10;

  // ==========================================
  // CATEGORY SCORES
  // ==========================================
  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Category Breakdown', margin, y);
  y += 12;

  const categories = [
    { name: 'Visual', icon: '👁', data: audit.categories?.visual },
    { name: 'Audio', icon: '🔊', data: audit.categories?.audio },
    { name: 'Copy', icon: '✍️', data: audit.categories?.copy },
    { name: 'Captions', icon: '💬', data: audit.categories?.captions },
  ];

  categories.forEach((cat) => {
    if (!cat.data) return;

    // Category header with score
    doc.setFontSize(11);
    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cat.name}`, margin, y);

    // Score badge
    const catScore = cat.data.score || 0;
    let catScoreColor = colors.red;
    if (catScore >= 50) catScoreColor = colors.yellow;
    if (catScore >= 70) catScoreColor = colors.green;

    doc.setTextColor(...catScoreColor);
    doc.text(`${catScore}%`, margin + 40, y);

    y += 7;

    // Feedback
    doc.setFontSize(9);
    doc.setTextColor(...colors.gray);
    doc.setFont('helvetica', 'normal');
    if (cat.data.feedback) {
      y = addWrappedText(cat.data.feedback, margin, y, contentWidth, 5);
    }

    // Fix suggestion
    if (cat.data.fix) {
      y += 3;
      doc.setTextColor(...colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.text('Fix: ', margin, y);
      doc.setFont('helvetica', 'normal');
      const fixX = margin + doc.getTextWidth('Fix: ');
      y = addWrappedText(cat.data.fix, fixX, y, contentWidth - doc.getTextWidth('Fix: '), 5);
    }

    y += 8;
  });

  // ==========================================
  // DIAGNOSTIC CHECKS
  // ==========================================
  // Check if we need a new page
  if (y > 230) {
    doc.addPage();
    y = margin;
  }

  y += 5;
  doc.setFontSize(14);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Diagnostic Checks', margin, y);
  y += 12;

  (audit.checks || []).forEach((check, idx) => {
    // Check if we need a new page
    if (y > 260) {
      doc.addPage();
      y = margin;
    }

    // Status badge
    let statusColor = colors.red;
    let statusText = check.status || 'WARN';
    if (statusText === 'PASS') statusColor = colors.green;
    if (statusText === 'WARN') statusColor = colors.yellow;

    // Check label
    doc.setFontSize(10);
    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(check.label || `Check ${idx + 1}`, margin, y);

    // Status
    doc.setTextColor(...statusColor);
    doc.setFont('helvetica', 'bold');
    doc.text(statusText, margin + 80, y);

    y += 6;

    // Details
    doc.setFontSize(9);
    doc.setTextColor(...colors.gray);
    doc.setFont('helvetica', 'normal');
    if (check.details) {
      y = addWrappedText(check.details, margin, y, contentWidth, 5);
    }

    // Fix
    if (check.fix) {
      y += 2;
      doc.setTextColor(...colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.text('Fix: ', margin, y);
      doc.setFont('helvetica', 'normal');
      const fixX = margin + doc.getTextWidth('Fix: ');
      y = addWrappedText(check.fix, fixX, y, contentWidth - doc.getTextWidth('Fix: '), 5);
    }

    y += 8;
  });

  // ==========================================
  // SCRIPT REWRITE
  // ==========================================
  if (audit.script_rewrite) {
    // New page for script rewrite
    doc.addPage();
    y = margin;

    doc.setFontSize(14);
    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text('Script Rewrite Suggestion', margin, y);
    y += 15;

    // Original Script
    doc.setFontSize(11);
    doc.setTextColor(...colors.gray);
    doc.setFont('helvetica', 'bold');
    doc.text('Original Script:', margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (audit.script_rewrite.original) {
      y = addWrappedText(audit.script_rewrite.original, margin, y, contentWidth, 5);
    }
    y += 10;

    // Improved Script
    doc.setFontSize(11);
    doc.setTextColor(...colors.green);
    doc.setFont('helvetica', 'bold');
    doc.text('Improved Script:', margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'normal');
    if (audit.script_rewrite.improved) {
      y = addWrappedText(audit.script_rewrite.improved, margin, y, contentWidth, 5);
    }
    y += 10;

    // Key Changes
    if (audit.script_rewrite.changes && audit.script_rewrite.changes.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(...colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Changes:', margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(...colors.gray);
      doc.setFont('helvetica', 'normal');
      audit.script_rewrite.changes.forEach((change, idx) => {
        if (y > 270) {
          doc.addPage();
          y = margin;
        }
        y = addWrappedText(`${idx + 1}. ${change}`, margin, y, contentWidth, 5);
        y += 3;
      });
    }
  }

  // ==========================================
  // FOOTER
  // ==========================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...colors.lightGray);
    doc.setFont('helvetica', 'normal');
    
    if (!whiteLabel) {
      doc.text(
        'Generated by ViralAudit.ai',
        margin,
        doc.internal.pageSize.getHeight() - 10
      );
    }
    
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin - 20,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // ==========================================
  // SAVE PDF
  // ==========================================
  const fileName = `ViralAudit_${audit.video_name.replace(/\.[^.]+$/, '')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
