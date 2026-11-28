import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CheckInService } from './checkin.service';
import { CheckInRequest } from '../models/checkin.models';

describe('CheckInService', () => {
  let service: CheckInService;
  let http: HttpTestingController;

  const request: CheckInRequest = {
    visitType: 'individual',
    visitorCount: 1,
    visitorAgeRange: 'adulto',
    institutionalBond: 'comunidade',
    federationUnit: 'PE',
    municipality: 'Recife',
    neighborhood: 'Boa Vista',
    contact: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CheckInService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the check-in model and returns the server protocol', async () => {
    const result = service.submitCheckIn(request);
    const call = http.expectOne('/api/v1/checkins');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    expect(call.request.body).not.toHaveProperty('terminalId');
    call.flush({ protocol: 'CHK-2026-123456', checkedInAt: '2026-11-27T09:00:00Z' });
    await expect(result).resolves.toEqual({
      protocol: 'CHK-2026-123456', checkedInAt: '2026-11-27T09:00:00Z',
    });
  });

  it('shows the API validation message', async () => {
    const result = service.submitCheckIn(request);
    http.expectOne('/api/v1/checkins').flush(
      { code: 'INVALID_REQUEST', message: 'Quantidade de visitantes inválida.' },
      { status: 400, statusText: 'Bad Request' },
    );
    await expect(result).rejects.toThrow('Quantidade de visitantes inválida.');
  });
});
