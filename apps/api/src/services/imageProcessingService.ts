import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config, requiredSecret } from '../config.js';

export interface WorkerSheetResult {
  pageNumber: number;
  barcodePayload: { v: 1 | 2 | 3; t: 'sheet'; sid: string; iat?: number; sig?: string } | null;
  quality: Record<string, number | number[][]>;
  answers: Array<{ question: number; fills: Array<{ choice: 'A' | 'B' | 'C' | 'D' | 'E'; fill: number }> }>;
}
export interface WorkerResult {sheets:WorkerSheetResult[];errors:Array<{pageNumber:number;status:string;message:string}>;summary:{totalDetected:number;success:number;errors:number}}

function processLocally(filePath: string): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const script = path.resolve('workers/omr/omr_worker.py');
    const process = spawn(config.OMR_PYTHON_PATH, [script, '--input', filePath, '--template', 'A4_LANDSCAPE_2UP_HORIZONTAL_V1'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let diagnostics = '';
    process.stdout.on('data', data => output += data);
    process.stderr.on('data', data => diagnostics += data);
    process.once('error', error => reject(new Error(`OMR_WORKER_UNAVAILABLE: ${error.message}`)));
    process.once('close', code => {
      if (code !== 0) return reject(new Error(`OMR_WORKER_FAILED: ${diagnostics.slice(-1000)}`));
      try { resolve(JSON.parse(output) as WorkerResult); }
      catch { reject(new Error('OMR_WORKER_INVALID_OUTPUT')); }
    });
  });
}

async function processOnVercel(filePath: string): Promise<WorkerResult> {
  const workerUrl = new URL('/api/omr-worker', config.WEB_ORIGIN);
  const extension = path.extname(filePath).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.bin';
  workerUrl.searchParams.set('ext', extension);
  const body = await fs.readFile(filePath);
  let lastDetail = 'resposta vazia';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-OMR-Secret': requiredSecret('QR_HMAC_SECRET') },
      body,
      signal: AbortSignal.timeout(240_000),
    });
    const raw = await response.text();
    let payload: WorkerResult | { message?: string } | null = null;
    try { payload = JSON.parse(raw) as WorkerResult | { message?: string }; }
    catch { lastDetail = `HTTP ${response.status}, ${response.headers.get('content-type') ?? 'sem tipo'}, ${raw.length} bytes`; }
    if (!response.ok) throw new Error(`OMR_WORKER_FAILED: ${payload && 'message' in payload ? payload.message : lastDetail}`);
    if (payload && 'sheets' in payload && Array.isArray(payload.sheets) && Array.isArray(payload.errors)) return payload;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 350));
  }
  throw new Error(`OMR_WORKER_INVALID_OUTPUT: ${lastDetail}`);
}

export function processImage(filePath: string): Promise<WorkerResult> {
  return process.env.VERCEL ? processOnVercel(filePath) : processLocally(filePath);
}
