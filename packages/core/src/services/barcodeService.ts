import crypto from 'node:crypto';
import bwipjs from 'bwip-js';

export interface SheetCodePayload {v:1|2|3;t:'sheet';sid:string;iat?:number;sig?:string}
const sign=(value:string,secret:string,length=16)=>crypto.createHmac('sha256',secret).update(value).digest('base64url').slice(0,length);
const uuidToShort=(uuid:string)=>Buffer.from(uuid.replaceAll('-',''),'hex').toString('base64url');
const shortToUuid=(value:string)=>{const hex=Buffer.from(value,'base64url').toString('hex');return hex.length===32?`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`:null};

export function createBarcodeToken(sheetId:string,_secret:string){return `S3${uuidToShort(sheetId)}`}
export function parseBarcodeToken(token:string):SheetCodePayload|null{const value=token.trim(),compact=/^S3([A-Za-z0-9_-]{22})$/.exec(value),signed=/^S2([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{16})$/.exec(value),match=compact??signed;if(!match)return null;const sid=shortToUuid(match[1]);return sid?{v:compact?3:2,t:'sheet',sid,...(signed?{sig:signed[2]}:{})}:null}
export function verifySheetCode(payload:SheetCodePayload,secret:string){if(!payload||payload.t!=='sheet'||typeof payload.sid!=='string')return false;if(payload.v===3)return uuidToShort(payload.sid).length===22;if(typeof payload.sig!=='string')return false;const expected=payload.v===2?sign(`S2${uuidToShort(payload.sid)}`,secret):sign(`${payload.v}|${payload.sid}|${payload.iat}`,secret,22);const actual=Buffer.from(payload.sig),wanted=Buffer.from(expected);return actual.length===wanted.length&&crypto.timingSafeEqual(wanted,actual)}
export function barcodePng(token:string){return bwipjs.toBuffer({bcid:'code128',text:token,scale:4,height:12,includetext:false,paddingwidth:0,paddingheight:0})}

// Compatibilidade de leitura com folhas antigas que ainda possuem QR Code.
export interface QrPayload extends SheetCodePayload {v:1;iat:number;sig:string}
export const verifyQrPayload=verifySheetCode;
