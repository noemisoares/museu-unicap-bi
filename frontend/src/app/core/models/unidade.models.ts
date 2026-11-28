/** Unidade expositora / espaço físico do museu. */
export interface Unidade {
  id: string;
  nome: string;
  sigla?: string;
  descricao?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  responsavel?: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/** Modelo de exposição / mostra vinculado a uma unidade. */
export interface Modelo {
  id: string;
  unidadeId: string;
  nome: string;
  descricao?: string;
  tipo?: 'permanente' | 'temporario' | 'itinerante';
  dataInicio?: string;
  dataFim?: string;
  curador?: string;
  status: 'ativo' | 'encerrado' | 'planejado';
  criadoEm: string;
  atualizadoEm: string;
}

/** Página paginada de unidades. */
export interface UnidadesPage {
  items: Unidade[];
  total: number;
  page: number;
  pageSize: number;
}

/** Filtros opcionais para listagem de unidades. */
export interface UnidadesFilter {
  busca?: string;
  ativo?: boolean;
  page?: number;
  pageSize?: number;
}
