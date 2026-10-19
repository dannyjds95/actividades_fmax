// ===================================================
// 1. CONFIGURACIÓN GLOBAL Y AUXILIARES
// ===================================================
const BASE_URL = window.location.hostname.includes('vercel.app')
    ? ''
    : 'https://actividades-fmax-9ysb.vercel.app';

window.actividadesCargadas = [];

const formatFecha = (fechaStr) => {
    if (!fechaStr) return '';
    return String(fechaStr).split('T')[0];
};

function getBadgeClass(tipo) {
    const t = String(tipo || '').toUpperCase();
    if (t.includes('INSTALAC')) return 'badge-instalacion';
    if (t.includes('VISITA')) return 'badge-visita';
    if (t.includes('TRASLADO')) return 'badge-traslado';
    return 'badge-default';
}

// ===================================================
// 2. INICIALIZACIÓN Y EVENTOS
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
    const selectPeriodo = document.getElementById('select_periodo');
    const fechaDesde = document.getElementById('fecha_desde');
    const fechaHasta = document.getElementById('fecha_hasta');
    const filterTipo = document.getElementById('filter_tipo');
    const filterCliente = document.getElementById('filter_cliente'); // Actualizado: ID correcto
    const filterCobradas = document.getElementById('filter_cobradas');

    // Cargar selector de períodos y auto-seleccionar el período actual
    if (typeof cargarPeriodos === 'function' && selectPeriodo) {
        cargarPeriodos(selectPeriodo);
    }

    // Evento al cambiar de período en el select
    if (selectPeriodo) {
        selectPeriodo.addEventListener('change', (e) => {
            const opt = e.target.options[e.target.selectedIndex];
            if (opt && opt.dataset.inicio && opt.dataset.fin) {
                if (fechaDesde) fechaDesde.value = opt.dataset.inicio;
                if (fechaHasta) fechaHasta.value = opt.dataset.fin;
                cargarActividades();
            }
        });
    }

    // Filtros dinámicos inmediatos para selectores y fechas
    [fechaDesde, fechaHasta, filterTipo, filterCobradas].forEach(el => {
        if (el) el.addEventListener('change', cargarActividades);
    });

    // Búsqueda por cliente en tiempo real con debounce (300ms)
    let timeoutCliente;
    if (filterCliente) {
        filterCliente.addEventListener('input', () => {
            clearTimeout(timeoutCliente);
            timeoutCliente = setTimeout(cargarActividades, 300);
        });

        // Prevenir recarga de página al presionar Enter en la casilla de cliente
        const formulario = filterCliente.closest('form');
        if (formulario) {
            formulario.addEventListener('submit', (e) => e.preventDefault());
        }
    }
});
// ===================================================
// 3. CARGA DE DATOS (API)
// ===================================================
async function cargarPeriodos(selectPeriodo) {
    try {
        const res = await fetch(`${BASE_URL}/api/obtener-periodos`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();

        if (data.status === 'success' && Array.isArray(data.periodos)) {
            selectPeriodo.innerHTML = '<option value="">Seleccione un período...</option>';

            const hoy = new Date().toISOString().split('T')[0];
            let actualIdx = -1;

            data.periodos.forEach((p, index) => {
                const opt = document.createElement('option');
                const inicio = formatFecha(p.fecha_inicio);
                const fin = formatFecha(p.fecha_final);

                opt.value = p.id;
                opt.textContent = `${inicio} a ${fin}`;
                opt.dataset.inicio = inicio;
                opt.dataset.fin = fin;
                selectPeriodo.appendChild(opt);

                if (hoy >= inicio && hoy <= fin) {
                    actualIdx = index + 1; // +1 por la opción inicial
                }
            });

            // Seleccionar período actual (o el primero disponible)
            const selIndex = actualIdx !== -1 ? actualIdx : (data.periodos.length > 0 ? 1 : 0);

            if (selectPeriodo.options[selIndex]) {
                selectPeriodo.selectedIndex = selIndex;
                const optSel = selectPeriodo.options[selIndex];

                document.getElementById('fecha_desde').value = optSel.dataset.inicio || '';
                document.getElementById('fecha_hasta').value = optSel.dataset.fin || '';

                cargarActividades();
            }
        }
    } catch (err) {
        console.error('Error al obtener períodos:', err);
        selectPeriodo.innerHTML = '<option value="">Error al cargar períodos</option>';
    }
}

// Función auxiliar para actualizar los valores en los elementos del DOM del Resumen
function actualizarResumenTotales(totalAct, excM, excV, ptRed, cantAc, totalM, cobradosM) {
    const elTotalAct = document.getElementById('sum_total_actividades');
    const elExc = document.getElementById('sum_total_excedente');
    const elPtRed = document.getElementById('sum_puntos_red');
    const elAc = document.getElementById('sum_cantidad_ac');
    const elTotalMonto = document.getElementById('sum_total_monto');
    const elCobrados = document.getElementById('sum_valores_cobrados');

    if (elTotalAct) elTotalAct.textContent = totalAct;
    if (elExc) elExc.textContent = `${excM} m ($${excV.toFixed(2)})`;
    if (elPtRed) elPtRed.textContent = ptRed;
    if (elAc) elAc.textContent = cantAc;
    if (elTotalMonto) elTotalMonto.textContent = `$${totalM.toFixed(2)}`;
    if (elCobrados) elCobrados.textContent = `$${cobradosM.toFixed(2)}`;
}

async function cargarActividades() {
    const tbody = document.getElementById('tbl_actividades_body');
    const txtTotal = document.getElementById('txt_total_registros');

    if (!tbody) return;

    // 1. Obtener valores de los filtros
    const inicio = document.getElementById('fecha_desde')?.value || '';
    const fin = document.getElementById('fecha_hasta')?.value || '';
    const tipo = document.getElementById('filter_tipo')?.value || '';
    const cliente = (document.getElementById('filter_cliente')?.value || '').trim();
    const cobradas = document.getElementById('filter_cobradas')?.value || '';

    tbody.innerHTML = '<tr><td colspan="11" class="text-center">Buscando registros...</td></tr>';

    try {
        const queryParams = new URLSearchParams({ inicio, fin, tipo, cliente, cobradas });
        const res = await fetch(`${BASE_URL}/api/obtener-actividades?${queryParams}`);

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();

        if (data.status === 'success' && Array.isArray(data.actividades)) {
            let lista = data.actividades;

            // 🔍 Respaldo Frontend: Filtrado de seguridad en cliente si la API no filtra
            if (cliente !== '') {
                const queryCliente = cliente.toLowerCase();
                lista = lista.filter(item =>
                    (item.act_cliente || '').toLowerCase().includes(queryCliente)
                );
            }

            if (tipo !== '' && tipo !== 'TODOS') {
                lista = lista.filter(item =>
                    (item.act_tipo || '').toUpperCase() === tipo.toUpperCase()
                );
            }

            if (cobradas === 'si') {
                lista = lista.filter(item => parseFloat(item.act_valores_cobrados || 0) > 0);
            } else if (cobradas === 'no') {
                lista = lista.filter(item => parseFloat(item.act_valores_cobrados || 0) === 0);
            }

            // 📌 Almacenar la lista activa para los pop-ups de las tarjetas de métricas
            window.actividadesCargadas = lista;

            if (txtTotal) txtTotal.textContent = `${lista.length} registros`;

            if (lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="11" class="text-center">No se encontraron registros para estos filtros.</td></tr>';
                actualizarResumenTotales(0, 0, 0, 0, 0, 0, 0);
                return;
            }

            // Variables acumuladoras para los totales filtrados
            let sumActividades = 0;
            let sumExcedenteMetros = 0;
            let sumExcedenteValor = 0;
            let sumPtRed = 0;
            let sumAc = 0;
            let sumTotalMonto = 0;
            let sumValoresCobrados = 0;

            // 2. Renderizar filas y realizar sumatorias
            tbody.innerHTML = lista.map(item => {
                const idReg = item.id || item.act_id || 0;

                const cantAct = parseFloat(item.act_cantidad || 1);
                const excMetros = parseFloat(item.act_excedente || 0);
                const excedenteMonto = parseFloat(item.act_excedente_valor || 0);
                const excedenteValorFormatted = excedenteMonto.toFixed(2);

                const numPtRed = parseFloat(item.act_pred || item.act_pt_red || 0);
                const numAc = parseFloat(item.act_ac || 0);

                const totalMontoNum = parseFloat(item.act_total !== null && item.act_total !== undefined ? item.act_total : (item.act_valor || 0));
                const totalMontoFormatted = totalMontoNum.toFixed(2);

                const cobradoNum = parseFloat(item.act_valores_cobrados || 0);
                const valorCobradoFormatted = cobradoNum.toFixed(2);

                // Sumatorias acumuladas
                sumActividades += cantAct;
                sumExcedenteMetros += excMetros;
                sumExcedenteValor += excedenteMonto;
                sumPtRed += numPtRed;
                sumAc += numAc;
                sumTotalMonto += totalMontoNum;
                sumValoresCobrados += cobradoNum;

                const fechaFormateada = typeof formatFecha === 'function'
                    ? formatFecha(item.act_fecha)
                    : (item.act_fecha ? String(item.act_fecha).split('T')[0] : '');

                const claseBadge = typeof getBadgeClass === 'function'
                    ? getBadgeClass(item.act_tipo)
                    : 'badge-default';

                // Dentro de lista.map() en cargarActividades():
                return `
    <tr>
        <td class="col-fecha text-center">${fechaFormateada}</td>
        <td class="col-cliente">${item.act_cliente || 'N/A'}</td>
        <td class="text-center"><span class="badge-tipo ${claseBadge}">${item.act_tipo || 'GENERAL'}</span></td>
        <td class="text-center">${item.act_forma || 'NORMAL'}</td>
        <td class="text-center">${item.act_fibra || 0} m</td>
        <td class="text-center">
            ${excMetros} m 
            ${excedenteMonto > 0
                        ? `<span class="badge-excedente">($${excedenteValorFormatted})</span>`
                        : `<span class="val-zero">($${excedenteValorFormatted})</span>`}
        </td>
        <td class="text-center">${numPtRed}</td>
        <td class="text-center">${numAc}</td>
        <td class="text-right"><b>$${totalMontoFormatted}</b></td>
        <td class="text-center">
            ${cobradoNum > 0
                        ? `<span class="badge-cobrado">$${valorCobradoFormatted}</span>`
                        : `<span class="val-zero">$${valorCobradoFormatted}</span>`}
        </td>
        <td class="text-center">
            <div class="action-buttons">
                <!-- Botón Ver Detalle (Lupa) -->
                <button class="btn-action btn-view" onclick="verDetalleActividad(${idReg})" title="Ver Detalle">🔍</button>
                <button class="btn-action btn-edit" onclick="editarActividad(${idReg})">Editar</button>
                <button class="btn-action btn-delete" onclick="eliminarActividad(${idReg})">Eliminar</button>
            </div>
        </td>
    </tr>
`;
            }).join('');

            // 3. Actualizar la tarjeta de resumen en el DOM
            actualizarResumenTotales(
                sumActividades,
                sumExcedenteMetros,
                sumExcedenteValor,
                sumPtRed,
                sumAc,
                sumTotalMonto,
                sumValoresCobrados
            );

        } else {
            window.actividadesCargadas = [];
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">No se pudieron obtener los datos.</td></tr>';
            actualizarResumenTotales(0, 0, 0, 0, 0, 0, 0);
        }
    } catch (err) {
        window.actividadesCargadas = [];
        console.error('Error al cargar lista de actividades:', err);
        tbody.innerHTML = '<tr><td colspan="11" class="text-center text-red">Error al conectar con la base de datos.</td></tr>';
        actualizarResumenTotales(0, 0, 0, 0, 0, 0, 0);
    }
}
// ===================================================
// 4. ACCIONES DE REGISTRO
// ===================================================
function editarActividad(id) {
    window.location.href = `editar.html?id=${id}`;
}

async function eliminarActividad(id) {
    if (confirm('¿Está seguro de que desea eliminar este registro?')) {
        try {
            const res = await fetch(`${BASE_URL}/api/eliminar-actividad?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.status === 'success') {
                cargarActividades();
            } else {
                alert('No se pudo eliminar el registro.');
            }
        } catch (err) {
            console.error('Error al eliminar:', err);
        }
    }
}

function vaciarFiltros() {
    // 1. Limpiar campos de texto y selects (Actualizado: filter_cliente)
    const filterTipo = document.getElementById('filter_tipo');
    const filterCliente = document.getElementById('filter_cliente');
    const filterCobradas = document.getElementById('filter_cobradas');

    if (filterTipo) filterTipo.value = '';
    if (filterCliente) filterCliente.value = '';
    if (filterCobradas) filterCobradas.value = '';

    // 2. Restablecer el selector al Período Actual basado en la fecha de hoy
    const selectPeriodo = document.getElementById('select_periodo');
    const fechaDesde = document.getElementById('fecha_desde');
    const fechaHasta = document.getElementById('fecha_hasta');

    if (selectPeriodo && selectPeriodo.options.length > 0) {
        const hoy = new Date().toISOString().split('T')[0];
        let actualIdx = -1;

        // Buscar qué opción abarca la fecha actual
        for (let i = 0; i < selectPeriodo.options.length; i++) {
            const opt = selectPeriodo.options[i];
            if (opt.dataset.inicio && opt.dataset.fin) {
                if (hoy >= opt.dataset.inicio && hoy <= opt.dataset.fin) {
                    actualIdx = i;
                    break;
                }
            }
        }

        // Si se encuentra el período actual se selecciona, sino se usa el primero disponible
        const selIndex = actualIdx !== -1 ? actualIdx : (selectPeriodo.options.length > 1 ? 1 : 0);
        selectPeriodo.selectedIndex = selIndex;

        // Asignar las fechas desde/hasta del período seleccionado
        const optSel = selectPeriodo.options[selIndex];
        if (optSel && optSel.dataset.inicio && optSel.dataset.fin) {
            if (fechaDesde) fechaDesde.value = optSel.dataset.inicio;
            if (fechaHasta) fechaHasta.value = optSel.dataset.fin;
        }
    }

    // 3. Consultar las actividades con los filtros limpios
    cargarActividades();
}

function abrirModalDetalle(tipoMetrica) {
    const modal = document.getElementById('modal_detalle_metrica');
    const titulo = document.getElementById('modal_detalle_titulo');
    const thead = document.getElementById('tbl_detalle_metrica_head');
    const tbody = document.getElementById('tbl_detalle_metrica_body');

    if (!modal || !tbody || !thead) return;

    let registrosFiltrados = [];
    let tituloTexto = '';
    let nombreColumnaMétrica = '';
    let obtenerValorMétrica = (item) => '';

    // Filtrado y configuración dinámica según la tarjeta seleccionada
    switch (tipoMetrica) {
        case 'excedente':
            tituloTexto = 'Actividades con Excedente';
            nombreColumnaMétrica = 'Excedente';
            registrosFiltrados = (window.actividadesCargadas || []).filter(item =>
                parseFloat(item.act_excedente || 0) > 0 || parseFloat(item.act_excedente_valor || 0) > 0
            );
            obtenerValorMétrica = (item) => {
                const m = item.act_excedente || 0;
                const val = parseFloat(item.act_excedente_valor || 0).toFixed(2);
                return `<span class="badge-excedente">${m} m ($${val})</span>`;
            };
            break;

        case 'pt_red':
            tituloTexto = 'Actividades con Puntos de Red';
            nombreColumnaMétrica = 'Puntos de Red';
            registrosFiltrados = (window.actividadesCargadas || []).filter(item =>
                parseFloat(item.act_pred || item.act_pt_red || 0) > 0
            );
            obtenerValorMétrica = (item) => `<b>${item.act_pred || item.act_pt_red || 0}</b>`;
            break;

        case 'ac':
            tituloTexto = 'Actividades con AC Instalados';
            nombreColumnaMétrica = 'AC Instalados';
            registrosFiltrados = (window.actividadesCargadas || []).filter(item =>
                parseFloat(item.act_ac || 0) > 0
            );
            obtenerValorMétrica = (item) => `<b>${item.act_ac || 0}</b>`;
            break;

        case 'cobrados':
            tituloTexto = 'Actividades con Valores Cobrados';
            nombreColumnaMétrica = 'Valores Cobrados';
            registrosFiltrados = (window.actividadesCargadas || []).filter(item =>
                parseFloat(item.act_valores_cobrados || 0) > 0
            );
            obtenerValorMétrica = (item) => {
                const val = parseFloat(item.act_valores_cobrados || 0).toFixed(2);
                return `<span class="badge-cobrado">$${val}</span>`;
            };
            break;

        case 'monto_total':
            tituloTexto = 'Actividades con Monto Total';
            nombreColumnaMétrica = 'Monto Total';
            registrosFiltrados = (window.actividadesCargadas || []).filter(item =>
                parseFloat(item.act_total !== null && item.act_total !== undefined ? item.act_total : (item.act_valor || 0)) > 0
            );
            obtenerValorMétrica = (item) => {
                const total = parseFloat(item.act_total !== null && item.act_total !== undefined ? item.act_total : (item.act_valor || 0)).toFixed(2);
                return `<b>$${total}</b>`;
            };
            break;

        case 'totales':
        default:
            tituloTexto = 'Todas las Actividades del Período';
            nombreColumnaMétrica = 'Cantidad / Fibra';
            registrosFiltrados = [...(window.actividadesCargadas || [])];
            obtenerValorMétrica = (item) => `${item.act_cantidad || 1} act (${item.act_fibra || 0} m)`;
            break;
    }

    if (titulo) titulo.textContent = `${tituloTexto} (${registrosFiltrados.length})`;

    // 1. Construir únicamente las cabeceras necesarias
    thead.innerHTML = `
        <tr>
            <th class="text-center">Fecha</th>
            <th>Cliente</th>
            <th class="text-center">Tipo</th>
            <th class="text-center">${nombreColumnaMétrica}</th>
        </tr>
    `;

    // 2. Renderizar los datos limpios
    if (registrosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay registros que coincidan con esta métrica.</td></tr>';
    } else {
        tbody.innerHTML = registrosFiltrados.map(item => {
            const fechaFormateada = typeof formatFecha === 'function'
                ? formatFecha(item.act_fecha)
                : (item.act_fecha ? String(item.act_fecha).split('T')[0] : '');

            const claseBadge = typeof getBadgeClass === 'function'
                ? getBadgeClass(item.act_tipo)
                : 'badge-default';

            return `
                <tr>
                    <td class="text-center">${fechaFormateada}</td>
                    <td><b>${item.act_cliente || 'N/A'}</b></td>
                    <td class="text-center"><span class="badge-tipo ${claseBadge}">${item.act_tipo || 'GENERAL'}</span></td>
                    <td class="text-center">${obtenerValorMétrica(item)}</td>
                </tr>
            `;
        }).join('');
    }

    // Mostrar el modal centrado
    modal.classList.add('active');
}

function cerrarModalDetalle() {
    const modal = document.getElementById('modal_detalle_metrica');
    if (modal) modal.classList.remove('active');
}

// Permitir cerrar modal con la tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModalDetalle();
});


// Función para abrir y armar el modal de detalle completo
function verDetalleActividad(idActividad) {
    const item = (window.actividadesCargadas || []).find(act => (act.id || act.act_id) == idActividad);
    if (!item) return;

    const modal = document.getElementById('modal_ver_actividad');
    const container = document.getElementById('actividad_detalle_body');
    if (!modal || !container) return;

    // Formateo de valores
    const fecha = typeof formatFecha === 'function' ? formatFecha(item.act_fecha) : (item.act_fecha ? String(item.act_fecha).split('T')[0] : 'N/A');
    const claseBadge = typeof getBadgeClass === 'function' ? getBadgeClass(item.act_tipo) : 'badge-default';
    
    const excMetros = parseFloat(item.act_excedente || 0);
    const excMonto = parseFloat(item.act_excedente_valor || 0);
    const ptRed = parseFloat(item.act_pred || item.act_pt_red || 0);
    const numAc = parseFloat(item.act_ac || 0);
    const cobrados = parseFloat(item.act_valores_cobrados || 0);
    const totalMonto = parseFloat(item.act_total !== null && item.act_total !== undefined ? item.act_total : (item.act_valor || 0));

    // Nombre de cuadrilla (muestra nombre si existe en el objeto o el ID)
    const cuadrillaNombre = item.cuad_nombre || (item.cuad_id ? `Cuadrilla #${item.cuad_id}` : 'No asignada');

    // Construcción dinámica de campos condicionales
    let camposOpcionalesHTML = '';

    if (excMetros > 0 || excMonto > 0) {
        camposOpcionalesHTML += `
            <div class="detail-item">
                <span class="detail-label">Excedente</span>
                <span class="detail-value text-blue"><b>${excMetros} m</b> ($${excMonto.toFixed(2)})</span>
            </div>`;
    }

    if (ptRed > 0) {
        camposOpcionalesHTML += `
            <div class="detail-item">
                <span class="detail-label">Puntos de Red</span>
                <span class="detail-value"><b>${ptRed}</b></span>
            </div>`;
    }

    if (numAc > 0) {
        camposOpcionalesHTML += `
            <div class="detail-item">
                <span class="detail-label">AC Instalados</span>
                <span class="detail-value"><b>${numAc}</b></span>
            </div>`;
    }

    if (cobrados > 0) {
        camposOpcionalesHTML += `
            <div class="detail-item highlight-green">
                <span class="detail-label">Valores Cobrados</span>
                <span class="detail-value text-green"><b>$${cobrados.toFixed(2)}</b></span>
            </div>`;
    }

    container.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <span class="detail-label">Fecha</span>
                <span class="detail-value">${fecha}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Cuadrilla</span>
                <span class="detail-value"><b>${cuadrillaNombre}</b></span>
            </div>
            <div class="detail-item col-span-2">
                <span class="detail-label">Cliente</span>
                <span class="detail-value strong">${item.act_cliente || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Sector</span>
                <span class="detail-value">${item.act_sector || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Tipo</span>
                <span class="detail-value"><span class="badge-tipo ${claseBadge}">${item.act_tipo || 'GENERAL'}</span></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Forma</span>
                <span class="detail-value">${item.act_forma || 'NORMAL'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Cantidad Fibra</span>
                <span class="detail-value">${item.act_fibra || 0} m</span>
            </div>

            ${camposOpcionalesHTML}

            <div class="detail-item highlight-blue col-span-2">
                <span class="detail-label">Valor Actividad</span>
                <span class="detail-value price-tag">$${totalMonto.toFixed(2)}</span>
            </div>

            ${item.act_detalle ? `
            <div class="detail-item col-span-2 detail-box">
                <span class="detail-label">Detalle / Observaciones</span>
                <p class="detail-text">${item.act_detalle}</p>
            </div>` : ''}
        </div>
    `;

    modal.classList.add('active');
}

function cerrarModalVerActividad() {
    const modal = document.getElementById('modal_ver_actividad');
    if (modal) modal.classList.remove('active');
}

// Cerrar con Escape o clic en fondo
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModalVerActividad();
});