import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardPeriod, DashboardService } from '../../../core/services/dashboard.service';
import { environment } from '../../../../environments/environment';
import { AGE_RANGE_OPTIONS } from '../../../core/constants/domain-options';
import { ContactsPage, DashboardSummary } from '../../../core/models/dashboard.models';
import { SatisfactionRating } from '../../../core/models/satisfaction.models';

/** Icons per rating, mirroring the prototype's sentiment icons. */
const RATING_ICONS: Record<SatisfactionRating, string> = {
  1: 'mood_bad',
  2: 'sentiment_dissatisfied',
  3: 'sentiment_neutral',
  4: 'sentiment_satisfied',
  5: 'sentiment_very_satisfied',
};

/**
 * Management dashboard with the MVP's minimum analytical views:
 * visit overview, visitor profile/origin, satisfaction & topics and the
 * educational impact of school visits.
 *
 * Data is loaded from Supabase via the DashboardService.
 * All queries are protected by RLS — only authenticated admins can read.
 */
@Component({
  imports: [DecimalPipe],
  selector: 'app-admin-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly demoModeActive = environment.useMockApi;
  protected readonly ratingIcons = RATING_ICONS;

  protected readonly selectedPeriod = signal<DashboardPeriod>('semester');

  /** `undefined` = loading, `null` = load failure. */
  protected readonly summary = signal<DashboardSummary | null | undefined>(undefined);

  protected readonly isLoading = computed(() => this.summary() === undefined);

  protected readonly loadFailed = computed(() => this.summary() === null);

  /** `undefined` = loading, `null` = load failure. */
  protected readonly contacts = signal<ContactsPage | null | undefined>(undefined);

  /** Notice shown when a not-yet-integrated action is requested. */
  protected readonly pendingActionNotice = signal<string | null>(null);

  /** Human labels for the age ranges used by the chart. */
  protected readonly ageLabels = AGE_RANGE_OPTIONS;

  protected readonly session = this.authService.session;

  protected readonly ageDistributionRows = computed(() => {
    const summary = this.summary();
    return summary
      ? summary.ageDistribution.map((entry) => ({
          ...entry,
          label:
            this.ageLabels.find((option) => option.value === entry.range)?.label ??
            entry.range,
        }))
      : [];
  });

  constructor() {
    void this.loadDashboard();
  }

  protected onPeriodChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as DashboardPeriod;
    this.selectedPeriod.set(value);
    void this.loadSummary(value);
  }

  private async loadDashboard(): Promise<void> {
    await Promise.all([
      this.loadSummary(this.selectedPeriod()),
      this.loadContacts(1),
    ]);
  }

  private async loadSummary(period: DashboardPeriod): Promise<void> {
    this.summary.set(undefined);
    try {
      const data = await this.dashboardService.getSummary(period);
      this.summary.set(data);
    } catch {
      this.summary.set(null);
    }
  }

  private async loadContacts(page: number): Promise<void> {
    try {
      const contactsData = await this.dashboardService.getContacts(page);
      this.contacts.set(contactsData);
    } catch {
      this.contacts.set(null);
    }
  }

  protected async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }

  protected showPendingActionNotice(action: string): void {
    this.pendingActionNotice.set(
      `“${action}” será disponibilizado após a integração com o módulo de exportação.`,
    );
  }

  protected async goToContactsPage(page: number): Promise<void> {
    const current = this.contacts();
    if (!current) {
      return;
    }
    const totalPages = Math.max(1, Math.ceil(current.total / current.pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    try {
      const data = await this.dashboardService.getContacts(safePage);
      this.contacts.set(data);
    } catch {
      // Keep current page on failure
    }
  }

  /** Formats an ISO timestamp as a short pt-BR date/time. */
  protected formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  }
}
