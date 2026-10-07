import crypto from 'node:crypto';import {fileTypeFromBuffer} from 'file-type';
const allowed=new Set(['application/pdf','image/png','image/jpeg']);
export async function inspectUpload(buffer:Buffer,declared:string){const detected=await fileTypeFromBuffer(buffer);if(!detected||!allowed.has(detected.mime)||!allowed.has(declared))throw new Error('Arquivo inválido. Envie PDF, PNG ou JPEG verdadeiro.');return {mime:detected.mime,ext:detected.ext,sha256:crypto.createHash('sha256').update(buffer).digest('hex')};}
