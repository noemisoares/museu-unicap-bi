import { Service } from '@angular/core';
import { getSupabaseClient } from './supabase.client';
import {
  ContactsPage,
  DashboardSummary,
  ShareEntry,
  AgeDistributionEntry,
  RatingDistributionEntry,
  TopicEntry,
  PedagogicalIndicators,
} from '../models/dashboard.models';

export type DashboardPeriod = 'semester' | '30d' | 'all';

interface PeriodBounds {
  start: string | null;
  end: string | null;
}

/**
 * Dashboard service backed by Supabase real data.
 *
 * Uses direct queries against `core` tables (protected by RLS `core.is_admin()`)
 * and `SECURITY DEFINER` RPCs for `pii.contato` (so `pii` is never exposed directly).
 */
@Service()
export class DashboardService {
  private readonly supabase = getSupabaseClient();

  /**
   * Builds the complete dashboard summary from real database queries,
   * filtered by the selected period.
   */
  async getSummary(period: DashboardPeriod = 'semester'): Promise<DashboardSummary> {
    const bounds = this.getPeriodBounds(period);

    const [
      visitData,
      satisfactionData,
      topicAssociations,
      pedagogicalData,
      contactsOptInCount,
    ] = await Promise.all([
      this.fetchVisits(bounds),
      this.fetchSatisfaction(bounds),
      this.fetchTopicAssociations(bounds),
      this.fetchPedagogical(bounds),
      this.fetchContactsOptInCount(bounds),
    ]);

    const totalVisits = visitData.length;
    const schoolVisits = visitData.filter((v) => v.tipo_visita === 'GRUPO_ESCOLAR');
    const studentsMediated = schoolVisits.reduce(
      (sum, v) => sum + (v.qtd_visitantes ?? 1),
      0,
    );
    const schoolsServed = pedagogicalData.length > 0
      ? new Set(pedagogicalData.map((p) => p.instituicao_nome.trim().toLowerCase())).size
      : schoolVisits.length;

    const totalRatings = satisfactionData.length;
    const positiveRatings = satisfactionData.filter((r) => (r.nota_likert ?? 0) >= 4).length;
    const averageRating =
      totalRatings > 0
        ? Math.round(
            (satisfactionData.reduce((sum, r) => sum + (r.nota_likert ?? 0), 0) /
              totalRatings) *
              10,
          ) / 10
        : 0;
    const satisfactionPositivePct =
      totalRatings > 0 ? Math.round((positiveRatings / totalRatings) * 1000) / 10 : 0;

    return {
      generatedAt: new Date().toISOString(),
      totalVisits,
      totalVisitsTrendPct: 0,
      schoolsServed,
      studentsMediated,
      satisfactionPositivePct,
      averageRating,
      contactsOptIn: contactsOptInCount,
      contactsOptInPct:
        totalVisits > 0 ? Math.round((contactsOptInCount / totalVisits) * 1000) / 10 : 0,
      ageDistribution: this.computeAgeDistribution(visitData),
      visitTypeShare: this.computeVisitTypeShare(visitData),
      cityRanking: this.computeCityRanking(visitData),
      neighborhoodHighlights: this.computeNeighborhoodHighlights(visitData),
      ratingDistribution: this.computeRatingDistribution(satisfactionData),
      topTopics: await this.computeTopTopics(topicAssociations),
      pedagogical: this.computePedagogicalIndicators(pedagogicalData),
      contacts: { items: [], total: contactsOptInCount, page: 1, pageSize: 4 },
    };
  }

  /**
   * Returns paginated contacts with explicit LGPD consent via protected RPC.
   */
  async getContacts(page: number, pageSize = 4): Promise<ContactsPage> {
    const { data, error } = await this.supabase.rpc('listar_contatos_admin', {
      p_page: page,
      p_page_size: pageSize,
    });

    if (error) {
      throw new Error(error.message || 'Erro ao carregar contatos.');
    }

    return data as ContactsPage;
  }

  private getPeriodBounds(period: DashboardPeriod): PeriodBounds {
    const now = new Date();
    if (period === '30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString(), end: null };
    }
    if (period === 'semester') {
      const month = now.getMonth();
      const semesterStartMonth = month < 6 ? 0 : 6;
      const start = new Date(now.getFullYear(), semesterStartMonth, 1);
      return { start: start.toISOString(), end: null };
    }
    return { start: null, end: null };
  }

