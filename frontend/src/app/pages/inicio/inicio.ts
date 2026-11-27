import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideMapPin, LucideLeaf, LucideTrafficCone, LucideTrash2, LucideDroplets, LucideFootprints } from '@lucide/angular';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { noticias } from './noticias';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Header, Footer, LucideArrowRight, LucideMapPin, LucideLeaf, LucideTrafficCone, LucideTrash2, LucideDroplets, LucideFootprints],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css', './inicio-secciones.css', './inicio-diseno.css'],
})
export class Inicio {
  protected readonly noticias = noticias;
  protected readonly diapositivas = [
    { imagen: '/images/plaza-constitucion.jpg', alt: 'Plaza de la Constitución de Huancayo y su catedral', titulo: 'Transformemos juntos nuestra ciudad.', descripcion: 'Una propuesta para registrar incidencias urbanas y seguir su atención en Huancayo, El Tambo y Chilca.', lugar: 'PLAZA DE LA CONSTITUCIÓN · HUANCAYO' },
    { imagen: '/images/valle-mantaro.jpg', alt: 'Paisaje del Valle del Mantaro', titulo: 'Nuestro valle, nuestro compromiso.', descripcion: 'Desde nuestras calles hasta nuestros espacios públicos, cada detalle de nuestro entorno importa.', lugar: 'VALLE DEL MANTARO · JUNÍN' },
    { imagen: '/images/huancayo-catedral.jpg', alt: 'La plaza y la catedral en el centro de Huancayo', titulo: 'Cuidemos juntos lo que nos conecta.', descripcion: 'Conoce una forma prevista de registrar incidencias y seguir su atención en un proyecto universitario.', lugar: 'CENTRO DE HUANCAYO · JUNÍN' },
  ];
  protected actual = 0;
  private inicioToque = 0;

  protected cambiar(direccion: number): void {
    this.actual = (this.actual + direccion + this.diapositivas.length) % this.diapositivas.length;
  }

  protected iniciarToque(evento: TouchEvent): void {
    this.inicioToque = evento.changedTouches[0].clientX;
  }

  protected terminarToque(evento: TouchEvent): void {
    const distancia = evento.changedTouches[0].clientX - this.inicioToque;
    if (Math.abs(distancia) > 50) this.cambiar(distancia < 0 ? 1 : -1);
  }
}
