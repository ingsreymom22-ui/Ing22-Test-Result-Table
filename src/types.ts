import { CSSProperties } from 'react';

export interface Category {
  id: string;
  name: string;
  weight: number; // percentage of total grade (e.g., 5)
  itemCount: number; // number of items (e.g., 5 for 5 quizzes)
  itemMaxScores: number[]; // maximum raw score for each item in this category
}

export interface Subject {
  id: string;
  name: string;
  targetWeight?: number; // Intended target weight for the subject (e.g. 25%)
  categories: Category[];
}

export interface Level {
  id: string;
  name: string;
  subjects: Subject[];
}

export interface Student {
  id: string;
  name: string;
  scores: Record<string, number>; // key: `${categoryId}_${itemIndex}`
  attendance: string;
  comment: string;
}

export interface ClassRecord {
  id: string;
  termName: string;
  className: string;
  teacherName: string;
  levelId: string;
  students: Student[];
  isPinned?: boolean;
}

export function calculateGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 50) return 'E';
  return 'F';
}

export function getSubjectWeight(subject: Subject): number {
  return subject.categories.reduce((sum, cat) => sum + cat.weight, 0);
}

export function getLevelTotalWeight(level: Level): number {
  return level.subjects.reduce((sum, sub) => sum + getSubjectWeight(sub), 0);
}

export interface PaperStyle {
  id: string;
  name: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  tableHeaderClass?: string;
  customStyle?: CSSProperties;
}

export const PAPER_STYLES: PaperStyle[] = [
  { id: 'white_smooth', name: 'White Smooth (Default)', bgClass: 'bg-white', borderClass: 'border-slate-200', textClass: 'text-slate-800' },
  { id: 'rose_dot', name: 'Rose Dot', bgClass: 'bg-[#fff5f5]', borderClass: 'border-rose-100', textClass: 'text-rose-950', customStyle: { backgroundImage: 'radial-gradient(#fda4af 1px, transparent 1px)', backgroundSize: '16px 16px' } },
  { id: 'soft_peach', name: 'Soft Peach', bgClass: 'bg-[#fffaf0]', borderClass: 'border-orange-100', textClass: 'text-amber-950', customStyle: { backgroundImage: 'radial-gradient(#fed7aa 1px, transparent 1px)', backgroundSize: '16px 16px' } },
  { id: 'lavender_grid', name: 'Lavender Grid', bgClass: 'bg-[#faf5ff]', borderClass: 'border-purple-100', textClass: 'text-purple-950', customStyle: { backgroundImage: 'linear-gradient(to right, #e9d5ff 1px, transparent 1px), linear-gradient(to bottom, #e9d5ff 1px, transparent 1px)', backgroundSize: '20px 20px' } },
  { id: 'mint_mist', name: 'Mint Mist', bgClass: 'bg-[#f0fdf4]', borderClass: 'border-emerald-100', textClass: 'text-emerald-950', customStyle: { backgroundImage: 'radial-gradient(#a7f3d0 1px, transparent 1px)', backgroundSize: '18px 18px' } },
  { id: 'sky_sketch', name: 'Sky Sketch', bgClass: 'bg-[#f0f9ff]', borderClass: 'border-sky-100', textClass: 'text-sky-950', customStyle: { backgroundImage: 'linear-gradient(to right, #bae6fd 1px, transparent 1px), linear-gradient(to bottom, #bae6fd 1px, transparent 1px)', backgroundSize: '20px 20px' } },
  { id: 'vintage_cream', name: 'Vintage Cream', bgClass: 'bg-[#fdfbf7]', borderClass: 'border-yellow-100', textClass: 'text-amber-900', customStyle: { backgroundImage: 'radial-gradient(#fef08a 0.8px, transparent 0.8px)', backgroundSize: '14px 14px' } },
  { id: 'sand_shell', name: 'Sand Shell', bgClass: 'bg-[#fafaf9]', borderClass: 'border-stone-200', textClass: 'text-stone-800' },
  { id: 'classic_linen', name: 'Classic Linen', bgClass: 'bg-[#fafaf6]', borderClass: 'border-stone-200', textClass: 'text-stone-900', customStyle: { backgroundImage: 'linear-gradient(90deg, rgba(200,200,200,0.05) 50%, transparent 50%), linear-gradient(rgba(200,200,200,0.05) 50%, transparent 50%)', backgroundSize: '4px 4px' } },
  { id: 'cherry_blossom', name: 'Cherry Blossom', bgClass: 'bg-[#fff0f3]', borderClass: 'border-pink-100', textClass: 'text-pink-900' },
  { id: 'apricot_tint', name: 'Apricot Tint', bgClass: 'bg-[#fffdf5]', borderClass: 'border-amber-200/60', textClass: 'text-amber-900' },
  { id: 'matcha_latte', name: 'Matcha Latte', bgClass: 'bg-[#f4f9f4]', borderClass: 'border-green-200/50', textClass: 'text-emerald-900' },
  { id: 'ice_blue', name: 'Ice Blue', bgClass: 'bg-[#f5faff]', borderClass: 'border-blue-200/50', textClass: 'text-blue-900' },
  { id: 'lemon_chiffon', name: 'Lemon Chiffon', bgClass: 'bg-[#fffbeb]', borderClass: 'border-yellow-200/60', textClass: 'text-yellow-900' },
  { id: 'sage_soft', name: 'Sage Soft', bgClass: 'bg-[#f1f5f2]', borderClass: 'border-stone-300/60', textClass: 'text-stone-800' },
  { id: 'lilac_pastel', name: 'Lilac Pastel', bgClass: 'bg-[#fdf4ff]', borderClass: 'border-fuchsia-100', textClass: 'text-fuchsia-900' },
  { id: 'slate_whisper', name: 'Slate Whisper', bgClass: 'bg-[#f8fafc]', borderClass: 'border-slate-200', textClass: 'text-slate-800' },
  { id: 'parchment_antique', name: 'Parchment Antique', bgClass: 'bg-[#faf6e8]', borderClass: 'border-amber-200', textClass: 'text-amber-950', customStyle: { backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: '10px 100%' } },
  { id: 'plum_blossom', name: 'Plum Blossom', bgClass: 'bg-[#fdf2f8]', borderClass: 'border-pink-200/50', textClass: 'text-pink-950' },
  { id: 'foggy_blue', name: 'Foggy Blue', bgClass: 'bg-[#f1f5f9]', borderClass: 'border-slate-300/50', textClass: 'text-slate-800' }
];

