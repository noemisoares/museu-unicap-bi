import { Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { AppModal } from '../../shared/components/app-modal/app-modal';
import { SatisfactionService } from '../../core/services/satisfaction.service';
import { environment } from '../../../environments/environment';
import { RATING_SCALE_OPTIONS } from '../../core/constants/domain-options';
import {
  SatisfactionEvaluationRequest,
  SatisfactionEvaluationResponse,
  SatisfactionRating,
  SatisfactionTopic,
} from '../../core/models/satisfaction.models';

/** Runtime type guard for the 1–5 rating scale. */
function isSatisfactionRating(value: number): value is SatisfactionRating {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

/**
 * Exit kiosk quick-touch satisfaction survey.
 *
 * Business rules (MVP):
 * - The 1–5 rating is required; labels follow the official scale
 *   (1 = Muito Ruim … 5 = Excelente).
 * - Topics are optional (zero, one or many) and always come from
 *   the database — never a hard-coded list.
 * - The evaluation is anonymous: no personal data is collected.
 * - The thank-you state only appears after a successful submission; failures
 *   keep the selections so the visitor can retry.
 */
@Component({
  imports: [FormField, AppModal],
  selector: 'app-satisfaction',
  styleUrl: './satisfaction.scss',
  templateUrl: './satisfaction.html',
})
export class Satisfaction {
  private readonly satisfactionService = inject(SatisfactionService);

  /** Radio inputs hold string values; converted to 1–5 in the payload. */
  protected readonly ratingOptions = RATING_SCALE_OPTIONS.map((option) => ({
    ...option,
    radioValue: String(option.value),
  }));

  protected readonly formModel = signal<{ rating: string }>({ rating: '' });

  protected readonly satisfactionForm = form(this.formModel, (s) => {
    required(s.rating, { message: 'Toque em uma nota de 1 a 5 para enviar sua avaliação.' });
  });

  /** Topics loaded from the database; `undefined` = loading, `null` = unavailable. */
  protected readonly topics = signal<SatisfactionTopic[] | null | undefined>(undefined);

  protected readonly selectedTopicIds = signal<string[]>([]);
  protected readonly attempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly successResponse = signal<SatisfactionEvaluationResponse | null>(null);

  constructor() {
    // Load topics from Supabase
    void this.loadTopics();
  }

  private async loadTopics(): Promise<void> {
    try {
      const topics = await this.satisfactionService.getTopics();
      this.topics.set(topics);
    } catch {
      this.topics.set(null);
    }
  }

  protected isTopicSelected(topicId: string): boolean {
    return this.selectedTopicIds().includes(topicId);
  }

  protected toggleTopic(topic: SatisfactionTopic, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedTopicIds.update((ids) =>
      input.checked ? [...ids, topic.id] : ids.filter((id) => id !== topic.id),
    );
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.attempted.set(true);
    this.submitError.set(null);
    if (this.satisfactionForm().invalid() || this.submitting()) {
      return;
    }
    void this.sendEvaluation();
  }

  /** Closes the thank-you dialog and resets the kiosk for the next visitor. */
  protected resetTotem(): void {
    this.successResponse.set(null);
    this.selectedTopicIds.set([]);
    this.formModel.set({ rating: '' });
    this.attempted.set(false);
    this.submitError.set(null);
  }

  private async sendEvaluation(): Promise<void> {
    const rating = Number(this.formModel().rating);
    if (!isSatisfactionRating(rating)) {
      return;
    }
    const request: SatisfactionEvaluationRequest = {
      rating,
      topicIds: this.selectedTopicIds(),
      terminalId: environment.terminalId,
    };
    this.submitting.set(true);
    try {
      const response = await this.satisfactionService.submitEvaluation(request);
      this.successResponse.set(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
      this.submitError.set(message);
    } finally {
      this.submitting.set(false);
    }
  }
}
