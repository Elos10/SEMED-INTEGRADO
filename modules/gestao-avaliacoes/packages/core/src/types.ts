export const choices = ['A','B','C','D','E'] as const;
export type Choice = typeof choices[number];
export type Subject = 'PORTUGUESE'|'MATHEMATICS'|'SINGLE';
export type AnswerStatus = 'MARKED'|'BLANK'|'MULTIPLE'|'REVIEW';
export interface BubbleReading { choice: Choice; fill: number }
export interface RecognizedAnswer { question: number; selected: Choice|null; marked: Choice[]; status: AnswerStatus; confidence: number; fills: BubbleReading[] }
export interface Grade { total: number; correct: number; wrong: number; blank: number; invalid: number; percentage: number; score: number }
export interface SheetData { sheetId: string; assessmentId: string; assessmentNumber: string; assessmentYear: number; grade: number; subject: Subject; unitName: string; studentName?: string; className?: string; timeMode: 'PARTIAL'|'FULL'|'ALL'; questionCount: number }
