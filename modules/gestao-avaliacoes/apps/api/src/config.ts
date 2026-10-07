import dotenv from 'dotenv';import path from 'node:path';import {fileURLToPath} from 'node:url';import z from 'zod';
dotenv.config({path:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../.env')});
export const config=z.object({NODE_ENV:z.enum(['development','test','production']).default('production'),PORT:z.coerce.number().default(3001),WEB_ORIGIN:z.string().url(),SUPABASE_URL:z.string().url(),SUPABASE_PUBLISHABLE_KEY:z.string().min(1),SUPABASE_SECRET_KEY:z.string().min(1).optional(),QR_HMAC_SECRET:z.string().min(32).optional(),CALIBRI_FONT_PATH:z.string().optional(),OMR_PYTHON_PATH:z.string().default('python'),MAX_UPLOAD_BYTES:z.coerce.number().default(15728640),OMR_BLANK_THRESHOLD:z.coerce.number().min(0).max(1).default(.18),OMR_MARKED_THRESHOLD:z.coerce.number().min(0).max(1).default(.42),OMR_DOUBLE_MARK_DELTA:z.coerce.number().min(0).max(1).default(.10),OMR_TRUSTED_CONFIDENCE:z.coerce.number().min(0).max(1).default(.90),OMR_REVIEW_CONFIDENCE:z.coerce.number().min(0).max(1).default(.50)}).parse(process.env);

export function requiredSecret(name:'SUPABASE_SECRET_KEY'|'QR_HMAC_SECRET'){
 const value=config[name];
 if(!value)throw new Error(`Configuração protegida ${name} ausente na Vercel.`);
 return value;
}

