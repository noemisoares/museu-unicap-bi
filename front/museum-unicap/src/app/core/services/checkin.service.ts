import { Service } from '@angular/core';
import { getSupabaseClient } from './supabase.client';
import { CheckInRequest, CheckInResponse } from '../models/checkin.models';

/**
 * Check-in service backed by Supabase RPC.
 *
 * Uses `core.registrar_checkin` — a SECURITY DEFINER function that handles
 * terminal resolution, timestamp, protocol generation, and PII insertion
 * in a single transaction.
 */
@Service()
export class CheckInService {
  private readonly supabase = getSupabaseClient();

  /**
   * Registers a museum entry via the Supabase RPC function.
   * Returns the generated protocol and timestamp.
   */
  async submitCheckIn(request: CheckInRequest): Promise<CheckInResponse> {
    const { data, error } = await this.supabase.rpc('registrar_checkin', {
      p_tipo_visita: request.visitType,
      p_qtd_visitantes: request.visitorCount,
      p_faixa_etaria: request.visitorAgeRange,
      p_vinculo: request.institutionalBond,
      p_uf: request.federationUnit,
      p_cidade: request.municipality,
      p_bairro: request.neighborhood ?? null,
      p_terminal_nome: request.terminalId || 'Check-in Recepcao',
      p_contato_nome: null,
      p_contato_email: request.contact?.email ?? null,
      p_contato_whatsapp: request.contact?.phone ?? null,
      p_consentimento: request.contact?.communicationConsent ?? false,
    });

    if (error) {
      throw new Error(error.message || 'Erro ao registrar check-in.');
    }

    // The RPC returns a JSONB object
    const result = data as { protocol: string; checkedInAt: string; visitationId: string };

    return {
      protocol: result.protocol,
      checkedInAt: result.checkedInAt,
    };
  }
}