export interface Wallpaper {
  id: string;
  name: string;
  bgClass: string;
}

export const WALLPAPERS: Wallpaper[] = [
  { id: 'default_slate', name: 'Default Slate', bgClass: 'bg-slate-50' },
  { id: 'light_green', name: 'Light Pastel Green', bgClass: 'bg-[#f2faf5]' },
  { id: 'light_purple', name: 'Light Pastel Purple', bgClass: 'bg-[#f7f2fa]' },
  { id: 'light_blue', name: 'Light Pastel Blue', bgClass: 'bg-[#f2f7fa]' },
  { id: 'light_pink', name: 'Light Pastel Pink', bgClass: 'bg-[#faf2f5]' },
  { id: 'light_peach', name: 'Light Pastel Peach', bgClass: 'bg-[#faf6f2]' },
  { id: 'light_yellow', name: 'Light Pastel Yellow', bgClass: 'bg-[#f9faf2]' },
  { id: 'cream_alabaster', name: 'Cream Alabaster', bgClass: 'bg-[#fbfaf7]' },
  { id: 'warm_oatmeal', name: 'Warm Oatmeal', bgClass: 'bg-[#f7f5f0]' },
  { id: 'muted_sage', name: 'Muted Sage', bgClass: 'bg-[#f3f6f3]' },
  { id: 'ocean_air', name: 'Ocean Air', bgClass: 'bg-[#f0f4f8]' },
  { id: 'morning_mist', name: 'Morning Mist', bgClass: 'bg-[#edf2f4]' },
  { id: 'rose_quartz', name: 'Rose Quartz', bgClass: 'bg-[#faf0f2]' },
  { id: 'lavender_frost', name: 'Lavender Frost', bgClass: 'bg-[#f4f0fa]' },
  { id: 'honeydew', name: 'Honeydew', bgClass: 'bg-[#f0faf4]' },
  { id: 'chiffon_lemon', name: 'Chiffon Lemon', bgClass: 'bg-[#fcfae6]' },
  { id: 'warm_sand', name: 'Warm Sand', bgClass: 'bg-[#faf6f0]' },
  { id: 'linen_blush', name: 'Linen Blush', bgClass: 'bg-[#faf2f0]' },
  { id: 'quiet_teal', name: 'Quiet Teal', bgClass: 'bg-[#f0fafc]' },
  { id: 'cotton_white', name: 'Cotton White', bgClass: 'bg-[#fafafa]' }
];


