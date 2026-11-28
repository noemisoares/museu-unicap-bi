import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { CheckIn } from './check-in';
import { CheckInService } from '../../core/services/checkin.service';
import {
  clickRadio,
  setInputValue,
  settle,
  submitForm,
} from '../../testing/dom-helpers';

describe('CheckIn', () => {
  let checkInServiceMock: { submitCheckIn: ReturnType<typeof vi.fn> };

  const setup = async () => {
    const fixture = TestBed.createComponent(CheckIn);
    await settle(fixture);
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  const fillVisitorProfile = async (
    fixture: Parameters<typeof settle>[0],
    element: HTMLElement,
  ) => {
    clickRadio(element, 'adulto');
    clickRadio(element, 'comunidade');
    clickRadio(element, 'PE');
    clickRadio(element, 'Recife');
    await settle(fixture);
    clickRadio(element, 'Boa Vista');
  };

  beforeEach(async () => {
    checkInServiceMock = { submitCheckIn: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CheckIn],
      providers: [
        provideRouter([]),
        { provide: CheckInService, useValue: checkInServiceMock },
      ],
    });
  });

  it('should render the four MVP visit types', async () => {
    const { element } = await setup();
    for (const label of ['Individual', 'Família', 'Grupo Escolar', 'Cultural / Pesquisa']) {
      expect(element.textContent).toContain(label);
    }
  });

  it('should block submission and show validation messages when required choices are missing', async () => {
    const { fixture, element } = await setup();

    submitForm(element);
    await settle(fixture);

    expect(element.textContent).toContain('Selecione o tipo de visita.');
    expect(checkInServiceMock.submitCheckIn).not.toHaveBeenCalled();
  });

  it('should not require the group size for individual visits', async () => {
    const { element } = await setup();
    expect(element.querySelector('#visitor-count')).toBeNull();
  });

  it('should require a positive group size for school visits', async () => {
    const { fixture, element } = await setup();

    clickRadio(element, 'escola');
    await settle(fixture);
    expect(element.querySelector('#visitor-count')).not.toBeNull();

    await fillVisitorProfile(fixture, element);
    submitForm(element);
    await settle(fixture);

    expect(element.textContent).toContain(
      'Informe a quantidade de pessoas do grupo (mínimo 1).',
    );
    expect(checkInServiceMock.submitCheckIn).not.toHaveBeenCalled();
  });

  it('should submit the check-in and show the protocol after success', async () => {
    checkInServiceMock.submitCheckIn.mockResolvedValue({
      protocol: 'CHK-2026-777777',
      checkedInAt: '2026-10-18T09:12:00-03:00',
    });

    const { fixture, element } = await setup();

    clickRadio(element, 'individual');
    await fillVisitorProfile(fixture, element);
    submitForm(element);
    await settle(fixture);

    expect(checkInServiceMock.submitCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ visitType: 'individual', visitorCount: 1 }),
    );
    expect(element.textContent).toContain('Acesso Liberado');
    expect(element.textContent).toContain('CHK-2026-777777');
  });

  it('should not show success and should keep an error message when the API fails', async () => {
    checkInServiceMock.submitCheckIn.mockRejectedValue(new Error('Serviço indisponível.'));

    const { fixture, element } = await setup();

    clickRadio(element, 'individual');
    await fillVisitorProfile(fixture, element);
    setInputValue(element, 'contact-email', 'visitante@exemplo.com.br');
    submitForm(element);
    await settle(fixture);

    expect(element.textContent).not.toContain('Acesso Liberado');
    expect(element.textContent).toContain('Serviço indisponível.');
    const emailInput = element.querySelector<HTMLInputElement>('#contact-email');
    expect(emailInput?.value).toBe('visitante@exemplo.com.br');
  });
});
