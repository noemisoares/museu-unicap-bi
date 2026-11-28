import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Satisfaction } from './satisfaction';
import { SatisfactionService } from '../../core/services/satisfaction.service';
import { clickRadio, settle, submitForm } from '../../testing/dom-helpers';

describe('Satisfaction', () => {
  let satisfactionServiceMock: {
    getTopics: ReturnType<typeof vi.fn>;
    submitEvaluation: ReturnType<typeof vi.fn>;
  };

  const setup = async () => {
    const fixture = TestBed.createComponent(Satisfaction);
    await settle(fixture);
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  beforeEach(async () => {
    satisfactionServiceMock = {
      getTopics: vi.fn().mockResolvedValue([]),
      submitEvaluation: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [Satisfaction],
      providers: [
        provideRouter([]),
        { provide: SatisfactionService, useValue: satisfactionServiceMock },
      ],
    });
  });

  it('should load the satisfaction topics from the database', async () => {
    satisfactionServiceMock.getTopics.mockResolvedValue([
      { id: 'acervo-historico', label: 'Acervo Histórico', icon: 'history_edu' },
      { id: 'climatizacao', label: 'Climatização', icon: 'ac_unit' },
    ]);

    const { element } = await setup();

    expect(element.textContent).toContain('Acervo Histórico');
    expect(element.textContent).toContain('Climatização');
  });

  it('should keep the rating section usable when topics fail to load', async () => {
    satisfactionServiceMock.getTopics.mockRejectedValue(new Error('indisponível'));

    const { element } = await setup();

    expect(element.textContent).toContain('Não foi possível carregar os tópicos agora');
    expect(element.textContent).toContain('Enviar Avaliação');
  });

  it('should require a rating before submitting', async () => {
    const { fixture, element } = await setup();

    submitForm(element);
    await settle(fixture);

    expect(element.textContent).toContain(
      'Toque em uma nota de 1 a 5 para enviar sua avaliação.',
    );
    expect(satisfactionServiceMock.submitEvaluation).not.toHaveBeenCalled();
  });

  it('should submit the anonymous evaluation and thank the visitor on success', async () => {
    satisfactionServiceMock.submitEvaluation.mockResolvedValue({
      protocol: 'SAT-2026-888888',
      evaluatedAt: '2026-10-18T10:00:00-03:00',
    });

    const { fixture, element } = await setup();

    clickRadio(element, '5');
    submitForm(element);
    await settle(fixture);

    expect(satisfactionServiceMock.submitEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5 }),
    );
    expect(element.textContent).toContain('Muito obrigado!');
  });

  it('should not thank the visitor when the submission fails', async () => {
    satisfactionServiceMock.submitEvaluation.mockRejectedValue(
      new Error('Falha ao registrar.'),
    );

    const { fixture, element } = await setup();

    clickRadio(element, '3');
    submitForm(element);
    await settle(fixture);

    expect(element.textContent).not.toContain('Muito obrigado!');
    expect(element.textContent).toContain('Falha ao registrar.');
  });
});
