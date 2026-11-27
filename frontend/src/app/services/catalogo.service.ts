import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoriaApi, DistritoApi, Catalogo } from '../interfaces/catalogo.interface';
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);
  async categorias(): Promise<Catalogo[]> {
    return (await firstValueFrom(this.http.get<CategoriaApi[]>(`${environment.apiUrl}/categorias`))).map(c => ({ id: c.id_categoria, nombre: c.nombre }));
  }
  async distritos(): Promise<Catalogo[]> {
    return (await firstValueFrom(this.http.get<DistritoApi[]>(`${environment.apiUrl}/distritos`))).map(d => ({ id: d.id_distrito, nombre: d.nombre }));
  }
}
