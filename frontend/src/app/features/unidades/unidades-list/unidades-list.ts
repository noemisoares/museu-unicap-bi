import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UnidadeService } from '../../../core/services/unidade.service';
import type { Unidade } from '../../../core/models/unidade.models';

@Component({
  imports: [],
  selector: 'app-unidades-list',
  styleUrl: './unidades-list.scss',
  templateUrl: './unidades-list.html',
})
export class UnidadesList {
  private readonly unidadeService = inject(UnidadeService);
  private readonly router = inject(Router);

  protected readonly query = signal('');
  protected readonly onlyActive = signal(true);

  /** `undefined` = loading, `null` = load failure. */
  protected readonly unidades = signal<Unidade[] | null | undefined>(undefined);

  protected readonly isLoading = computed(() => this.unidades() === undefined);
  protected readonly loadFailed = computed(() => this.unidades() === null);

  protected readonly filteredUnidades = computed(() => {
    const items = this.unidades() ?? [];
    const q = this.query().toLowerCase().trim();
    const activeOnly = this.onlyActive();
    return items.filter((u) => {
      const matchQuery =
        !q ||
        u.nome.toLowerCase().includes(q) ||
        u.cidade?.toLowerCase().includes(q) ||
        u.estado?.toLowerCase().includes(q);
      const matchActive = !activeOnly || u.ativo === true;
      return matchQuery && matchActive;
    });
  });

  constructor() {
    void this.loadUnidades();
  }

  protected async loadUnidades(): Promise<void> {
    this.unidades.set(undefined);
    try {
      const page = await this.unidadeService.getUnidades({
        ativo: this.onlyActive(),
        page: 1,
        pageSize: 50,
      });
      this.unidades.set(page.items);
    } catch {
      this.unidades.set(null);
    }
  }

  protected onBuscaChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
  }

  protected onOnlyActiveChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.onlyActive.set(checked);
    void this.loadUnidades();
  }

  protected async goToUnidade(id: string): Promise<void> {
    await this.router.navigate(['/admin/unidades', id]);
  }
}
