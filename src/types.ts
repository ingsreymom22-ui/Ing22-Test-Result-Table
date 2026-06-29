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

