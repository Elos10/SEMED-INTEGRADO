export type Unit={id:string;name:string;code?:string};
export type SchoolClass={id:string;unitId:string;name:string;grade:number;schoolYear:number;timeMode:'PARTIAL'|'FULL';unit:Unit;_count?:{students:number}};
export type Student={id:string;name:string;registration?:string;classId:string;schoolClass:SchoolClass};
export type Assessment={id:string;number:string;year:number;grade:number;subject:'PORTUGUESE'|'MATHEMATICS'|'SINGLE';timeMode:'PARTIAL'|'FULL'|'ALL';questionCount:number;assessmentDate:string;unit:Unit;schoolClass?:SchoolClass|null;key?:Array<{question:number;choice:string}>;sheets?:Array<{id:string;student?:Student}>;_count?:{key:number;sheets:number}};
export type Processing={id:string;status:string;mimeType:string;createdAt:string;errorCode?:string;errorDetail?:string;quality?:{alignment?:number;uploadId?:string;fileName?:string};sheet?:{student?:Student;assessment:Assessment};answers?:Answer[];result?:{id:string;correct:number;wrong:number;blank:number;invalid:number;total:number;percentage:number;score:number};_count?:{answers:number}};
export type Answer={question:number;detectedChoice?:string;finalChoice?:string;status:string;confidence:number;fills:Array<{choice:string;fill:number}>};
export type Result={id:string;correct:number;wrong:number;blank:number;invalid:number;total:number;percentage:number;score:number;finalizedAt:string;sheet:{student?:Student;assessment:Assessment}};
export type ResultAnswerSheet={result:Pick<Result,'id'|'correct'|'wrong'|'blank'|'invalid'|'total'|'percentage'|'score'>;sheet:{student?:Student;assessment:Assessment};answers:Array<Answer&{markedChoices:string[]}>};
export const subjectLabel=(s:string)=>s==='SINGLE'?'Prova Única':s==='PORTUGUESE'?'Língua Portuguesa':'Matemática';
