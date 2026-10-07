import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {allowedChoices,recognizeAnswer,requiresManualReview,verifySheetCode} from '@omr/core';
import type {Prisma} from '@prisma/client';
import {config,requiredSecret} from '../config.js';
import {db} from '../db.js';
import {inspectUpload} from './uploadSecurity.js';
import {processImage,type WorkerSheetResult} from './imageProcessingService.js';

const recognitionConfig={blankThreshold:config.OMR_BLANK_THRESHOLD,markedThreshold:config.OMR_MARKED_THRESHOLD,doubleMarkDelta:config.OMR_DOUBLE_MARK_DELTA,trustedConfidence:config.OMR_TRUSTED_CONFIDENCE,reviewConfidence:config.OMR_REVIEW_CONFIDENCE};

type UploadContext={uploadId:string;fileName:string};
const processingQuality=(quality:unknown,upload:UploadContext)=>({...((quality&&typeof quality==='object'&&!Array.isArray(quality))?quality:{}),uploadId:upload.uploadId,fileName:upload.fileName}) as Prisma.InputJsonValue;

async function failedProcessing(userId:string,safe:{mime:string;sha256:string},code:string,detail:string,upload:UploadContext,quality?:Prisma.InputJsonValue){
 return db.readingProcessing.create({data:{uploadedBy:userId,status:'FAILED',storagePath:`ephemeral:${safe.sha256}`,mimeType:safe.mime,sha256:safe.sha256,algorithmVersion:'opencv-v2',quality:processingQuality(quality,upload),errorCode:code.slice(0,100),errorDetail:detail.slice(0,500),startedAt:new Date(),finishedAt:new Date()}});
}

async function persistSheet(result:WorkerSheetResult,userId:string,organizationId:string,safe:{mime:string;sha256:string},upload:UploadContext){
 try{
  if(!result.barcodePayload)throw new Error('BARCODE_NOT_DETECTED');
  if(!verifySheetCode(result.barcodePayload,requiredSecret('QR_HMAC_SECRET')))throw new Error('BARCODE_INVALID_OR_UNSIGNED');
  const sheet=await db.answerSheet.findFirst({where:{publicCode:result.barcodePayload.sid,assessment:{unit:{organizationId}}},include:{assessment:true}});
  if(!sheet)throw new Error('ANSWER_SHEET_NOT_FOUND');
  const permitted=new Set(allowedChoices(sheet.assessment.grade));
  const answers=result.answers.slice(0,sheet.assessment.questionCount).map(answer=>recognizeAnswer(answer.question,answer.fills.filter(fill=>permitted.has(fill.choice)),recognitionConfig));
  if(answers.length!==sheet.assessment.questionCount)throw new Error('ANSWER_GRID_INCOMPLETE');
  const needsReview=requiresManualReview(answers,recognitionConfig.reviewConfidence);
  return db.readingProcessing.create({data:{sheetId:sheet.id,uploadedBy:userId,status:needsReview?'REVIEW_REQUIRED':'READY',storagePath:`ephemeral:${safe.sha256}`,mimeType:safe.mime,sha256:safe.sha256,algorithmVersion:'opencv-v2',quality:processingQuality(result.quality,upload),startedAt:new Date(),finishedAt:new Date(),answers:{create:answers.map(answer=>({question:answer.question,detectedChoice:answer.selected,finalChoice:answer.selected,status:answer.status,confidence:answer.confidence,fills:answer.fills as unknown as Prisma.InputJsonValue}))}},include:{answers:true,sheet:{include:{assessment:true,student:true}}}});
 }catch(error){return failedProcessing(userId,safe,(error as Error).message.split(':')[0],(error as Error).message,upload,result.quality as Prisma.InputJsonValue);}
}

export async function processUpload(buffer:Buffer,declaredMime:string,userId:string,organizationId:string,upload:UploadContext){
 const safe=await inspectUpload(buffer,declaredMime),temporaryPath=path.join(os.tmpdir(),`omr-${crypto.randomUUID()}.${safe.ext}`);
 try{
  await fs.writeFile(temporaryPath,buffer);
  const worker=await processImage(temporaryPath),items=[];
  for(const result of worker.sheets)items.push(await persistSheet(result,userId,organizationId,safe,upload));
  for(const error of worker.errors)items.push(await failedProcessing(userId,safe,error.status,error.message,upload,{pageNumber:error.pageNumber}));
  if(!items.length)items.push(await failedProcessing(userId,safe,'NO_ANSWER_SHEET_FOUND','Nenhum gabarito foi encontrado no arquivo.',upload));
  const success=items.filter(item=>item.status==='READY').length,review=items.filter(item=>item.status==='REVIEW_REQUIRED').length,errors=items.filter(item=>item.status==='FAILED').length;
  return{items,summary:{totalProcessed:items.length,totalSuccess:success,totalWithAlert:review,totalWithError:errors,totalRequiringReview:review}};
 }finally{
  await fs.rm(temporaryPath,{force:true});
 }
}
