import { Service } from '@angular/core';
import { getSupabaseClient } from './supabase.client';
import {
  SatisfactionEvaluationRequest,
  SatisfactionEvaluationResponse,
  SatisfactionTopic,
} from '../models/satisfaction.models';

/**
 * Satisfaction survey service backed by Supabase.
 *
 * Topics are loaded from `core.topico` (filtered by tipo SATISFACAO or AMBOS).
 * Evaluations are submitted via `core.registrar_satisfacao` RPC.
 */
@Service()
export class SatisfactionService {
  private readonly supabase = getSupabaseClient();

  /**
   * Loads active satisfaction topics from the database.
   * Maps the database schema to the frontend `SatisfactionTopic` interface.
   */
  async getTopics(): Promise<SatisfactionTopic[]> {
    const { data, error } = await this.supabase
      .from('topico')
      .select('id, nome, icon, tipo, ativo')
      .in('tipo', ['SATISFACAO', 'AMBOS'])
      .eq('ativo', true)
      .order('nome');

    if (error) {
      throw new Error(error.message || 'Erro ao carregar tópicos.');
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      label: row.nome,
      icon: row.icon ?? 'help_outline',
    }));
  }

  /**
   * Submits an anonymous satisfaction evaluation via the Supabase RPC.
   */
  async submitEvaluation(
    request: SatisfactionEvaluationRequest,
  ): Promise<SatisfactionEvaluationResponse> {
    const { data, error } = await this.supabase.rpc('registrar_satisfacao', {
      p_nota: request.rating,
      p_topico_ids: request.topicIds.length > 0 ? request.topicIds : [],
      p_terminal_nome: request.terminalId || 'Totem Saida 01',
    });

    if (error) {
      throw new Error(error.message || 'Erro ao registrar avaliação.');
    }

    const result = data as { protocol: string; evaluatedAt: string };

    return {
      protocol: result.protocol,
      evaluatedAt: result.evaluatedAt,
    };
  }
}
