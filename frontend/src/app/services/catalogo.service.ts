import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoriaApi, DistritoApi, Catalogo, Entidad, EntidadApi } from '../interfaces/catalogo.interface';
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);
  private desdeApi(c: CategoriaApi): Catalogo;
  private desdeApi(d: DistritoApi): Catalogo;
  private desdeApi(item: CategoriaApi | DistritoApi): Catalogo {
    return 'id_categoria' in item ? { id: item.id_categoria, nombre: item.nombre } : { id: item.id_distrito, nombre: item.nombre };
  }
  private entidadDesdeApi(e: EntidadApi): Entidad {
    return { id: e.id_entidad, nombre: e.nombre, idCategoria: e.id_categoria };
  }
  async categorias(): Promise<Catalogo[]> {
    return (await firstValueFrom(this.http.get<CategoriaApi[]>(`${environment.apiUrl}/categorias`))).map(c => this.desdeApi(c));
  }
  async distritos(): Promise<Catalogo[]> {
    return (await firstValueFrom(this.http.get<DistritoApi[]>(`${environment.apiUrl}/distritos`))).map(d => this.desdeApi(d));
  }
  /** Solo para el operador; con idCategoria devuelve las entidades que atienden esa categoría. */
  async entidades(idCategoria?: number): Promise<Entidad[]> {
    const params = idCategoria ? new HttpParams().set('id_categoria', idCategoria) : undefined;
    return (await firstValueFrom(this.http.get<EntidadApi[]>(`${environment.apiUrl}/entidades`, { params }))).map(e => this.entidadDesdeApi(e));
  }
}
