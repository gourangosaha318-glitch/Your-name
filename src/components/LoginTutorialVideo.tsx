import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  BookOpen,
  SkipForward,
} from 'lucide-react';
import { toBengaliNumber } from '../lib/bengaliUtils';

interface ChapterDef {
  id: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  startSec: number;
  endSec: number;
  narration: string;
}

const CHAPTERS: ChapterDef[] = [
  {
    id: 0,
    title: '১. নিরাপদ লগইন ও ৩টি ইউজার ভূমিকা',
    shortTitle: '১. লগইন ও রোল',
    subtitle: 'মালিক (OWNER), ম্যানেজার (MANAGER) এবং টেস্টার (TESTER) অ্যাক্সেস',
    startSec: 0,
    endSec: 8,
    narration:
      'প্রথমে ইউজারনেম ও পাসওয়ার্ড অথবা দ্রুত রোল বাটন দিয়ে লগইন করুন। মালিক সব কিছু নিয়ন্ত্রণ করেন, ম্যানেজার দৈনিক কাজ করেন এবং টেস্টার শুধু মেমো ও গেট পাস তৈরি করেন।',
  },
  {
    id: 1,
    title: '২. ক্রেতার মেমো, খুচরা ময়দা ও গেট পাস',
    shortTitle: '২. মেমো ও গেট পাস',
    subtitle: 'বস্তা ও খুচরা ময়দা আলাদাভাবে যোগ এবং ২টি পৃথক PDF প্রিন্ট',
    startSec: 8,
    endSec: 16,
    narration:
      'বিক্রয় মেমোতে বস্তাভিত্তিক পণ্য ও খুচরা ময়দা টাকায় যোগ করুন। গেট পাস পিডিএফে শুধুমাত্র বস্তার সংখ্যা থাকে, কোনো ওজন বা টাকার হিসাব থাকে না।',
  },
  {
    id: 2,
    title: '৩. গম ক্রয় (কেজি), উৎপাদন ও স্টক ইতিহাস',
    shortTitle: '৩. গম ও স্টক',
    subtitle: 'সাইলো গম থেকে আটা-ময়দা-ভুসি-সুজি উৎপাদন ও স্টক লেজার',
    startSec: 16,
    endSec: 24,
    narration:
      'গম কেজিতে কিনুন, ভাঙানোর হিসাব দিন এবং উৎপাদিত বস্তা গুদামে যোগ করুন। প্রতিটি মুভমেন্ট স্বয়ংক্রিয়ভাবে স্টক ইতিহাসে জমা থাকে এবং PDF করা যায়।',
  },
  {
    id: 3,
    title: '৪. খরচের ভাউচার ও ব্যাংক নিরাপত্তা পিন',
    shortTitle: '৪. ভাউচার ও ব্যাংক পিন',
    subtitle: 'মালিকের অনুমোদন স্বাক্ষর এবং ৪৩২১ পিন দিয়ে ব্যাংক সুরক্ষা',
    startSec: 24,
    endSec: 32,
    narration:
      'ম্যানেজার খরচের ভাউচার তৈরি করলে মালিক স্বাক্ষর দিয়ে অনুমোদন করেন। ব্যাংক মডিউল ৪৩২১ পিন দিয়ে সুরক্ষিত, যেখানে জমা, উত্তোলন ও ৫টি ব্যাংক PDF রয়েছে।',
  },
  {
    id: 4,
    title: '৫. দৈনিক পূর্ণাঙ্গ রিপোর্ট (২৭-আইটেম PDF)',
    shortTitle: '৫. দৈনিক রিপোর্ট PDF',
    subtitle: 'এক ক্লিকে নগদ ক্যাশ, বিক্রয়, উৎপাদন, খরচ, বকেয়া ও লাভ-ক্ষতি',
    startSec: 32,
    endSec: 40,
    narration:
      'দিনের শেষে প্রিন্ট ফুল ডেইলি রিপোর্ট পিডিএফ বাটনে ক্লিক করে ২৭টি হিসাব একসাথে এ-ফোর বাংলা পিডিএফ হিসেবে সংরক্ষণ করুন।',
  },
];

const TOTAL_DURATION = 40;

function formatTimeSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return toBengaliNumber(`${mm}:${ss}`);
}

