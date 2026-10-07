import type { BubbleReading, Choice, RecognizedAnswer } from '../types.js';
export interface RecognitionConfig { blankThreshold:number; markedThreshold:number; doubleMarkDelta:number; trustedConfidence:number; reviewConfidence:number }
export const DEFAULT_RECOGNITION_CONFIG:RecognitionConfig={blankThreshold:.18,markedThreshold:.42,doubleMarkDelta:.10,trustedConfidence:.90,reviewConfidence:.50};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function recognizeAnswer(question:number, readings:BubbleReading[], c=DEFAULT_RECOGNITION_CONFIG):RecognizedAnswer {
  const sorted=[...readings].sort((a,b)=>b.fill-a.fill), top=sorted[0], second=sorted[1];
  const marked=sorted.filter(x=>x.fill>=c.markedThreshold).map(x=>x.choice);
  if(top.fill<c.blankThreshold) return {question,selected:null,marked:[],status:'BLANK',confidence:clamp(1-top.fill/c.blankThreshold),fills:readings};
  if(marked.length>1 && top.fill-second.fill<=c.doubleMarkDelta) return {question,selected:null,marked,status:'MULTIPLE',confidence:clamp((Math.min(top.fill,second.fill)-c.markedThreshold)/(1-c.markedThreshold)),fills:readings};
  const confidence=clamp(.55*((top.fill-c.blankThreshold)/(1-c.blankThreshold))+.45*((top.fill-second.fill)/(1-second.fill+.001)));
  return {question,selected:top.choice as Choice,marked:[top.choice],status:top.fill>=c.markedThreshold&&confidence>=c.reviewConfidence?'MARKED':'REVIEW',confidence,fills:readings};
}

export function requiresManualReview(answers:RecognizedAnswer[],minimumConfidence:number){
  return answers.some(answer=>answer.status==='REVIEW'||answer.confidence<minimumConfidence);
}
