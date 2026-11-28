import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UnidadeService } from '../../../core/services/unidade.service';
import type { Modelo, Unidade } from '../../../core/models/unidade.models';

@Component({
  imports: [],
  selector: 'app-unidade-detail',
  styleUrl: './unidade-detail.scss',
  templateUrl: './unidade-detail.html',
})
export class UnidadeDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly unidadeService = inject(UnidadeService);

  protected readonly unidadeId = signal<string>('');

  /** `undefined` = loading, `null` = load failure. */
  protected readonly unidade = signal<Unidade | null | undefined>(undefined);
  protected readonly modelos = signal<Modelo[] | null | undefined>(undefined);

  protected readonly isLoading = computed(
    () => this.unidade() === undefined || this.modelos() === undefined,
  );
  protected readonly loadFailed = computed(
    () => this.unidade() === null || this.modelos() === null,
  );

  constructor() {
    const id = this.route.snapshot.paramMap.get('unidadeId') ?? '';
    this.unidadeId.set(id);
    void this.load();
  }

  private async load(): Promise<void> {
    this.unidade.set(undefined);
    this.modelos.set(undefined);
    try {
      await Promise.all([
        this.unidadeService.getUnidadeById(this.unidadeId()).then((u) =>
          this.unidade.set(u),
        ),
        this.unidadeService.getModelosByUnidade(this.unidadeId()).then((m) =>
          this.modelos.set(m),
        ),
      ]);
    } catch {
      this.unidade.set(null);
      this.modelos.set(null);
    }
  }

  protected async goBack(): Promise<void> {
    await this.router.navigate(['/admin/unidades']);
  }

  protected async goToModelo(modeloId: string): Promise<void> {
    await this.router.navigate([
      '/admin/unidades',
      this.unidadeId(),
      'modelo',
      modeloId,
    ]);
  }

  protected statusLabel(status: Modelo['status']): string {
    const labels: Record<Modelo['status'], string> = {
      ativo: 'Ativo',
      encerrado: 'Encerrado',
      planejado: 'Planejado',
    };
    return labels[status];
  }

  protected formatDate(iso?: string): string | null {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return iso;
    }
  }
}
