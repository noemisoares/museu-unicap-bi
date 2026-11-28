import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SatisfactionService } from './satisfaction.service';

describe('SatisfactionService', () => {
  let service: SatisfactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SatisfactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets the filtered topic contract from Express', async () => {
    const result = service.getTopics();
    const call = http.expectOne('/api/v1/topicos');
    expect(call.request.method).toBe('GET');
    call.flush([{ id: 'topic-1', label: 'Acolhimento', icon: 'emoji_people' }]);
    await expect(result).resolves.toEqual([
      { id: 'topic-1', label: 'Acolhimento', icon: 'emoji_people' },
    ]);
  });

  it('posts an anonymous rating without a client-selected terminal', async () => {
    const request = { rating: 5 as const, topicIds: ['topic-1'] };
    const result = service.submitEvaluation(request);
    const call = http.expectOne('/api/v1/avaliacoes-satisfacao');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush({ protocol: 'SAT-2026-123456', evaluatedAt: '2026-11-27T09:05:00Z' });
    await expect(result).resolves.toMatchObject({ protocol: 'SAT-2026-123456' });
  });
});
