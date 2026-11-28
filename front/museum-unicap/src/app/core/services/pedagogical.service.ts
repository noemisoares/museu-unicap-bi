import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from './api-error';
import {
  PedagogicalEvaluationRequest,
  PedagogicalEvaluationResponse,
} from '../models/pedagogical.models';

@Service()
export class PedagogicalService {
  private readonly http = inject(HttpClient);

  /**
   * Submits a post-visit pedagogical report through the Express API.
   */
  async submitEvaluation(
    request: PedagogicalEvaluationRequest,
  ): Promise<PedagogicalEvaluationResponse> {
    try {
      return await firstValueFrom(this.http.post<PedagogicalEvaluationResponse>(
        `${environment.apiUrl}/avaliacoes-pedagogicas`, request,
      ));
    } catch (error: unknown) {
      throw new Error(apiErrorMessage(error, 'Erro ao registrar avaliação pedagógica.'));
    }
  }
}
