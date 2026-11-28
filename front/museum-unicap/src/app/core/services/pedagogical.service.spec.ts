import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PedagogicalService } from './pedagogical.service';
import { PedagogicalEvaluationRequest } from '../models/pedagogical.models';

describe('PedagogicalService', () => {
  it('posts the explicit contact authorization to Express', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(PedagogicalService);
    const http = TestBed.inject(HttpTestingController);
    const request: PedagogicalEvaluationRequest = {
      institutionName: 'Escola Exemplo',
      network: 'estadual',
      cycles: ['medio'],
      studentCount: 25,
      curriculumAlignmentScore: 5,
      mediatorsRating: 'excelente',
      materialsRating: 'adequado',
      suggestions: null,
      interestedInFutureVisits: true,
      contactChannel: 'phone',
      contactValue: '8133334444',
    };
    const result = service.submitEvaluation(request);
    const call = http.expectOne('/api/v1/avaliacoes-pedagogicas');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush({ protocol: 'PED-2026-123456', evaluatedAt: '2026-11-27T09:10:00Z' });
    await expect(result).resolves.toMatchObject({ protocol: 'PED-2026-123456' });
    http.verify();
  });
});
