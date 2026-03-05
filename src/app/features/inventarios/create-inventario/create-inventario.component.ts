import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { ProductsService } from '../../../core/products/products.service';
import { Product } from '../../../core/products/products.service';
import { InventariosService, InventarioProductoPayload } from '../../../core/inventarios/inventarios.service';
import { SucursalesService } from '../../../core/sucursales/sucursales.service';
import { ConcessionsService, Concesion } from '../../../core/concessions/concessions.service';
import { StorageService } from '../../../core/storage/storage.service';

@Component({
  selector: 'app-create-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './create-inventario.component.html',
  styleUrl: './create-inventario.component.scss',
})
export class CreateInventarioComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private inventariosService = inject(InventariosService);
  private sucursalesService = inject(SucursalesService);
  private concessionsService = inject(ConcessionsService);
  private storageService = inject(StorageService);

  loading = true;
  saving = false;
  error = '';
  okMsg = '';
  showProductModal = false;

  concesionId = '';
  selectedImages: File[] = [];
  imagesPreview: string[] = [];

  concesionNombre = '';
  jornadaActivaNumero: number | null = null;
jornadaActivaFecha = ''; // YYYY-MM-DD
productosExistentes: Product[] = [];
productosLoading = false;
  // ===== Modal Inventario por Jornada =====
showInvModal = false;
invLoading = false;
invSaving = false;
invError = '';
invOkMsg = '';
modoInventarioSucursal = false;
sucursalesGuardadas: string[] = [];

productosCatalogo: Product[] = [];
sucursales: Array<{ id: string; zona_id?: string; zonaNombre?: string; cajasCount?: number; activo?: boolean }> = [];
selectedProduct: Product | null = null;
searchProducto = '';
// ===== Mini modal (cantidad) =====
showQtyModal = false;
qtyValue: number | null = null;
priceValue: number | null = null;
private mapearNombreZona(zonaId?: string): string {
  const z = (zonaId || '').toLowerCase();

  if (!z) return 'Sin zona';

  if (z.includes('poniente')) return 'PONIENTE';
  if (z.includes('oriente')) return 'ORIENTE';
  if (z.includes('norte')) return 'NORTE';
  if (z.includes('sur')) return 'SUR';

  return zonaId || 'Sin zona';
}

abrirQtyModal(p: Product) {
  this.selectedProduct = p;

  const existing = this.inventarioItems.find(x => x.productId === p.id);

  this.qtyValue = 1; // lo que vas a sumar
  this.priceValue = existing ? existing.precio : (p.precio != null ? Number(p.precio) : null);

  this.invError = '';
  this.showQtyModal = true;
}

cerrarQtyModal() {
  this.showQtyModal = false;
  this.qtyValue = null;
  this.priceValue = null;
}

confirmarCantidad() {
  this.invError = '';

  if (!this.selectedProduct) {
    this.invError = 'Selecciona un producto.';
    return;
  }

  const cantidad = Number(this.qtyValue ?? 0);
  const precio = Number(this.priceValue ?? NaN);

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    this.invError = 'Cantidad inválida.';
    return;
  }

  if (!Number.isFinite(precio) || precio < 0) {
    this.invError = 'Precio inválido.';
    return;
  }

  const productId = this.selectedProduct.id;

  const idx = this.inventarioItems.findIndex(x => x.productId === productId);
  if (idx >= 0) {
    // suma cantidad, pero ACTUALIZA precio al último capturado
    this.inventarioItems[idx].cantidad += cantidad;
    this.inventarioItems[idx].precio = precio;
  } else {
    this.inventarioItems.push({
      productId,
      nombre: this.selectedProduct.nombre,
      unidad: this.selectedProduct.unidad_medida,
      cantidad,
      precio,
    });
  }

  this.cerrarQtyModal();
}


get productosCatalogoFiltrados(): Product[] {
  const q = (this.searchProducto || '').trim().toLowerCase();
  if (!q) return this.productosCatalogo;
  return this.productosCatalogo.filter(p => (p.nombre || '').toLowerCase().includes(q));
}

