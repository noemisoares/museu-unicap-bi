import { Service } from '@angular/core';
import { getSupabaseClient } from './supabase.client';
import {
  PedagogicalEvaluationRequest,
  PedagogicalEvaluationResponse,
} from '../models/pedagogical.models';

/**
 * Pedagogical evaluation service backed by Supabase RPC.
 *
 * Uses `core.registrar_pedagogica` — a SECURITY DEFINER function that
 * inserts the full evaluation form in a single transaction.
 */
@Service()
export class PedagogicalService {
  private readonly supabase = getSupabaseClient();

  /**
   * Submits a post-visit pedagogical report via the Supabase RPC.
   */
  async submitEvaluation(
    request: PedagogicalEvaluationRequest,
  ): Promise<PedagogicalEvaluationResponse> {
    const { data, error } = await this.supabase.rpc('registrar_pedagogica', {
      p_instituicao_nome: request.institutionName,
      p_rede: request.network,
      p_ciclos: request.cycles,
      p_qtd_estudantes: request.studentCount,
      p_nota_curriculo: request.curriculumAlignmentScore,
      p_avaliacao_mediadores: request.mediatorsRating,
      p_avaliacao_materiais: request.materialsRating,
      p_sugestoes: request.suggestions ?? null,
      p_interesse_visitas_futuras: request.interestedInFutureVisits,
      p_canal_contato: request.contactChannel ?? null,
      p_valor_contato: request.contactValue ?? null,
      p_terminal_nome: 'Formulario Pedagogico Web',
    });

    if (error) {
      throw new Error(error.message || 'Erro ao registrar avaliação pedagógica.');
    }

    const result = data as { protocol: string; evaluatedAt: string };

    return {
      protocol: result.protocol,
      evaluatedAt: result.evaluatedAt,
    };
  }
}
