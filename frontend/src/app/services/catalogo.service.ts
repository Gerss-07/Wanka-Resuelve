import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoriaApi, DistritoApi, Catalogo } from '../interfaces/catalogo.interface';
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);
  private desdeApi(c: CategoriaApi): Catalogo;
  private desdeApi(d: DistritoApi): Catalogo;
  private desdeApi(item: CategoriaApi | DistritoApi): Catalogo {
    return 'id_categoria' in item ? { id: item.id_categoria, nombre: item.nombre } : { id: item.id_distrito, nombre: item.nombre };
  }
  async categorias(): Promise<Catalogo[]> {
    return (await firstValueFrom(this.http.get<CategoriaApi[]>(`${environment.apiUrl}/categorias`))).map(c => this.desdeApi(c));
  }
  async distritos(): Promise<Catalogo[]> {
    return (await firstValueFrom(this.http.get<DistritoApi[]>(`${environment.apiUrl}/distritos`))).map(d => this.desdeApi(d));
  }
}