cantidadEnLista(productId: string): number {
  return this.inventarioItems
    .filter(x => x.productId === productId)
    .reduce((acc, x) => acc + (x.cantidad || 0), 0);
}

inventarioItems: Array<{
  productId: string;
  nombre: string;
  unidad?: string;
  cantidad: number;
  precio: number; // precio por jornada
}> = [];

invForm = this.fb.nonNullable.group({
  sucursalId: this.fb.nonNullable.control(''),
});
form = this.fb.nonNullable.group({
  nombre: ['', [Validators.required, Validators.minLength(2)]],
  precio: this.fb.nonNullable.control<number | null>(null, [Validators.required, Validators.min(0)]),
  activo: this.fb.nonNullable.control(true),
});


ngOnInit() {
  this.route.queryParamMap.subscribe((q) => {
    this.concesionId = q.get('concesionId') || '';

    if (!this.concesionId) {
      this.error = 'Falta concesionId en la URL.';
      this.loading = false;
      return;
    }

    this.cargarConcesionNombre();
    this.cargarProductosExistentes();

    // TODO: reemplazar por servicio de jornada activa real
this.jornadaActivaNumero = 1;
this.jornadaActivaFecha = new Date().toISOString().slice(0, 10);
this.cargarInventarioUI();
    this.loading = false;
  });
}

private cargarInventarioUI() {
  this.invError = '';
  this.invOkMsg = '';
  this.invLoading = true;

  // catálogo productos
  this.productsService.listByConcesion(this.concesionId).subscribe({
    next: (items) => {
      this.productosCatalogo = (items || []).filter(p => p.activo !== false);
      this.invLoading = false;
    },
    error: (e) => {
      this.invError = e?.error?.message || e?.message || 'Error cargando productos';
      this.invLoading = false;
    },
  });

  // sucursales
  this.sucursalesService.listByConcesion(this.concesionId).subscribe({
    next: (r: any) => {
      const raw = r?.data ?? r?.items ?? r?.sucursales ?? r ?? [];
      const arr: any[] = Array.isArray(raw) ? raw : [];

     this.sucursales = arr.map((x: any, idx: number) => {
  const zonaId = x?.zona_id ?? x?.zonaId ?? x?.zona ?? '';

  return {
    id: x?.id ?? x?.uid ?? x?.docId ?? x?._id ?? String(idx),
    zona_id: zonaId,
    zonaNombre: this.mapearNombreZona(zonaId),
    activo: x?.activo ?? true,
    cajasCount: Array.isArray(x?.sucursal?.cajas) ? x.sucursal.cajas.length : (x?.cajasCount ?? 0),
  };
});

     if (!this.invForm.controls.sucursalId.value && this.sucursales.length > 0) {
  this.invForm.controls.sucursalId.setValue(this.sucursales[0].id);
}
    },
    error: () => {},
  });

  // reset UI
  this.selectedProduct = null;
  this.searchProducto = '';
  this.showQtyModal = false;
  this.qtyValue = null;
  this.priceValue = null;
}

  onPickImages(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (!files.length) return;

  // Reemplaza selección (si quieres acumular, quita esta línea)
  this.selectedImages = files.slice(0, 5); // límite 5

  // Previews
  this.imagesPreview = this.selectedImages.map(f => URL.createObjectURL(f));
}

private async uploadSelectedImages(): Promise<string[]> {
  if (!this.selectedImages.length) return [];

  const urls: string[] = [];
  for (const file of this.selectedImages) {
    const url = await this.storageService.uploadProductImage(file, this.concesionId);
    urls.push(url);
  }
  return urls;
}
  guardar() {
    this.error = '';
    this.okMsg = '';

    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) return;
const v = this.form.getRawValue();

// Tu backend hoy exige mínimo 1 imagen:
if (this.selectedImages.length === 0) {
  this.error = 'Debes seleccionar al menos 1 imagen.';
  return;
}

this.saving = true;

