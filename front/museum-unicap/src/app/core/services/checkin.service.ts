import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from './api-error';
import { CheckInRequest, CheckInResponse } from '../models/checkin.models';

@Service()
export class CheckInService {
  private readonly http = inject(HttpClient);

  async submitCheckIn(request: CheckInRequest): Promise<CheckInResponse> {
    try {
      return await firstValueFrom(this.http.post<CheckInResponse>(
        `${environment.apiUrl}/checkins`, request,
      ));
    } catch (error: unknown) {
      throw new Error(apiErrorMessage(error, 'Erro ao registrar check-in.'));
    }
  }
}