  private async fetchVisits(bounds: PeriodBounds) {
    let query = this.supabase
      .from('visitacao')
      .select('tipo_visita, qtd_visitantes, faixa_etaria, cidade, bairro, data_hora');

    if (bounds.start) {
      query = query.gte('data_hora', bounds.start);
    }
    if (bounds.end) {
      query = query.lt('data_hora', bounds.end);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message || 'Erro ao consultar visitações.');
    }
    return data ?? [];
  }

  private async fetchSatisfaction(bounds: PeriodBounds) {
    let query = this.supabase
      .from('avaliacao_satisfacao')
      .select('id, nota_likert, criado_em')
      .not('nota_likert', 'is', null);

    if (bounds.start) {
      query = query.gte('criado_em', bounds.start);
    }
    if (bounds.end) {
      query = query.lt('criado_em', bounds.end);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message || 'Erro ao consultar avaliações de satisfação.');
    }
    return data ?? [];
  }

  private async fetchTopicAssociations(bounds: PeriodBounds) {
    let query = this.supabase
      .from('avaliacao_satisfacao_topico')
      .select('topico_id, avaliacao_satisfacao!inner(criado_em)');

    if (bounds.start) {
      query = query.gte('avaliacao_satisfacao.criado_em', bounds.start);
    }
    if (bounds.end) {
      query = query.lt('avaliacao_satisfacao.criado_em', bounds.end);
    }

    const { data, error } = await query;
    if (error) {
      return [];
    }
    return (data ?? []) as { topico_id: string }[];
  }

  private async fetchPedagogical(bounds: PeriodBounds) {
    let query = this.supabase
      .from('avaliacao_pedagogica_completa')
      .select(
        'instituicao_nome, nota_curriculo, avaliacao_mediadores, rede, interesse_visitas_futuras, criado_em',
      );

    if (bounds.start) {
      query = query.gte('criado_em', bounds.start);
    }
    if (bounds.end) {
      query = query.lt('criado_em', bounds.end);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message || 'Erro ao consultar avaliações pedagógicas.');
    }
    return data ?? [];
  }

  private async fetchContactsOptInCount(bounds: PeriodBounds): Promise<number> {
    const { data, error } = await this.supabase.rpc('contar_contatos_optin', {
      p_inicio: bounds.start,
      p_fim: bounds.end,
    });
    if (error) {
      throw new Error(error.message || 'Erro ao consultar contagem de contatos.');
    }
    return Number(data ?? 0);
  }

  private computeAgeDistribution(
    data: { faixa_etaria: string | null; qtd_visitantes: number | null }[],
  ): AgeDistributionEntry[] {
    const ranges: Array<'crianca' | 'jovem' | 'adulto' | 'senior'> = [
      'crianca',
      'jovem',
      'adulto',
      'senior',
    ];
    if (!data.length) {
      return ranges.map((range) => ({ range, count: 0, percentage: 0 }));
    }

    const totals: Record<string, number> = {};
    let total = 0;
    for (const row of data) {
      const key = (row.faixa_etaria ?? 'adulto').toLowerCase();
      const qty = row.qtd_visitantes ?? 1;
      totals[key] = (totals[key] ?? 0) + qty;
      total += qty;
    }

    return ranges.map((range) => ({
      range,
      count: totals[range] ?? 0,
      percentage: total > 0 ? Math.round(((totals[range] ?? 0) / total) * 100) : 0,
    }));
  }

  private computeVisitTypeShare(data: { tipo_visita: string }[]): ShareEntry[] {
    if (!data.length) return [];

    const totals: Record<string, number> = {};
    for (const row of data) {
      totals[row.tipo_visita] = (totals[row.tipo_visita] ?? 0) + 1;
    }

    const total = data.length;
    const labels: Record<string, string> = {
      INDIVIDUAL: 'Individual / Espontânea',
      FAMILIA: 'Famílias',
      GRUPO_ESCOLAR: 'Grupos Escolares',
      ACADEMICO: 'Pesquisa / Cultural',
      GRUPO_OUTRO: 'Outros Grupos',
    };

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        label: labels[key] ?? key,
        count,
        percentage: Math.round((count / total) * 100),
      }));
  }

  private computeCityRanking(data: { cidade: string | null }[]): ShareEntry[] {
    if (!data.length) return [];

    const totals: Record<string, number> = {};
    for (const row of data) {
      const city = row.cidade ?? 'Não informado';
      totals[city] = (totals[city] ?? 0) + 1;
    }

    const total = data.length;
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({
        label,
        count,
        percentage: Math.round((count / total) * 100),
      }));
  }

  private computeNeighborhoodHighlights(data: { bairro: string | null }[]): ShareEntry[] {
    const withNeighborhood = data.filter((r) => Boolean(r.bairro));
    if (!withNeighborhood.length) return [];

    const totals: Record<string, number> = {};
    for (const row of withNeighborhood) {
      totals[row.bairro!] = (totals[row.bairro!] ?? 0) + 1;
    }

    const total = withNeighborhood.length;
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({
        label,
        count,
        percentage: Math.round((count / total) * 100),
      }));
  }

  private computeRatingDistribution(
    data: { nota_likert: number | null }[],
  ): RatingDistributionEntry[] {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of data) {
      if (row.nota_likert && row.nota_likert >= 1 && row.nota_likert <= 5) {
        counts[row.nota_likert]++;
      }
    }

    const total = data.length;
    return ([5, 4, 3, 2, 1] as const).map((rating) => ({
      rating,
      count: counts[rating],
      percentage: total > 0 ? Math.round((counts[rating] / total) * 1000) / 10 : 0,
    }));
  }

  private async computeTopTopics(
    associations: { topico_id: string }[],
  ): Promise<TopicEntry[]> {
    if (!associations.length) return [];

    const mentionCounts: Record<string, number> = {};
    for (const row of associations) {
      mentionCounts[row.topico_id] = (mentionCounts[row.topico_id] ?? 0) + 1;
    }

    const topicIds = Object.keys(mentionCounts);
    const { data: topics } = await this.supabase
      .from('topico')
      .select('id, nome, icon')
      .in('id', topicIds);

    if (!topics?.length) return [];

    const totalEvals = associations.length;
    return topics
      .map((topic) => ({
        topicId: topic.id,
        label: topic.nome,
        icon: topic.icon ?? 'help_outline',
        mentions: mentionCounts[topic.id] ?? 0,
        percentage:
          totalEvals > 0
            ? Math.round(((mentionCounts[topic.id] ?? 0) / totalEvals) * 100)
            : 0,
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5);
  }

  private computePedagogicalIndicators(
    data: {
      nota_curriculo: number;
      avaliacao_mediadores: string;
      rede: string;
      interesse_visitas_futuras: boolean;
    }[],
  ): PedagogicalIndicators {
    if (!data.length) {
      return {
        curriculumAlignmentAvg: 0,
        mediatorsExcellentPct: 0,
        networkShare: [],
        futureVisitsInterestPct: 0,
      };
    }

    const total = data.length;
    const curriculumAvg =
      data.reduce((sum, r) => sum + (r.nota_curriculo ?? 0), 0) / total;
    const excellentCount = data.filter(
      (r) => r.avaliacao_mediadores === 'EXCELENTE',
    ).length;
    const futureCount = data.filter((r) => r.interesse_visitas_futuras).length;

    const networkCounts: Record<string, number> = {};
    for (const row of data) {
      networkCounts[row.rede] = (networkCounts[row.rede] ?? 0) + 1;
    }

    const networkLabels: Record<string, string> = {
      ESTADUAL: 'Pública Estadual',
      MUNICIPAL: 'Pública Municipal',
      PRIVADA: 'Rede Privada',
      FEDERAL: 'Rede Federal / IFPE',
    };

    return {
      curriculumAlignmentAvg: Math.round(curriculumAvg * 10) / 10,
      mediatorsExcellentPct: Math.round((excellentCount / total) * 100),
      networkShare: Object.entries(networkCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({
          label: networkLabels[key] ?? key,
          percentage: Math.round((count / total) * 100),
        })),
      futureVisitsInterestPct: Math.round((futureCount / total) * 100),
    };
  }
}
