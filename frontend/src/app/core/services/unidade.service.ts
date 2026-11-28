import { Injectable } from '@angular/core';
import {
  Modelo,
  Unidade,
  UnidadesFilter,
  UnidadesPage,
} from '../models/unidade.models';

// TODO: Replace mock data with Supabase queries once core.unidade and core.modelo
// tables are created and RPCs are implemented in the database.

const MOCK_UNIDADES: Unidade[] = [
  {
    id: 'unidade-01',
    nome: 'Espaço Cultural UNICAP',
    sigla: 'ECU',
    descricao: 'Espaço principal de exposições e eventos culturais da Universidade Católica de Pernambuco.',
    endereco: 'Rua do Príncipe, 526',
    cidade: 'Recife',
    estado: 'PE',
    cep: '50050-450',
    telefone: '(81) 2102-5000',
    email: 'espacocultural@unicap.br',
    responsavel: 'Coordenação Cultural',
    ativo: true,
    criadoEm: '2025-01-10T08:00:00Z',
    atualizadoEm: '2026-01-15T10:30:00Z',
  },
  {
    id: 'unidade-02',
    nome: 'Museu de Arte Sacra',
    sigla: 'MAS',
    descricao: 'Acervo de arte sacra e peças históricas da região Nordeste.',
    endereco: 'Rua do Príncipe, 526',
    cidade: 'Recife',
    estado: 'PE',
    cep: '50050-450',
    telefone: '(81) 2102-5100',
    email: 'museu@unicap.br',
    responsavel: 'Curadoria de Arte Sacra',
    ativo: true,
    criadoEm: '2025-02-05T09:00:00Z',
    atualizadoEm: '2026-02-20T14:00:00Z',
  },
  {
    id: 'unidade-03',
    nome: 'Galeria de Fotografias',
    sigla: 'GF',
    descricao: 'Espaço dedicado a mostras fotográficas temporárias.',
    endereco: 'Rua do Príncipe, 526',
    cidade: 'Recife',
    estado: 'PE',
    cep: '50050-450',
    telefone: '(81) 2102-5200',
    email: 'galeria@unicap.br',
    responsavel: 'Coordenação de Exposições',
    ativo: false,
    criadoEm: '2025-03-12T10:00:00Z',
    atualizadoEm: '2026-03-01T11:00:00Z',
  },
];

const MOCK_MODELOS: Record<string, Modelo[]> = {
  'unidade-01': [
    {
      id: 'modelo-01',
      unidadeId: 'unidade-01',
      nome: 'Mostra Permanente: Identidade Pernambucana',
      descricao: 'Percurso expositivo sobre a cultura e identidade de Pernambuco.',
      tipo: 'permanente',
      dataInicio: '2025-03-01T00:00:00Z',
      curador: 'Maria Silva',
      status: 'ativo',
      criadoEm: '2025-02-15T09:00:00Z',
      atualizadoEm: '2026-01-10T10:00:00Z',
    },
    {
      id: 'modelo-02',
      unidadeId: 'unidade-01',
      nome: 'Mostra Temporária: Artes Visuais Contemporâneas',
      descricao: 'Coletiva de artistas emergentes de Pernambuco e Paraíba.',
      tipo: 'temporario',
      dataInicio: '2026-04-01T00:00:00Z',
      dataFim: '2026-08-31T23:59:59Z',
      curador: 'João Oliveira',
      status: 'ativo',
      criadoEm: '2026-02-20T11:00:00Z',
      atualizadoEm: '2026-03-15T15:00:00Z',
    },
  ],
  'unidade-02': [
    {
      id: 'modelo-03',
      unidadeId: 'unidade-02',
      nome: 'Acervo Histórico de Arte Sacra',
      descricao: 'Peças sacras dos séculos XVII a XIX.',
      tipo: 'permanente',
      dataInicio: '2025-06-01T00:00:00Z',
      curador: 'Ana Costa',
      status: 'ativo',
      criadoEm: '2025-05-10T08:30:00Z',
      atualizadoEm: '2026-01-20T12:00:00Z',
    },
  ],
  'unidade-03': [],
};

/**
 * Service for unidade (exhibition space) and modelo (exhibition show) data.
 *
 * Currently backed by mock data — Supabase tables core.unidade/core.modelo
 * are not yet created. When those tables and RPCs are ready, replace the
 * method bodies with Supabase calls.
 */
@Injectable({ providedIn: 'root' })
export class UnidadeService {
  async getUnidades(filter?: UnidadesFilter): Promise<UnidadesPage> {
    return this.getMockUnidades(filter);
  }

  async getUnidadeById(id: string): Promise<Unidade> {
    const unidade = MOCK_UNIDADES.find((u) => u.id === id);
    if (!unidade) {
      throw new Error(`Unidade ${id} não encontrada.`);
    }
    return unidade;
  }

  async getModelosByUnidade(unidadeId: string): Promise<Modelo[]> {
    return MOCK_MODELOS[unidadeId] ?? [];
  }

  async getModeloById(unidadeId: string, modeloId: string): Promise<Modelo> {
    const modelos = MOCK_MODELOS[unidadeId] ?? [];
    const modelo = modelos.find((m) => m.id === modeloId);
    if (!modelo) {
      throw new Error(`Modelo ${modeloId} não encontrado na unidade ${unidadeId}.`);
    }
    return modelo;
  }

  private getMockUnidades(filter?: UnidadesFilter): Promise<UnidadesPage> {
    let result = [...MOCK_UNIDADES];

    if (filter?.busca) {
      const q = filter.busca.toLowerCase();
      result = result.filter(
        (u) =>
          u.nome.toLowerCase().includes(q) ||
          u.cidade?.toLowerCase().includes(q) ||
          u.estado?.toLowerCase().includes(q),
      );
    }

    if (filter?.ativo !== undefined) {
      result = result.filter((u) => u.ativo === filter.ativo);
    }

    const page = filter?.page ?? 1;
    const pageSize = filter?.pageSize ?? 10;
    const total = result.length;
    const start = (page - 1) * pageSize;
    const items = result.slice(start, start + pageSize);

    return Promise.resolve({ items, total, page, pageSize });
  }
}
