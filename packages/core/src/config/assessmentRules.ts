import { choices, type Choice, type Subject } from '../types.js';
export type { Subject } from '../types.js';

export const QUESTION_COUNT_BY_GRADE = Object.freeze({1:10,2:10,3:10,4:15,5:15,6:20,7:20,8:20,9:20} as const);
export function allowedSubjects(grade:number): Subject[] { return grade === 1 ? ['SINGLE'] : ['PORTUGUESE','MATHEMATICS']; }
export function allowedChoices(grade:number): readonly Choice[] {
  validateGrade(grade);
  return grade === 1 ? choices : choices.slice(0, 4);
}
export function questionCountFor(grade:number, subject:Subject): number {
  validateGrade(grade);
  if (!allowedSubjects(grade).includes(subject)) throw new Error(grade === 1 ? 'O 1º ano aceita somente Prova Única.' : 'Do 2º ao 9º ano use Português ou Matemática.');
  return QUESTION_COUNT_BY_GRADE[grade as keyof typeof QUESTION_COUNT_BY_GRADE];
}

function validateGrade(grade:number){
  if(!Number.isInteger(grade)||grade<1||grade>9)throw new Error('A série deve estar entre o 1º e o 9º ano.');
}