function easeInOut(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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

function drawAnimatedPointer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  clicking: boolean
) {
  ctx.save();
  if (clicking) {
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 21);
  ctx.lineTo(6, 16);
  ctx.lineTo(11, 24);
  ctx.lineTo(14, 22);
  ctx.lineTo(9, 14);
  ctx.lineTo(17, 14);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#0d381e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function renderVideoFrame(ctx: CanvasRenderingContext2D, t: number) {
  const W = 800;
  const H = 450;
  ctx.clearRect(0, 0, W, H);

  // Dark green backdrop
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#072413');
  bg.addColorStop(1, '#0d381e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Moving subtle wave line for continuous motion cue
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 20) {
    const y = H - 30 + Math.sin(x * 0.02 + t * 2.5) * 10;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const chapterIdx = Math.min(4, Math.floor(t / 8));
  const localT = t - chapterIdx * 8; // 0..8
  const chapter = CHAPTERS[chapterIdx];

  // App Window Frame
  drawRoundedRect(ctx, 26, 20, W - 52, H - 88, 14);
  ctx.fillStyle = '#fbf7ee';
  ctx.fill();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header bar inside screen
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(40, 20);
  ctx.lineTo(W - 40, 20);
  ctx.quadraticCurveTo(W - 26, 20, W - 26, 34);
  ctx.lineTo(W - 26, 64);
  ctx.lineTo(26, 64);
  ctx.lineTo(26, 34);
  ctx.quadraticCurveTo(26, 20, 40, 20);
  ctx.closePath();
  ctx.fillStyle = '#0d381e';
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 14px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
  ctx.fillText('মা ফ্লাওয়ার মিল — ব্যবহার নির্দেশিকা', 46, 47);

  // Live blinking indicator
  const pulse = (Math.sin(t * 5) + 1) / 2;
  ctx.beginPath();
  ctx.arc(W - 230, 42, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(52, 211, 153, ${0.4 + pulse * 0.6})`;
  ctx.fill();

  drawRoundedRect(ctx, W - 212, 30, 168, 24, 6);
  ctx.fillStyle = '#ea7a1a';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
  ctx.fillText(`অধ্যায় ${toBengaliNumber(chapterIdx + 1)} / ৫`, W - 156, 46);

  // Smooth chapter progress thin bar
  ctx.fillStyle = '#e7e5e4';
  ctx.fillRect(26, 64, W - 52, 4);
  ctx.fillStyle = '#ea7a1a';
  ctx.fillRect(26, 64, ((W - 52) * localT) / 8, 4);

  if (chapterIdx === 0) {
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 18px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('ধাপ ১: ৩টি আলাদা ভূমিকায় লগইন করুন', 50, 98);

    const roles = [
      {
        title: 'মালিক (OWNER)',
        user: 'owner / mill123456',
        desc: 'সম্পূর্ণ নিয়ন্ত্রণ • ভাউচার অনুমোদন • ব্যাংক পিন • অডিট লগ',
        color: '#fef3c7',
        border: '#f59e0b',
        badge: '#d97706',
      },
      {
        title: 'ম্যানেজার (MANAGER)',
        user: 'manager / manager123',
        desc: 'গম ক্রয় • উৎপাদন • মেমো • ভাউচার তৈরি • দৈনিক রিপোর্ট',
        color: '#d1fae5',
        border: '#10b981',
        badge: '#047857',
      },
      {
        title: 'টেস্টার (TESTER)',
        user: 'tester / tester123',
        desc: 'শুধুমাত্র বিক্রয় মেমো ও গেট পাস (অন্যান্য মডিউল লকড)',
        color: '#e0f2fe',
        border: '#0284c7',
        badge: '#0369a1',
      },
    ];

    const highlightFloat = Math.min(2, localT / 2.5);
    const highlightIdx = Math.floor(highlightFloat);
    roles.forEach((r, idx) => {
      const slide = easeInOut((localT - idx * 0.25) / 0.6);
      const rx = lerp(120, 50, slide);
      const ry = 118 + idx * 72;
      const isSelected = idx === highlightIdx;

      ctx.save();
      ctx.globalAlpha = slide;
      drawRoundedRect(ctx, rx, ry, W - 100, 58, 10);
      ctx.fillStyle = r.color;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ea7a1a' : r.border;
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.stroke();

      drawRoundedRect(ctx, rx + 16, ry + 14, 152, 28, 6);
      ctx.fillStyle = r.badge;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
      ctx.fillText(r.title, rx + 26, ry + 32);

      ctx.fillStyle = '#292524';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(r.user, rx + 186, ry + 26);

      ctx.fillStyle = '#57534e';
      ctx.font = '12px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
      ctx.fillText(r.desc, rx + 186, ry + 45);
      ctx.restore();
    });

    // Continuously gliding cursor across the 3 role cards
    const px = lerp(420, 620, easeInOut((localT % 2.6) / 1.5));
    const py = 148 + highlightFloat * 72;
    drawAnimatedPointer(ctx, px, py, (localT % 2.6) > 1.7 && (localT % 2.6) < 2.2);
  } else if (chapterIdx === 1) {
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 18px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('ধাপ ২: ক্রেতার মেমো, খুচরা ময়দা ও গেট পাস PDF', 50, 98);

    // Customer Memo Card
    drawRoundedRect(ctx, 50, 116, 344, 214, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = localT < 4 ? '#0d381e' : '#d6d3d1';
    ctx.lineWidth = localT < 4 ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0d381e';
    ctx.font = 'bold 14px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('ক্রেতার মেমো (Customer Memo)', 66, 142);

    const qtyAnim = Math.min(10, Math.floor(lerp(1, 10.9, localT / 2.0)));
    ctx.fillStyle = '#44403c';
    ctx.font = '12px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText(`১. সুপার আটা — ${toBengaliNumber(qtyAnim)} বস্তা × ৳২,১০০ = ৳${toBengaliNumber(qtyAnim * 2100)}`, 66, 172);

    const retailAmt = Math.min(1500, Math.floor(lerp(0, 1500, (localT - 1.5) / 1.5)));
    drawRoundedRect(ctx, 62, 186, 320, 28, 6);
    ctx.fillStyle = localT > 1.5 ? '#fef3c7' : '#f5f5f4';
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 12px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText(`২. খুচরা ময়দা (০ বস্তা) — সরাসরি = ৳${toBengaliNumber(Math.max(0, retailAmt))}`, 70, 204);

    ctx.fillStyle = '#44403c';
    ctx.font = '12px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('পরিবহন: +৳৩০০  |  ডিসকাউন্ট: -৳১০০', 66, 238);

    const totalBill = qtyAnim * 2100 + Math.max(0, retailAmt) + 200;
    ctx.fillStyle = '#0d381e';
    ctx.font = 'bold 15px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText(`সর্বমোট বিল: ৳${toBengaliNumber(totalBill)}`, 66, 268);

    drawRoundedRect(ctx, 66, 286, 155, 30, 6);
    ctx.fillStyle = '#0d381e';
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('ক্রেতার মেমো PDF', 90, 305);

    // Gate Pass Card
    drawRoundedRect(ctx, 414, 116, 336, 214, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = localT >= 4 ? '#ea7a1a' : '#d6d3d1';
    ctx.lineWidth = localT >= 4 ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ea7a1a';
    ctx.font = 'bold 14px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('গেট পাস (Gate Pass — নিরাপত্তা)', 432, 142);

    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 13px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('গেট পাস নং: GP-1003', 432, 172);
    ctx.fillText(`পণ্য: সুপার আটা — ${toBengaliNumber(qtyAnim)} বস্তা`, 432, 196);
    ctx.fillStyle = '#57534e';
    ctx.font = '12px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('গাড়ি নং: বগুড়া-ট-১১-২২৩৩', 432, 220);

    drawRoundedRect(ctx, 430, 236, 302, 38, 6);
    ctx.fillStyle = '#ffe4e6';
    ctx.fill();
    ctx.fillStyle = '#9f1239';
    ctx.font = 'bold 11px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('✓ কেজি ওজন, দাম বা টাকার কোনো তথ্য থাকে না', 442, 259);

    drawRoundedRect(ctx, 432, 286, 158, 30, 6);
    ctx.fillStyle = '#ea7a1a';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('গেট পাস PDF প্রিন্ট', 456, 305);

    const px = lerp(140, 515, easeInOut((localT - 2.5) / 2.5));
    const py = 300 + Math.sin(localT * 3) * 4;
    drawAnimatedPointer(ctx, px, py, (localT > 2.2 && localT < 2.8) || (localT > 5.8 && localT < 6.4));
  } else if (chapterIdx === 2) {
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 18px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('ধাপ ৩: গম ক্রয় (কেজি), উৎপাদন ও স্টক ইতিহাস', 50, 98);

    const steps = [
      { label: '১. গম ক্রয়', val: '৫,০০০ কেজি', sub: 'সাইলোতে মজুদ যোগ', bg: '#fef3c7', bd: '#f59e0b' },
      { label: '২. গম ভাঙানো', val: '২,০০০ কেজি', sub: 'মিলিং ও ড্রাম লগ', bg: '#e0f2fe', bd: '#0284c7' },
      { label: '৩. উৎপাদন (বস্তা)', val: 'আটা • ময়দা • ভুসি • সুজি', sub: 'গুদামে বস্তা স্টক ইন', bg: '#d1fae5', bd: '#10b981' },
    ];

    const activeStep = Math.min(2, Math.floor(localT / 2.3));
    steps.forEach((st, i) => {
      const sx = 50 + i * 240;
      const bounce = activeStep === i ? Math.sin(localT * 5) * 3 : 0;
      drawRoundedRect(ctx, sx, 118 + bounce, 218, 92, 10);
      ctx.fillStyle = st.bg;
      ctx.fill();
      ctx.strokeStyle = activeStep === i ? '#ea7a1a' : st.bd;
      ctx.lineWidth = activeStep === i ? 3 : 1.5;
      ctx.stroke();

      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 13px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
      ctx.fillText(st.label, sx + 14, 144 + bounce);
      ctx.fillStyle = '#0d381e';
      ctx.font = 'bold 14px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
      ctx.fillText(st.val, sx + 14, 172 + bounce);
      ctx.fillStyle = '#57534e';
      ctx.font = '11px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
      ctx.fillText(st.sub, sx + 14, 194 + bounce);
    });

    drawRoundedRect(ctx, 50, 226, W - 100, 104, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0d381e';
    ctx.font = 'bold 13px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('গুদাম স্টক ইতিহাস টেবিল (Stock History PDF)', 66, 250);

    const balNum = 100 + Math.min(30, Math.floor((localT / 6) * 30));
    ctx.fillStyle = '#44403c';
    ctx.font = '11px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText(`• প্রারম্ভিক: ১০০ বস্তা  |  উৎপাদন: +৫০  |  বিক্রয়: -২০  |  বর্তমান ব্যালেন্স: ${toBengaliNumber(balNum)} বস্তা`, 66, 276);
    ctx.fillText('• প্রতিটি স্টক সমন্বয়ে কারণ (Reason) লেখা বাধ্যতামূলক এবং ডুপ্লিকেট কর্তন হয় না।', 66, 298);

    drawRoundedRect(ctx, 534, 290, 198, 28, 6);
    ctx.fillStyle = '#0d381e';
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('Download Stock History PDF', 550, 308);

    const px = lerp(160, 630, easeInOut((localT - 1.5) / 4.5));
    const py = lerp(165, 304, easeInOut((localT - 3.5) / 2.5));
    drawAnimatedPointer(ctx, px, py, localT > 6.1 && localT < 6.9);
  } else if (chapterIdx === 3) {
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 18px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('ধাপ ৪: খরচের ভাউচার অনুমোদন ও ব্যাংক পিন (4321)', 50, 98);

    drawRoundedRect(ctx, 50, 116, 338, 214, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0d381e';
    ctx.font = 'bold 14px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('খরচের ভাউচার (Expense Voucher)', 66, 142);

    ctx.fillStyle = '#44403c';
    ctx.font = '12px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('১. ম্যানেজার ভাউচার তৈরি করেন (Pending)', 66, 172);
    ctx.fillText('২. মালিক যাচাই ও ডিজিটাল স্বাক্ষর দেন', 66, 196);

    const approved = localT > 2.8;
    drawRoundedRect(ctx, 66, 216, 290, 42, 8);
    ctx.fillStyle = approved ? '#d1fae5' : '#fef3c7';
    ctx.fill();
    ctx.fillStyle = approved ? '#065f46' : '#92400e';
    ctx.font = 'bold 13px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText(
      approved ? '✓ অনুমোদিত (Owner Signed) — PDF রেডি' : '⏳ মালিকের অনুমোদনের অপেক্ষায়...',
      80,
      242
    );

    ctx.fillStyle = '#57534e';
    ctx.font = '11px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('অনুমোদিত ভাউচার পরিবর্তন বা মুছা যায় না।', 66, 286);

    drawRoundedRect(ctx, 412, 116, 338, 214, 10);
    ctx.fillStyle = '#0d381e';
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('উচ্চ-নিরাপত্তা ব্যাংক পিন লক', 432, 142);

    const typedLen = Math.min(4, Math.floor((localT + 0.5) / 1.0));
    const pinChars = '4321'.slice(0, typedLen).padEnd(4, '•');
    drawRoundedRect(ctx, 432, 160, 298, 40, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#0d381e';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(pinChars.split('').join('   '), 525, 187);

    const bankUnlocked = localT > 4.2;
    drawRoundedRect(ctx, 432, 214, 298, 36, 8);
    ctx.fillStyle = bankUnlocked ? '#10b981' : '#ea7a1a';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText(
      bankUnlocked ? '✓ আনলক সম্পন্ন — ৫টি ব্যাংক PDF সক্রিয়' : 'ডিফল্ট পিন: 4321 (বা ৪৩২১)',
      462,
      237
    );

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '11px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('জমা • উত্তোলন (চার্জ সহ) • ট্রান্সফার • ব্যাংক চার্জ', 442, 282);
    ctx.fillText('৫ বার ভুল পিনে ৫ মিনিটের জন্য সিস্টেম লক হয়', 442, 304);

    const px = lerp(210, 580, easeInOut((localT - 2.2) / 2.0));
    const py = 234 + Math.sin(localT * 4) * 4;
    drawAnimatedPointer(ctx, px, py, localT > 4.1 && localT < 4.7);
  } else {
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 18px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('ধাপ ৫: দৈনিক পূর্ণাঙ্গ রিপোর্ট — ২৭টি তথ্য এক PDF-এ', 50, 98);

    drawRoundedRect(ctx, 50, 116, W - 100, 214, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0d381e';
    ctx.lineWidth = 2;
    ctx.stroke();

    const cols = [
      ['১. প্রারম্ভিক ও সমাপনী নগদ ক্যাশ', '২. গম ক্রয় (কেজি) ও পরিশোধ', '৩. গম ভাঙানো ও ৪ পণ্যের উৎপাদন'],
      ['৪. পণ্যভিত্তিক ও খুচরা বিক্রয়', '৫. নগদ, ব্যাংক ও বকেয়া বিক্রয়', '৬. অনুমোদিত ও বকেয়া খরচের ভাউচার'],
      ['৭. ব্যাংক জমা, উত্তোলন ও চার্জ', '৮. ক্রেতা ও সরবরাহকারী বকেয়া', '৯. বর্তমান মজুদ ও লাভ-ক্ষতি সারসংক্ষেপ'],
    ];

    cols.forEach((col, cIdx) => {
      const cx = 66 + cIdx * 232;
      col.forEach((line, rIdx) => {
        const delay = (cIdx * 3 + rIdx) * 0.22;
        const alpha = Math.max(0.2, Math.min(1, (localT - delay) / 0.5));
        const cy = 136 + rIdx * 42;
        ctx.save();
        ctx.globalAlpha = alpha;
        drawRoundedRect(ctx, cx, cy, 218, 32, 6);
        ctx.fillStyle = rIdx % 2 === 0 ? '#f0fdf4' : '#fefce8';
        ctx.fill();
        ctx.fillStyle = '#1c1917';
        ctx.font = 'bold 11px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
        ctx.fillText(line, cx + 10, cy + 20);
        ctx.restore();
      });
    });

    const btnPulse = Math.sin(localT * 6) > 0;
    drawRoundedRect(ctx, 245, 274, 310, 38, 8);
    ctx.fillStyle = btnPulse ? '#ea7a1a' : '#0d381e';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
    ctx.fillText('Print Full Daily Report PDF (A4 বাংলা)', 275, 298);

    const px = lerp(160, 400, easeInOut(localT / 3.5));
    drawAnimatedPointer(ctx, px, 294, localT > 3.5 && localT < 4.5);
  }

  // Bottom Video Subtitle Bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  ctx.fillRect(26, H - 62, W - 52, 46);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 13px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
  ctx.fillText(chapter.title, 44, H - 40);
  ctx.fillStyle = '#f5f5f4';
  ctx.font = '12px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
  ctx.fillText(chapter.subtitle, 44, H - 22);
}

interface LoginTutorialVideoProps {
  onClose?: () => void;
}

export const LoginTutorialVideo: React.FC<LoginTutorialVideoProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-play silently on login screen so new users immediately see the walkthrough running!
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isTheaterOpen, setIsTheaterOpen] = useState(false);

  const timeRef = useRef<number>(0);
  const lastSpokenChapterRef = useRef<number>(-1);

  const activeChapterIndex = Math.min(4, Math.floor(currentTime / 8));
  const activeChapter = CHAPTERS[activeChapterIndex];

  const speakChapter = useCallback(
    (idx: number) => {
      if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (lastSpokenChapterRef.current === idx) return;
      lastSpokenChapterRef.current = idx;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(CHAPTERS[idx].narration);
        utter.lang = 'bn-BD';
        utter.rate = 0.98;
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore unsupported Web Speech environments
      }
    },
    [voiceEnabled]
  );

  useEffect(() => {
    if (!voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      lastSpokenChapterRef.current = -1;
    }
  }, [voiceEnabled]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Robust 60fps interval + animation loop (never nests setState inside another setState!)
  useEffect(() => {
    if (!isPlaying) return;
    let lastTs = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.15, Math.max(0.01, (now - lastTs) / 1000));
      lastTs = now;
      let next = timeRef.current + dt;
      if (next >= TOTAL_DURATION) {
        next = 0; // loop continuously
        lastSpokenChapterRef.current = -1;
      }
      timeRef.current = next;
      setCurrentTime(next);
    }, 33); // ~30fps state & canvas refresh, 100% reliable in all iframes/tabs

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && voiceEnabled) {
      speakChapter(activeChapterIndex);
    }
  }, [activeChapterIndex, isPlaying, voiceEnabled, speakChapter]);

  // Draw frame whenever currentTime or modal state changes
  useEffect(() => {
    const drawOn = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderVideoFrame(ctx, Math.min(TOTAL_DURATION - 0.01, currentTime));
    };
    drawOn(canvasRef.current);
    if (isTheaterOpen) {
      drawOn(modalCanvasRef.current);
    }
  }, [currentTime, isTheaterOpen]);

  const togglePlay = () => {
    setIsPlaying((p) => {
      const next = !p;
      if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  const handleRestart = () => {
    lastSpokenChapterRef.current = -1;
    timeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleNextChapter = () => {
    const nextIdx = (activeChapterIndex + 1) % CHAPTERS.length;
    jumpToChapter(CHAPTERS[nextIdx]);
  };

  const jumpToChapter = (ch: ChapterDef) => {
    lastSpokenChapterRef.current = -1;
    timeRef.current = ch.startSec + 0.05;
    setCurrentTime(ch.startSec + 0.05);
    setIsPlaying(true);
  };

  const progressPct = Math.min(100, (currentTime / TOTAL_DURATION) * 100);

  return (
    <>
      <div
        id="tutorial-video-section"
        className="rounded-2xl border border-stone-200/90 bg-white shadow-xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#0d381e] px-5 py-4 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-emerald-950">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white leading-tight">
                সফটওয়্যার ব্যবহারের টিউটোরিয়াল ভিডিও
              </h2>
              <p className="text-[11px] text-emerald-200/90">
                নতুন ব্যবহারকারীর জন্য ৪০ সেকেন্ডের বাংলা ভিডিও গাইড ({isPlaying ? 'চলছে ▶' : 'বিরতি ⏸'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setVoiceEnabled((v) => !v)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                voiceEnabled ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-900/70 text-emerald-100 hover:bg-emerald-800'
              }`}
              title="বাংলা ভয়েস চালু/বন্ধ"
            >
              {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{voiceEnabled ? 'ভয়েস চালু' : 'ভয়েস'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsTheaterOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-emerald-900/70 hover:bg-emerald-800 px-2.5 py-1.5 text-[11px] font-bold text-emerald-100"
              title="বড় স্ক্রিনে দেখুন"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">বড় পর্দা</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center rounded-lg bg-rose-600/90 hover:bg-rose-600 p-1.5 text-white"
                title="বন্ধ করুন"
                aria-label="টিউটোরিয়াল ভিডিও বন্ধ করুন"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 16:9 Canvas Stage */}
        <div className="relative bg-[#071f11] aspect-video w-full select-none group">
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer block"
          />

          {/* Show Play button overlay when manually paused */}
          {!isPlaying && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/30 transition-colors cursor-pointer"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ea7a1a] text-white shadow-2xl ring-4 ring-amber-300/40 transition-transform group-hover:scale-105">
                <Play className="h-8 w-8 ml-1 fill-current" />
              </div>
              <span className="mt-3 rounded-lg bg-[#0d381e]/95 border border-amber-400/40 px-4 py-1.5 text-xs font-bold text-amber-200 shadow-lg">
                টিউটোরিয়াল ভিডিও আবার চালু করুন
              </span>
            </button>
          )}
        </div>

        {/* Transport Bar */}
        <div className="bg-[#0b2e19] text-white px-4 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ea7a1a] hover:bg-[#d86c0e] text-white"
              aria-label={isPlaying ? 'বিরতি' : 'চালান'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleNextChapter}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100"
              title="পরবর্তী অধ্যায়"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100"
              title="শুরু থেকে দেখুন"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <input
              type="range"
              min={0}
              max={TOTAL_DURATION}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const v = Number(e.target.value);
                lastSpokenChapterRef.current = -1;
                timeRef.current = v;
                setCurrentTime(v);
              }}
              className="flex-1 accent-[#ea7a1a] cursor-pointer h-1.5"
              aria-label="ভিডিও টাইমলাইন"
            />

            <span className="text-[11px] font-mono text-emerald-200 shrink-0">
              {formatTimeSec(currentTime)} / {formatTimeSec(TOTAL_DURATION)}
            </span>
          </div>

          <div className="h-1 w-full bg-emerald-950 rounded overflow-hidden">
            <div className="h-full bg-amber-400 transition-all duration-75" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Interactive Chapter Selector */}
        <div className="p-4 bg-stone-50/70 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {CHAPTERS.map((ch) => {
              const active = ch.id === activeChapterIndex;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => jumpToChapter(ch)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                    active
                      ? 'bg-[#0d381e] text-amber-300 shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {ch.shortTitle}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-3 text-xs space-y-1">
            <p className="font-bold text-[#0d381e]">{activeChapter.title}</p>
            <p className="text-stone-600 leading-relaxed">{activeChapter.narration}</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-950 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>ব্যাংক পিন:</strong> <code className="font-mono font-bold bg-white px-1 rounded">4321</code> (বা{' '}
              <code className="font-mono font-bold bg-white px-1 rounded">৪৩২১</code>)
            </span>
            <span>
              <strong>ডিফল্ট পাসওয়ার্ড:</strong>{' '}
              <code className="font-mono font-bold bg-white px-1 rounded">mill123456</code> /{' '}
              <code className="font-mono font-bold bg-white px-1 rounded">manager123</code>
            </span>
          </div>
        </div>
      </div>

      {/* Theater Modal */}
      {isTheaterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-[#071f11] border border-emerald-800 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0d381e] text-white">
              <span className="text-sm font-bold text-amber-300">{activeChapter.title}</span>
              <button
                type="button"
                onClick={() => setIsTheaterOpen(false)}
                className="rounded-lg p-1.5 text-emerald-200 hover:bg-emerald-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <canvas
                ref={modalCanvasRef}
                width={800}
                height={450}
                onClick={togglePlay}
                className="w-full h-full object-contain cursor-pointer"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0b2e19] text-white">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex items-center gap-1.5 rounded-lg bg-[#ea7a1a] px-3 py-1.5 text-xs font-bold"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span>{isPlaying ? 'বিরতি' : 'চালান'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex items-center gap-1 rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-bold"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>পুনরায়</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CHAPTERS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => jumpToChapter(ch)}
                    className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                      ch.id === activeChapterIndex ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-900/70 text-emerald-100'
                    }`}
                  >
                    {ch.shortTitle}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
