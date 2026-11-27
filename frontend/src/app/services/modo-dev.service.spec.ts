import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CLAVE_USUARIO_DEV, ModoDevService } from './modo-dev.service';

describe('ModoDevService', () => {
  const usuarios = environment.devUsuarios;
  beforeEach(() => localStorage.clear());

  it('empieza como ciudadano y guarda el id elegido en localStorage', () => {
    if (!usuarios) return;
    const dev = TestBed.inject(ModoDevService);
    expect(dev.rol()).toBe('ciudadano');
    dev.actuarComo('operador');
    expect(dev.id()).toBe(usuarios.operador);
    expect(localStorage.getItem(CLAVE_USUARIO_DEV)).toBe(String(usuarios.operador));
  });

  it('recupera el id guardado e ignora valores que no son de desarrollo', () => {
    if (!usuarios) return;
    localStorage.setItem(CLAVE_USUARIO_DEV, String(usuarios.operador));
    expect(TestBed.inject(ModoDevService).rol()).toBe('operador');
    TestBed.resetTestingModule();
    localStorage.setItem(CLAVE_USUARIO_DEV, '999');
    expect(TestBed.inject(ModoDevService).id()).toBe(usuarios.ciudadano);
  });
});
