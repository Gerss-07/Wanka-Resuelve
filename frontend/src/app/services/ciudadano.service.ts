import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, Distrito, ReporteResumen } from '../interfaces/ciudadano';

@Injectable({ providedIn: 'root' })
export class CiudadanoService {
  private readonly http = inject(HttpClient);
  private get habilitado(): boolean { return !environment.production && !!environment.apiUrl; }
  categorias(): Observable<Categoria[]> {
    return this.habilitado ? this.http.get<Categoria[]>(`${environment.apiUrl}/categorias`) : throwError(() => new Error('Servicio no configurado'));
  }
  distritos(): Observable<Distrito[]> {
    return this.habilitado ? this.http.get<Distrito[]>(`${environment.apiUrl}/distritos`) : throwError(() => new Error('Servicio no configurado'));
  }
  reportes(): Observable<ReporteResumen[]> {
    return this.habilitado ? this.http.get<ReporteResumen[]>(`${environment.apiUrl}/reportes/mis-reportes`) : throwError(() => new Error('Servicio no configurado'));
  }
  crear(datos: FormData): Observable<ReporteResumen> {
    if (!this.habilitado) return throwError(() => new Error('Servicio no configurado'));

    return this.http.post<ReporteResumen>(`${environment.apiUrl}/reportes`, datos, { observe: 'response' }).pipe(
      map(({ status, body }) => {
        if (status !== 201 || !body?.codigo) throw new Error('La API no confirmó el registro del reporte');
        return body;
      }),
    );
  }
}
