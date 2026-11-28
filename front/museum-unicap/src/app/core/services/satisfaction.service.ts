import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from './api-error';
import {
  SatisfactionEvaluationRequest,
  SatisfactionEvaluationResponse,
  SatisfactionTopic,
} from '../models/satisfaction.models';

@Service()
export class SatisfactionService {
  private readonly http = inject(HttpClient);

  /**
   * Loads active satisfaction topics from the database.
   * Maps the database schema to the frontend `SatisfactionTopic` interface.
   */
  async getTopics(): Promise<SatisfactionTopic[]> {
    try {
      return await firstValueFrom(this.http.get<SatisfactionTopic[]>(
        `${environment.apiUrl}/topicos`,
      ));
    } catch (error: unknown) {
      throw new Error(apiErrorMessage(error, 'Erro ao carregar tópicos.'));
    }
  }

  /**
   * Submits an anonymous satisfaction evaluation through the Express API.
   */
  async submitEvaluation(
    request: SatisfactionEvaluationRequest,
  ): Promise<SatisfactionEvaluationResponse> {
    try {
      return await firstValueFrom(this.http.post<SatisfactionEvaluationResponse>(
        `${environment.apiUrl}/avaliacoes-satisfacao`, request,
      ));
    } catch (error: unknown) {
      throw new Error(apiErrorMessage(error, 'Erro ao registrar avaliação.'));
    }
  }
}