(async () => {
  try {
    const imagenes = await this.uploadSelectedImages();

    const body = {
      nombre: v.nombre.trim(),
      unidad_medida: 'PZ',
      precio: Number(v.precio),
      imagenes, // URLs reales
      activo: !!v.activo,
    };

    this.productsService.createInConcesion(this.concesionId, body).subscribe({
      next: () => {
  this.okMsg = 'Producto creado correctamente.';
  this.saving = false;
  this.showProductModal = false;

  // limpia formulario
  this.form.reset({
    nombre: '',
    precio: null,
    activo: true,
  });
  this.selectedImages = [];
  this.imagesPreview = [];

  // recarga catálogo de productos para inventario
  this.cargarProductosExistentes();
  this.cargarInventarioUI();
},
      error: (e) => {
        const msg = e?.error?.message || e?.message || 'No se pudo crear el producto.';
        const errs = e?.error?.errors ? JSON.stringify(e.error.errors) : '';
        this.error = errs ? `${msg}: ${errs}` : msg;
        this.saving = false;
      },
    });
  } catch (err: any) {
    this.error = err?.message || 'Error subiendo imágenes.';
    this.saving = false;
  }
})();
  }

abrirProductModal() {
  this.error = '';
  this.okMsg = '';
  this.showProductModal = true;
}

cerrarProductModal() {
  this.showProductModal = false;
}

cancelar() {
  this.router.navigateByUrl('/');
}
  // ===== Inventario por jornada =====
abrirInventarioModal() {
  this.invError = '';
  this.invOkMsg = '';
  this.invSaving = false;
  this.inventarioItems = [];

  this.showInvModal = true;
  this.invLoading = true;

  // Cargar catálogo de productos de la concesión
  this.productsService.listByConcesion(this.concesionId).subscribe({
    next: (items) => {
      this.productosCatalogo = (items || []).filter(p => p.activo !== false);
      this.invLoading = false;
    },
    error: (e) => {
      this.invError = e?.error?.message || e?.message || 'Error cargando productos';
      this.invLoading = false;
    },
  });

  // Cargar sucursales de la concesión (tu API usa query concesion_id)
  this.sucursalesService.listByConcesion(this.concesionId).subscribe({
    next: (r: any) => {
      const raw = r?.data ?? r?.items ?? r?.sucursales ?? r ?? [];
      const arr: any[] = Array.isArray(raw) ? raw : [];
     this.sucursales = arr.map((x: any, idx: number) => {
  const zonaId = x?.zona_id ?? x?.zonaId ?? x?.zona ?? '';

  return {
    id: x?.id ?? x?.uid ?? x?.docId ?? x?._id ?? String(idx),
    zona_id: zonaId,
    zonaNombre: this.mapearNombreZona(zonaId),
    activo: x?.activo ?? true,
    cajasCount: Array.isArray(x?.sucursal?.cajas) ? x.sucursal.cajas.length : (x?.cajasCount ?? 0),
  };
});

    if (!this.invForm.controls.sucursalId.value && this.sucursales.length > 0) {
  this.invForm.controls.sucursalId.setValue(this.sucursales[0].id);
}
    },
    error: () => {},
  });

  // limpia selector/cantidad
  this.selectedProduct = null;
  this.searchProducto = '';
  this.showQtyModal = false;
  this.qtyValue = null;
}

cerrarInventarioModal() {
  this.showInvModal = false;
  this.modoInventarioSucursal = false;
  this.sucursalesGuardadas = [];

  // cierra mini modal si estaba abierto
  this.showQtyModal = false;
  this.qtyValue = null;
  this.priceValue = null;
  this.selectedProduct = null;
  this.searchProducto = '';
  this.invForm.controls.sucursalId.setValue('');
}

activarModoSucursal() {
  this.invError = '';
  this.invOkMsg = '';
  this.modoInventarioSucursal = true;

  if (!this.invForm.controls.sucursalId.value) {
    const siguiente = this.sucursalesDisponiblesParaCaptura[0];
    if (siguiente) {
      this.invForm.controls.sucursalId.setValue(siguiente.id);
    }
  }
}

desactivarModoSucursal() {
  this.modoInventarioSucursal = false;
  this.invError = '';
  this.invOkMsg = '';
  this.invForm.controls.sucursalId.setValue('');
}

