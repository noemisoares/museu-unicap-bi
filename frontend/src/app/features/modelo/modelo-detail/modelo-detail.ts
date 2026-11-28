import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UnidadeService } from '../../../core/services/unidade.service';
import type { Modelo } from '../../../core/models/unidade.models';

@Component({
  imports: [],
  selector: 'app-modelo-detail',
  styleUrl: './modelo-detail.scss',
  templateUrl: './modelo-detail.html',
})
export class ModeloDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly unidadeService = inject(UnidadeService);

  protected readonly unidadeId = signal<string>('');
  protected readonly modeloId = signal<string>('');

  /** `undefined` = loading, `null` = load failure. */
  protected readonly modelo = signal<Modelo | null | undefined>(undefined);

  protected readonly isLoading = computed(() => this.modelo() === undefined);
  protected readonly loadFailed = computed(() => this.modelo() === null);

  constructor() {
    const unidadeId = this.route.snapshot.paramMap.get('unidadeId') ?? '';
    const modeloId = this.route.snapshot.paramMap.get('modeloId') ?? '';
    this.unidadeId.set(unidadeId);
    this.modeloId.set(modeloId);
    void this.load();
  }

  private async load(): Promise<void> {
    this.modelo.set(undefined);
    try {
      const modelo = await this.unidadeService.getModeloById(
        this.unidadeId(),
        this.modeloId(),
      );
      this.modelo.set(modelo);
    } catch {
      this.modelo.set(null);
    }
  }

  /** Volta para a página de detalhes da unidade de origem. */
  protected async goBackToUnidade(): Promise<void> {
    await this.router.navigate(['/admin/unidades', this.unidadeId()]);
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
