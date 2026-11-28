import { vi } from 'vitest';
import { CheckInService } from './checkin.service';
import { CheckInRequest, CheckInResponse } from '../models/checkin.models';

// ---------------------------------------------------------------------------
// CheckInService unit tests
// ---------------------------------------------------------------------------
// These tests instantiate CheckInService directly (no TestBed needed — the
// service has no Angular DI token dependencies beyond getSupabaseClient(),
// which is mocked by spying on the private `supabase` property).
// ---------------------------------------------------------------------------

describe('CheckInService', () => {
  let service: CheckInService;
  let rpcSpy: ReturnType<typeof vi.fn>;

  const request: CheckInRequest = {
    visitType: 'individual',
    visitorCount: 1,
    visitorAgeRange: 'adulto',
    institutionalBond: 'comunidade',
    federationUnit: 'PE',
    municipality: 'Recife',
    neighborhood: 'Boa Vista',
    contact: null,
    terminalId: 'Check-in Recepcao',
  };

  beforeEach(() => {
    service = new CheckInService();
    rpcSpy = vi.fn();
    // Inject mock supabase client
    (service as unknown as { supabase: { rpc: typeof rpcSpy } }).supabase = {
      rpc: rpcSpy,
    } as unknown as typeof service['supabase' & keyof CheckInService];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call registrar_checkin RPC and return protocol and checkedInAt', async () => {
    const response: CheckInResponse = {
      protocol: 'CHK-2026-123456',
      checkedInAt: '2026-10-18T09:00:00-03:00',
    };

    rpcSpy.mockResolvedValue({ data: { ...response, visitationId: 'uuid-1' }, error: null });

    const result = await service.submitCheckIn(request);
    expect(rpcSpy).toHaveBeenCalledWith(
      'registrar_checkin',
      expect.objectContaining({
        p_tipo_visita: 'individual',
        p_qtd_visitantes: 1,
        p_faixa_etaria: 'adulto',
        p_vinculo: 'comunidade',
        p_uf: 'PE',
        p_cidade: 'Recife',
        p_bairro: 'Boa Vista',
        p_consentimento: false,
      }),
    );
    expect(result).toEqual(response);
  });

  it('should throw an error when Supabase RPC fails', async () => {
    rpcSpy.mockResolvedValue({ data: null, error: { message: 'Dados inválidos.' } });

    await expect(service.submitCheckIn(request)).rejects.toThrow('Dados inválidos.');
  });
});
