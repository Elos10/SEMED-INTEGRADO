import {describe,expect,it} from 'vitest';
import {canonicalUnitName,matchesStudentGroupContext} from '../apps/api/src/services/studentService.js';
import {parseStudentCsv} from '../apps/web/src/lib/studentImport.js';

describe('importação de alunos',()=>{
 it('interpreta o modelo CSV com os campos escolares',()=>{
  const [row]=parseStudentCsv('nome;matricula;unidade;serie;turma;tempo\nMaria da Silva;20260001;Escola Centro;7;7º A;Parcial');
  expect(row).toEqual({name:'Maria da Silva',registration:'20260001',unit:'Escola Centro',grade:7,className:'7º A',timeMode:'PARTIAL'});
 });
 it('aceita tempo integral e série formatada',()=>expect(parseStudentCsv('nome;matricula;unidade;serie;turma;tempo\nJoão;;Escola Norte;8º ano;8º B;Integral')[0].timeMode).toBe('FULL'));
 it('rejeita cabeçalho incompleto',()=>expect(()=>parseStudentCsv('nome;turma\nAna;1º A')).toThrow('Cabeçalho inválido'));
 it('rejeita arquivos acima de 30.000 alunos',()=>{const row='Ana;;Escola Norte;8;8º B;Integral';expect(()=>parseStudentCsv(`nome;matricula;unidade;serie;turma;tempo\n${Array.from({length:30_001},()=>row).join('\n')}`)).toThrow('30.000 alunos')});
 it('reconhece abreviações equivalentes de escola municipal',()=>{
  expect(canonicalUnitName('EM ADOLFO BEZERRA DE MENEZES')).toBe(canonicalUnitName('Escola Municipal Adolfo Bezerra de Menezes'));
 });
 it('não restringe os alunos quando a busca corresponde à unidade ou turma',()=>{
  expect(matchesStudentGroupContext('Celina Soares','4º A','EM CELINA SOARES DE PAIVA')).toBe(true);
  expect(matchesStudentGroupContext('4 A','4º A','EM CELINA SOARES DE PAIVA')).toBe(true);
  expect(matchesStudentGroupContext('Maria','4º A','EM CELINA SOARES DE PAIVA')).toBe(false);
 });
});
