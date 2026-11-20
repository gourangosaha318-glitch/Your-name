/**
 * Bengali Language, Numbers & Calendar Utilities
 * "মা ফ্লাওয়ার মিল" - ঘোড়াধাপহাট, বগুড়া
 */

// Digits mapping
const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Converts English numbers or string with digits to Bengali digits (০-৯)
 */
export function toBengaliNumber(input: number | string | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = input.toString();
  return str.replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}

/**
 * Formats a number using the Indian/South Asian numbering system (lakh, crore)
 * e.g., 120000 -> "1,20,000"
 */
export function formatSouthAsianNumber(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const [integerPart, decimalPart] = absVal.toString().split('.');

  if (integerPart.length <= 3) {
    const formatted = integerPart + (decimalPart ? '.' + decimalPart : '');
    return isNegative ? `-${formatted}` : formatted;
  }

  const lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const formatted = `${formattedOther},${lastThree}${decimalPart ? '.' + decimalPart : ''}`;

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats currency in Bengali format: "৳ ১,২০,০০০"
 */
export function formatBengaliCurrency(amount: number): string {
  const formattedEn = formatSouthAsianNumber(amount);
  return `৳ ${toBengaliNumber(formattedEn)}`;
}

// Bengali Days of the Week
export const bengaliDays = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
];

// Bengali Gregorian Months
export const bengaliGregorianMonths = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

// Bangla Calendar Months (Official Revised Bangladesh System)
export const banglaCalendarMonths = [
  'বৈশাখ',
  'জ্যৈষ্ঠ',
  'আষাঢ়',
  'শ্রাবণ',
  'ভাদ্র',
  'আশ্বিন',
  'কার্তিক',
  'অগ্রহায়ণ',
  'পৌষ',
  'মাঘ',
  'ফাল্গুন',
  'চৈত্র',
];

/**
 * Converts a Gregorian date into the revised Bangladeshi Bangla Calendar (বঙ্গাব্দ) date.
 * Based on the Bangladesh Bangla Academy revised calendar:
 * - Boishakh 1 is April 14
 * - First 6 months (Boishakh - Ashwin) have 31 days
 * - Kartik, Agrahayan, Poush, Magh have 30 days
 * - Falgun has 29 or 30 days (leap year)
 * - Choitro has 30 days
 */
export function getBanglaCalendarDate(date: Date = new Date()): { day: number; month: string; year: number; formatted: string } {
  const d = date.getDate();
  const m = date.getMonth(); // 0-indexed (0 = Jan, 9 = Oct)
  const y = date.getFullYear();

  // Check Gregorian leap year
  const isLeapYear = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  // Month day limits in revised Bangla calendar
  const monthLengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, isLeapYear ? 30 : 29, 30];

  // Bengali Year offset:
  // Before April 14: Gregorian Year - 594
  // On or after April 14: Gregorian Year - 593
  let banglaYear = y - 593;
  if (m < 3 || (m === 3 && d < 14)) {
    banglaYear = y - 594;
  }

  // Calculate day of the year relative to Pohela Boishakh (April 14)
  const boishakhStart = new Date(y, 3, 14); // April 14
  let diffDays: number;

  if (date >= boishakhStart) {
    const diffTime = date.getTime() - boishakhStart.getTime();
    diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } else {
    const prevBoishakh = new Date(y - 1, 3, 14);
    const diffTime = date.getTime() - prevBoishakh.getTime();
    diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  let monthIndex = 0;
  let remainingDays = diffDays;

  for (let i = 0; i < monthLengths.length; i++) {
    if (remainingDays < monthLengths[i]) {
      monthIndex = i;
      break;
    }
    remainingDays -= monthLengths[i];
  }

  const banglaDay = remainingDays + 1;
  const banglaMonth = banglaCalendarMonths[monthIndex];

  return {
    day: banglaDay,
    month: banglaMonth,
    year: banglaYear,
    formatted: `${toBengaliNumber(banglaDay)} ${banglaMonth} ${toBengaliNumber(banglaYear)}`,
  };
}

/**
 * Returns full header date string:
 * "আজ: ২৯ অক্টোবর ২০২৫, বুধবার | বাংলা তারিখ: ১৩ কার্তিক ১৪৩২"
 */
export function getFormattedHeaderDate(customDate?: Date): {
  gregorianFormatted: string;
  banglaFormatted: string;
  combined: string;
} {
  const date = customDate || new Date();
  const day = date.getDate();
  const monthName = bengaliGregorianMonths[date.getMonth()];
  const year = date.getFullYear();
  const dayOfWeek = bengaliDays[date.getDay()];

  const gregorianFormatted = `আজ: ${toBengaliNumber(day)} ${monthName} ${toBengaliNumber(year)}, ${dayOfWeek}`;
  const banglaInfo = getBanglaCalendarDate(date);
  const banglaFormatted = `বাংলা তারিখ: ${banglaInfo.formatted}`;

  return {
    gregorianFormatted,
    banglaFormatted,
    combined: `${gregorianFormatted}  |  ${banglaFormatted}`,
  };
}
