import { vi } from 'vitest';
import { SatisfactionService } from './satisfaction.service';
import { SatisfactionEvaluationRequest } from '../models/satisfaction.models';

// ---------------------------------------------------------------------------
// SatisfactionService unit tests
// ---------------------------------------------------------------------------
// No TestBed needed — service has no Angular DI token dependencies.
// We replace the internal `supabase` property with a mock object.
// ---------------------------------------------------------------------------

describe('SatisfactionService', () => {
  let service: SatisfactionService;

  beforeEach(() => {
    service = new SatisfactionService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should query active satisfaction topics from core.topico', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [{ id: 'uuid-1', nome: 'Acervo Histórico', icon: 'history_edu', tipo: 'SATISFACAO', ativo: true }],
      error: null,
    });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const inMock = vi.fn().mockReturnValue({ eq: eqMock });
    const selectMock = vi.fn().mockReturnValue({ in: inMock });
    const fromSpy = vi
      .spyOn((service as unknown as { supabase: { from: (...args: unknown[]) => unknown } }).supabase, 'from')
      .mockReturnValue({ select: selectMock } as never);

    const topics = await service.getTopics();
    expect(fromSpy).toHaveBeenCalledWith('topico');
    expect(topics).toEqual([
      { id: 'uuid-1', label: 'Acervo Histórico', icon: 'history_edu' },
    ]);
  });

  it('should call registrar_satisfacao RPC for anonymous evaluation', async () => {
    const rpcSpy = vi
      .spyOn((service as unknown as { supabase: { rpc: (...args: unknown[]) => unknown } }).supabase, 'rpc')
      .mockResolvedValue({
        data: { protocol: 'SAT-2026-654321', evaluatedAt: '2026-10-18T09:05:00-03:00' },
        error: null,
      });

    const request: SatisfactionEvaluationRequest = {
      rating: 5,
      topicIds: ['uuid-1'],
      terminalId: 'Totem Saida 01',
    };

    const result = await service.submitEvaluation(request);
    expect(rpcSpy).toHaveBeenCalledWith('registrar_satisfacao', {
      p_nota: 5,
      p_topico_ids: ['uuid-1'],
      p_terminal_nome: 'Totem Saida 01',
    });
    expect(result.protocol).toBe('SAT-2026-654321');
  });
});
