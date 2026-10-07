export type PointMm={x:number;y:number};
const questionRows = Array.from({length:20},(_,i)=>({question:i+1,y:78+i*4.6,bubbles:['A','B','C','D','E'].map((choice,j)=>({choice,x:34+j*14,y:78+i*4.6,r:2.2}))}));
export const A4_LANDSCAPE_2UP_HORIZONTAL_V1 = Object.freeze({
  id:'A4_LANDSCAPE_2UP_HORIZONTAL_V1', version:1, page:{width:297,height:210,margin:10,cutX:148.5},
  half:{width:148.5,height:210,content:{x:10,y:10,width:128.5,height:190},
    markers:[{x:13,y:13},{x:135.5,y:13},{x:135.5,y:197},{x:13,y:197}], markerSize:4,
    barcode:{x:20,y:19,width:108,height:13}, title:{x:49,y:14}, header:{x:18,y:38,width:112,height:28},
    questions:questionRows, signature:{x:18,y:177,width:112}, footerY:194
  }
});
export const mmToPt=(mm:number)=>mm*72/25.4;
export const mmToPx=(mm:number,pxPerMm=10)=>Math.round(mm*pxPerMm);
