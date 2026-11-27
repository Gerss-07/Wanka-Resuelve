import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { CatalogoService } from './catalogo.service';

describe('CatalogoService', () => {
  it('convierte categorías y distritos con desdeApi', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const servicio = TestBed.inject(CatalogoService);
    const http = TestBed.inject(HttpTestingController);

    const categorias = servicio.categorias();
    http.expectOne(`${environment.apiUrl}/categorias`).flush([{ id_categoria: 2, nombre: 'Pistas y veredas' }]);
    await expect(categorias).resolves.toEqual([{ id: 2, nombre: 'Pistas y veredas' }]);

    const distritos = servicio.distritos();
    http.expectOne(`${environment.apiUrl}/distritos`).flush([{ id_distrito: 1, nombre: 'Huancayo' }]);
    await expect(distritos).resolves.toEqual([{ id: 1, nombre: 'Huancayo' }]);
    http.verify();
  });
});