get sucursalesDisponiblesParaCaptura() {
  return this.sucursales.filter(s => !this.sucursalesGuardadas.includes(s.id));
}

get puedeAgregarOtraSucursal(): boolean {
  return this.sucursalesDisponiblesParaCaptura.length > 0;
}

agregarOtraSucursal() {
  this.invError = '';
  this.invOkMsg = '';
  this.inventarioItems = [];
  this.selectedProduct = null;
  this.searchProducto = '';
  this.showQtyModal = false;
  this.qtyValue = null;
  this.priceValue = null;

  const siguiente = this.sucursalesDisponiblesParaCaptura[0];
  if (siguiente) {
    this.invForm.controls.sucursalId.setValue(siguiente.id);
    this.modoInventarioSucursal = true;
  }
}
quitarDeLista(i: number) {
  this.inventarioItems.splice(i, 1);
}

guardarInventario() {
  this.invError = '';
  this.invOkMsg = '';
  this.invForm.markAllAsTouched();

  if (!this.jornadaActivaNumero || !this.jornadaActivaFecha) {
    this.invError = 'No hay jornada activa.';
    return;
  }

  if (this.inventarioItems.length === 0) {
    this.invError = 'Agrega al menos un producto al inventario.';
    return;
  }

  const productos: InventarioProductoPayload[] = this.inventarioItems.map(x => ({
    productId: x.productId,
    cantidad_inicial: x.cantidad,
    cantidad_final: x.cantidad,
  }));

  this.invSaving = true;

  const body: any = {
    jornadaNumero: Number(this.jornadaActivaNumero),
    fechaJornada: this.jornadaActivaFecha,
    productos,
  };

  if (this.modoInventarioSucursal) {
    const sucursalId = this.invForm.controls.sucursalId.value;

    if (!sucursalId) {
      this.invError = 'Selecciona una sucursal.';
      this.invSaving = false;
      return;
    }

    body.sucursalId = sucursalId;
  }

  this.inventariosService.createInventario(body).subscribe({
    next: () => {
      this.invSaving = false;

      if (this.modoInventarioSucursal) {
        const sucursalId = this.invForm.controls.sucursalId.value;

        if (sucursalId && !this.sucursalesGuardadas.includes(sucursalId)) {
          this.sucursalesGuardadas.push(sucursalId);
        }

        this.invOkMsg = 'Inventario por sucursal guardado correctamente.';
        this.inventarioItems = [];
        this.selectedProduct = null;
        this.searchProducto = '';
        this.showQtyModal = false;
        this.qtyValue = null;
        this.priceValue = null;

        const siguiente = this.sucursalesDisponiblesParaCaptura[0];
        if (siguiente) {
          this.invForm.controls.sucursalId.setValue(siguiente.id);
        } else {
          this.invForm.controls.sucursalId.setValue('');
        }

        return;
      }

      this.invOkMsg = 'Inventario guardado correctamente.';
      setTimeout(() => this.cerrarInventarioModal(), 450);
    },
    error: (e) => {
      const msg = e?.error?.message || e?.message || 'No se pudo guardar el inventario.';
      const errs = e?.error?.errors ? JSON.stringify(e.error.errors) : '';
      this.invError = errs ? `${msg}: ${errs}` : msg;
      this.invSaving = false;
    },
  });
}

private cargarConcesionNombre() {
  // No tenemos endpoint getById, entonces usamos list() y buscamos por id
  this.concessionsService.list().subscribe({
    next: (items: Concesion[]) => {
      const found = (items || []).find(x => x.id === this.concesionId);
      this.concesionNombre = found?.nombre || this.concesionId;
    },
    error: () => {
      this.concesionNombre = this.concesionId;
    }
  });
}

private cargarProductosExistentes() {
  this.productosLoading = true;
  this.productsService.listByConcesion(this.concesionId).subscribe({
    next: (items) => {
      this.productosExistentes = items || [];
      this.productosLoading = false;
    },
    error: () => {
      this.productosExistentes = [];
      this.productosLoading = false;
    }
  });
}
}