import {describe,expect,it} from 'vitest';
import {decodeClassImport,parseClassCsv} from '../apps/web/src/lib/classImport.js';

describe('importação de turmas',()=>{
 const header='UNIDADE;SERIE;TURMA;ANO LETIVO;TEMPO';
 it('interpreta as colunas da planilha oficial',()=>expect(parseClassCsv(`${header}\nEM BOA VISTA;7º ANO;B;2026;PARCIAL`).rows[0]).toEqual({unit:'EM BOA VISTA',grade:7,name:'B',schoolYear:2026,timeMode:'PARTIAL'}));
 it('consolida linhas repetidas da mesma turma',()=>{const parsed=parseClassCsv(`${header}\nEM BOA VISTA;7º ANO;B;2026;PARCIAL\nEM BOA VISTA;7º ANO;B;2026;PARCIAL`);expect(parsed.rows).toHaveLength(1);expect(parsed.duplicates).toBe(1)});
 it('aceita tempo integral e cabeçalhos sem depender de caixa',()=>expect(parseClassCsv('unidade;serie;turma;ano letivo;tempo\nEscola;2;A;2026;integral').rows[0].timeMode).toBe('FULL'));
 it('decodifica arquivos Windows-1252',()=>{const bytes=Uint8Array.from([49,186,32,65,78,79]);expect(decodeClassImport(bytes.buffer)).toBe('1º ANO')});
 it('rejeita campos obrigatórios inválidos',()=>expect(()=>parseClassCsv(`${header}\nEM BOA VISTA;;B;2026;PARCIAL`)).toThrow('Linha 2 inválida'));
});
