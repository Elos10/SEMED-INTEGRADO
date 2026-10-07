import type { Choice, Grade, RecognizedAnswer } from '../types.js';
export function gradeAnswers(answers:RecognizedAnswer[], key:Choice[]):Grade {
  if(answers.length!==key.length) throw new Error('A quantidade de respostas difere do gabarito oficial.');
  let correct=0,blank=0,invalid=0;
  answers.forEach((a,i)=>{if(a.status==='BLANK') blank++; else if(a.status==='MULTIPLE'||a.status==='REVIEW'||!a.selected) invalid++; else if(a.selected===key[i]) correct++;});
  const wrong=answers.length-correct-blank-invalid, percentage=correct/answers.length*100;
  return {total:answers.length,correct,wrong,blank,invalid,percentage:Number(percentage.toFixed(2)),score:correct};
}
