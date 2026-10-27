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

// Helper centralizado para obtener datos de sesión
function getDatosSesion() {
    let userId = localStorage.getItem('user_id') || '';
    let userCargo = localStorage.getItem('user_cargo') || '';
    let cuadId = localStorage.getItem('cuad_id') || '';

    try {
        const sesion = JSON.parse(localStorage.getItem('usuario_sesion') || '{}');
        if (!userId) userId = sesion.user_id || sesion.id || '';
        if (!userCargo) userCargo = sesion.user_cargo || sesion.cargo || '';
        if (!cuadId) cuadId = sesion.cuad_id || '';
    } catch (e) {
        console.warn('Error al leer datos de sesión:', e);
    }

    return { userId, userCargo, cuadId };
}

// ===================================================
// 2. INICIALIZACIÓN Y EVENTOS
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
    const selectPeriodo = document.getElementById('select_periodo');
    const fechaDesde = document.getElementById('fecha_desde');
    const fechaHasta = document.getElementById('fecha_hasta');
    const filterTipo = document.getElementById('filter_tipo');
    const filterCliente = document.getElementById('filter_cliente');
    const filterCobradas = document.getElementById('filter_cobradas');

    // Cargar selector de períodos
    if (typeof cargarPeriodos === 'function' && selectPeriodo) {
        cargarPeriodos(selectPeriodo);
    }

    // Evento al cambiar de período
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

    // Filtros dinámicos inmediatos
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
                    actualIdx = index + 1;
                }
            });

            const selIndex = actualIdx !== -1 ? actualIdx : (data.periodos.length > 0 ? 1 : 0);

            if (selectPeriodo.options[selIndex]) {
                selectPeriodo.selectedIndex = selIndex;
                const optSel = selectPeriodo.options[selIndex];

                const fechaDesde = document.getElementById('fecha_desde');
                const fechaHasta = document.getElementById('fecha_hasta');

                if (fechaDesde) fechaDesde.value = optSel.dataset.inicio || '';
                if (fechaHasta) fechaHasta.value = optSel.dataset.fin || '';

                cargarActividades();
            }
        }
    } catch (err) {
        console.error('Error al obtener períodos:', err);
        selectPeriodo.innerHTML = '<option value="">Error al cargar períodos</option>';
    }
}

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

    // 🎯 1. Obtener datos de sesión incluyendo cuadrilla
    const { userId, userCargo, cuadId } = getDatosSesion();

    // 2. Obtener valores de los filtros de la interfaz
    const inicio = document.getElementById('fecha_desde')?.value || '';
    const fin = document.getElementById('fecha_hasta')?.value || '';
    const tipo = document.getElementById('filter_tipo')?.value || '';
    const cliente = (document.getElementById('filter_cliente')?.value || '').trim();
    const cobradas = document.getElementById('filter_cobradas')?.value || '';

    tbody.innerHTML = '<tr><td colspan="11" class="text-center">Buscando registros...</td></tr>';

    try {
        // 🎯 3. Incluir cuad_id en los parámetros de la URL
        const queryParams = new URLSearchParams({
            inicio,
            fin,
            tipo,
            cliente,
            cobradas,
            user_id: userId,
            user_cargo: userCargo,
            cuad_id: cuadId
        });

        const res = await fetch(`${BASE_URL}/api/actividades?${queryParams}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();

        if (data.status === 'success' && Array.isArray(data.actividades)) {
            let lista = data.actividades;

            // Filtrado secundario en frontend si es necesario
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

            window.actividadesCargadas = lista;

            if (txtTotal) txtTotal.textContent = `${lista.length} registros`;

            if (lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="11" class="text-center">No se encontraron registros para estos filtros.</td></tr>';
                actualizarResumenTotales(0, 0, 0, 0, 0, 0, 0);
                return;
            }

            let sumActividades = 0;
            let sumExcedenteMetros = 0;
            let sumExcedenteValor = 0;
            let sumPtRed = 0;
            let sumAc = 0;
            let sumTotalMonto = 0;
            let sumValoresCobrados = 0;

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

                const detalleLimpio = String(item.act_detalle || item.detalle || '').replace(/"/g, '&quot;');
                const tipoLimpio = String(item.act_tipo || 'INSTALACION').replace(/"/g, '&quot;');

                sumActividades += cantAct;
                sumExcedenteMetros += excMetros;
                sumExcedenteValor += excedenteMonto;
                sumPtRed += numPtRed;
                sumAc += numAc;
                sumTotalMonto += totalMontoNum;
                sumValoresCobrados += cobradoNum;

                const fechaFormateada = formatFecha(item.act_fecha);
                const claseBadge = getBadgeClass(item.act_tipo);

                return `
                <tr data-detalle="${detalleLimpio}" data-cobrado="${valorCobradoFormatted}" data-tipo="${tipoLimpio}">
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
                            <button class="btn-action btn-view" onclick="verDetalleActividad(${idReg})" title="Ver Detalle">🔍</button>
                            <button class="btn-action btn-edit" onclick="editarActividad(${idReg})">Editar</button>
                            <button class="btn-action btn-delete" onclick="eliminarActividad(${idReg})">Eliminar</button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

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

async function eliminarActividad(idActividad) {
    if (!idActividad) {
        alert('ID de registro no válido.');
        return;
    }

    const confirmacion = confirm(`¿Estás seguro de que deseas eliminar la actividad #${idActividad}? Esta acción no se puede deshacer.`);
    if (!confirmacion) return;

    try {
        const res = await fetch(`${BASE_URL}/api/actividades?id=${idActividad}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();

        if (data.status === 'success') {
            alert('✅ Registro eliminado con éxito.');
            cargarActividades();
        } else {
            alert(`⚠️ Error: ${data.message || 'No se pudo eliminar el registro.'}`);
        }

    } catch (err) {
        console.error('Error al intentar eliminar actividad:', err);
        alert('❌ Ocurrió un error al conectar con el servidor para eliminar el registro.');
    }
}

function vaciarFiltros() {
    const filterTipo = document.getElementById('filter_tipo');
    const filterCliente = document.getElementById('filter_cliente');
    const filterCobradas = document.getElementById('filter_cobradas');

    if (filterTipo) filterTipo.value = '';
    if (filterCliente) filterCliente.value = '';
    if (filterCobradas) filterCobradas.value = '';

    const selectPeriodo = document.getElementById('select_periodo');
    const fechaDesde = document.getElementById('fecha_desde');
    const fechaHasta = document.getElementById('fecha_hasta');

    if (selectPeriodo && selectPeriodo.options.length > 0) {
        const hoy = new Date().toISOString().split('T')[0];
        let actualIdx = -1;

        for (let i = 0; i < selectPeriodo.options.length; i++) {
            const opt = selectPeriodo.options[i];
            if (opt.dataset.inicio && opt.dataset.fin) {
                if (hoy >= opt.dataset.inicio && hoy <= opt.dataset.fin) {
                    actualIdx = i;
                    break;
                }
            }
        }

        const selIndex = actualIdx !== -1 ? actualIdx : (selectPeriodo.options.length > 1 ? 1 : 0);
        selectPeriodo.selectedIndex = selIndex;

        const optSel = selectPeriodo.options[selIndex];
        if (optSel && optSel.dataset.inicio && optSel.dataset.fin) {
            if (fechaDesde) fechaDesde.value = optSel.dataset.inicio;
            if (fechaHasta) fechaHasta.value = optSel.dataset.fin;
        }
    }

    cargarActividades();
}

function verDetalleActividad(idActividad) {
    const item = (window.actividadesCargadas || []).find(act => (act.id || act.act_id) == idActividad);
    if (!item) return;

    const modal = document.getElementById('modal_ver_actividad');
    const container = document.getElementById('actividad_detalle_body');
    if (!modal || !container) return;

    const fecha = formatFecha(item.act_fecha) || 'N/A';
    const claseBadge = getBadgeClass(item.act_tipo);

    const excMetros = parseFloat(item.act_excedente || 0);
    const excMonto = parseFloat(item.act_excedente_valor || 0);
    const ptRed = parseFloat(item.act_pred || item.act_pt_red || 0);
    const numAc = parseFloat(item.act_ac || 0);
    const cobrados = parseFloat(item.act_valores_cobrados || 0);
    const totalMonto = parseFloat(item.act_total !== null && item.act_total !== undefined ? item.act_total : (item.act_valor || 0));

    const cuadrillaNombre = item.cuad_nombre || (item.cuad_id ? `Cuadrilla #${item.cuad_id}` : 'No asignada');

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
                <span class="detail-label">Tipo</span>
                <span class="detail-value"><span class="badge-tipo ${claseBadge}">${item.act_tipo || 'GENERAL'}</span></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Forma</span>
                <span class="detail-value">${item.act_forma || 'NORMAL'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Sector</span>
                <span class="detail-value">${item.act_sector || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Cantidad Fibra</span>
                <span class="detail-value">${item.act_fibra || 0} m</span>
            </div>

            <div class="detail-item highlight-blue col-span-2">
                <span class="detail-label">Valor Actividad</span>
                <span class="detail-value price-tag">$${totalMonto.toFixed(2)}</span>
            </div>

            ${camposOpcionalesHTML}

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

function editarActividad(idActividad) {
    if (!idActividad) {
        alert('ID de registro no válido.');
        return;
    }
    window.location.href = `act_propia.html?editId=${idActividad}`;
}

// 🎯 Guardar o actualizar actividad (Corregido para la API unificada)
async function guardarActividad(e) {
    if (e) e.preventDefault();

    const act_id = document.getElementById('form_act_id').value;
    const { userId, cuadId } = getDatosSesion();

    const payload = {
        user_id: userId ? Number(userId) : null,
        act_id: act_id ? Number(act_id) : null,
        act_fecha: document.getElementById('act_fecha').value,
        cuad_id: Number(document.getElementById('cuad_id')?.value || cuadId || 1),
        act_cliente: document.getElementById('act_cliente').value.trim(),
        act_sector: document.getElementById('act_sector').value.trim(),
        act_tipo: document.getElementById('act_tipo').value,
        act_forma: document.getElementById('act_forma').value.trim(),
        act_fibra: parseFloat(document.getElementById('act_fibra').value || 0),
        act_excedente: parseFloat(document.getElementById('act_excedente').value || 0),
        act_pred: parseInt(document.getElementById('act_pred').value || 0, 10),
        act_ac: parseInt(document.getElementById('act_ac').value || 0, 10),
        act_valores_cobrados: parseFloat(document.getElementById('act_valores_cobrados').value || 0),
        act_detalle: document.getElementById('act_detalle').value.trim()
    };

    const isEdit = Boolean(act_id);
    // 🎯 Siempre llamamos a /api/actividades independientemente de si es PUT o POST
    const url = `${BASE_URL}/api/actividades`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();

        if (data.status === 'success') {
            alert(isEdit ? '✅ Actividad actualizada correctamente.' : '✅ Actividad registrada con éxito.');
            cerrarModal();
            cargarActividades();
        } else {
            alert(`⚠️ Error: ${data.message || 'No se pudo guardar la actividad.'}`);
        }
    } catch (err) {
        console.error('Error al guardar actividad:', err);
        alert('❌ Error de conexión al intentar guardar la actividad.');
    }
}

function abrirModal() {
    const modal = document.getElementById('modal_actividad');
    if (modal) modal.classList.add('active');
}

function cerrarModal() {
    const modal = document.getElementById('modal_actividad');
    if (modal) modal.classList.remove('active');
}

// Cierre de modales con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarModalVerActividad();
        cerrarModal();
    }
});

// Función para Generar un Reporte PDF Elegante con los Filtros Visibles
// Función para Generar el Reporte PDF capturando dinámicamente la tabla visible
function generarReportePDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("⚠️ La librería jsPDF aún se está cargando. Por favor, reintenta en un momento.");
        return;
    }

    const { jsPDF } = window.jspdf;
    // Formato horizontal (landscape) para mayor espacio de columnas
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // 1. Obtener datos de la Sesión y Filtros
    const userSession = JSON.parse(localStorage.getItem('usuario_sesion')) || {};
    const usuarioNombre = userSession.nombre || userSession.usuario || 'Técnico';

    const fechaDesdeInput = document.querySelector('input[type="date"]:first-of-type, #fecha_desde');
    const fechaHastaInput = document.querySelector('input[type="date"]:last-of-type, #fecha_hasta');
    const fechaDesde = fechaDesdeInput ? fechaDesdeInput.value : '---';
    const fechaHasta = fechaHastaInput ? fechaHastaInput.value : '---';

    // 2. EXTRAER CELDAS DE LA TABLA VISIBLE EN PANTALLA
    const tableBody = [];
    // Busca cualquier fila dentro del tbody existente en la página
    const filasTabla = document.querySelectorAll('tbody tr');

    let totalActidadesCount = 0;
    let sumaMontoTotal = 0;
    let sumaPuntosRed = 0;
    let sumaEquiposAC = 0;
    let sumaValoresCobrados = 0;

    filasTabla.forEach(row => {
        // Ignorar filas ocultas por filtros o mensajes de "sin datos"
        if (row.style.display === 'none' || row.cells.length < 5) return;

        // Limpiar el texto de cada celda quitando saltos de línea y espacios extra
        const cols = Array.from(row.cells).map(cell => {
            // Clonar celda para quitar botones o elementos no deseados si existieran
            const clone = cell.cloneNode(true);
            const buttons = clone.querySelectorAll('button, a, .btn');
            buttons.forEach(b => b.remove());
            return clone.textContent.trim().replace(/\s+/g, ' ');
        });

        // Mapear celdas correspondientes a la tabla
        const fecha = cols[0] || '';
        const cliente = cols[1] || '';
        const tipo = cols[2] || '';
        const forma = cols[3] || '';
        const fibra = cols[4] || '0 m';
        const excedente = cols[5] || '0 m ($0.00)';
        const ptRed = cols[6] || '0';
        const ac = cols[7] || '0';
        const total = cols[8] || '$0.00';
        const cobrados = cols[9] || '$0.00';

        tableBody.push([fecha, cliente, tipo, forma, fibra, excedente, ptRed, ac, total, cobrados]);

        // Acumular totales para el resumen
        totalActidadesCount++;
        sumaPuntosRed += parseInt(ptRed, 10) || 0;
        sumaEquiposAC += parseInt(ac, 10) || 0;

        // Convertir formato moneda a número ($20.00 -> 20.00)
        const parseMoneda = (txt) => parseFloat(String(txt).replace(/[^0-9.-]+/g, "")) || 0;
        sumaMontoTotal += parseMoneda(total);
        sumaValoresCobrados += parseMoneda(cobrados);
    });

    // 3. ENCABEZADO CORPORATIVO
    doc.setFillColor(15, 23, 42); // #27292e (Azul Oscuro)
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('REPORTE DE ACTIVIDADES', 14, 13);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('SISTEMA DE GESTIÓN TÉCNICA - FMAX', 283, 13, { align: 'right' });

    // Metadatos
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    const fechaImpresion = new Date().toLocaleString('es-EC');
    doc.text(`Generado por: ${usuarioNombre}`, 14, 30);
    doc.text(`Fecha de Emisión: ${fechaImpresion}`, 283, 30, { align: 'right' });
    doc.text(`Período: ${fechaDesde} al ${fechaHasta}`, 14, 35);

    // 4. DIBUJAR TARJETAS DE RESUMEN CON VALORES CALCULADOS
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 39, 269, 16, 2, 2, 'FD');

    const kpis = [
        { label: 'TOTAL ACTIVIDADES', val: String(totalActidadesCount) },
        { label: 'MONTO TOTAL', val: `$${sumaMontoTotal.toFixed(2)}` },
        { label: 'EXCEDENTE FIBRA', val: '0 m ($0.00)' },
        { label: 'PUNTOS DE RED', val: String(sumaPuntosRed) },
        { label: 'EQUIPOS AC', val: String(sumaEquiposAC) },
        { label: 'VALORES COBRADOS', val: `$${sumaValoresCobrados.toFixed(2)}` }
    ];

    const startX = 20;
    const stepX = 43;

    kpis.forEach((kpi, idx) => {
        const posX = startX + (idx * stepX);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, posX, 44);

        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(kpi.val, posX, 50);
    });

    // 5. RENDERIZAR TABLA CON JSPDF-AUTOTABLE
    doc.autoTable({
        startY: 59,
        head: [['FECHA', 'CLIENTE', 'TIPO', 'FORMA', 'FIBRA', 'EXCEDENTE', 'PT. RED', 'AC', 'TOTAL', 'V. COBRADOS']],
        body: tableBody,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2.5,
            textColor: [30, 41, 59],
            valign: 'middle'
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 22, halign: 'center' },
            1: { cellWidth: 70 },
            2: { cellWidth: 26, halign: 'center' },
            3: { cellWidth: 32, halign: 'left' },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 28, halign: 'center' },
            6: { cellWidth: 16, halign: 'center' },
            7: { cellWidth: 14, halign: 'center' },
            8: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
            9: { cellWidth: 22, halign: 'right' }
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14, bottom: 18 },
        didDrawPage: function () {
            const strPage = `Página ${doc.internal.getNumberOfPages()}`;
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(strPage, 283, 202, { align: 'right' });
            doc.text('Documento generado automáticamente - Confidencial', 14, 202);
        }
    });

    // 6. DESCARGAR ARCHIVO
    doc.save(`Reporte_Actividades_${fechaDesde}_al_${fechaHasta}.pdf`);
}

// Vincular al botón de Reporte PDF
document.addEventListener('DOMContentLoaded', () => {
    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', generarReportePDF);
    }
});


// Función para Generar el Reporte Excel Dividido en Secciones (Instalaciones y Traslados)
// Función para Generar el Reporte Excel solo con Valores Cobrados (> 0)
async function generarReporteExcel() {
    if (!window.ExcelJS) {
        alert("⚠️ La librería ExcelJS aún se está cargando. Por favor, reintenta en un momento.");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('REPORTES');

    // 1. Configuración de ancho de columnas
    worksheet.columns = [
        { key: 'index', width: 8 },      // Columna A (#)
        { key: 'fecha', width: 22 },     // Columna B (FECHA)
        { key: 'cliente', width: 45 },   // Columna C (CLIENTE)
        { key: 'detalle', width: 35 },   // Columna D (DETALLE DE LO COBRADO)
        { key: 'valor', width: 18 }      // Columna E (VALOR COBRADO)
    ];

    // Estilos de bordes y paletas de colores
    const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    // Azul pastel para Instalaciones (#DCE6F1)
    const fillAzul = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCE6F1' }
    };

    // Verde pastel para Traslados (#E2EFDA)
    const fillVerde = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2EFDA' }
    };

    // 2. CLASIFICAR LAS FILAS VISIBLES DE LA TABLA
    const instalaciones = [];
    const traslados = [];
    const otrasActividades = [];

    const filasTabla = document.querySelectorAll('tbody tr');

    filasTabla.forEach(row => {
        if (row.style.display === 'none' || row.cells.length < 5) return;

        const cols = Array.from(row.cells).map(cell => cell.textContent.trim().replace(/\s+/g, ' '));

        // Extraer valor cobrado
        const rawValor = row.getAttribute('data-cobrado') || row.dataset.cobrado || cols[9] || '0';
        const valorCobrado = parseFloat(String(rawValor).replace(/[^0-9.-]+/g, "")) || 0;

        // 🎯 FILTRO CLAVE: Omitir registros si no tienen valor cobrado (> 0)
        if (valorCobrado <= 0) return;

        const fecha = cols[0] || '';
        const cliente = cols[1] || '';
        let tipo = (row.getAttribute('data-tipo') || cols[2] || '').toUpperCase();

        let detalleTexto = row.getAttribute('data-detalle') || row.dataset.detalle || '---';
        if (!detalleTexto || detalleTexto === 'undefined' || detalleTexto === 'null') {
            detalleTexto = '---';
        }

        const itemData = { fecha, cliente, detalle: detalleTexto, valor: valorCobrado };

        if (tipo.includes('INSTALAC')) {
            instalaciones.push(itemData);
        } else if (tipo.includes('TRASLAD')) {
            traslados.push(itemData);
        } else {
            otrasActividades.push(itemData);
        }
    });

    // Validar si hay al menos un registro con cobro para exportar
    if (instalaciones.length === 0 && traslados.length === 0 && otrasActividades.length === 0) {
        alert("⚠️ No hay registros con valores cobrados (> $0.00) para exportar.");
        return;
    }

    // 3. FUNCIÓN AUXILIAR PARA DIBUJAR CADA SECCIÓN
    function construirSeccion(titulo, headerFechaLabel, totalLabel, listaDatos, fillEstilo) {
        // Añadir espacio si ya existe una tabla previa
        if (worksheet.lastRow && worksheet.lastRow.number > 0) {
            worksheet.addRow([]);
            worksheet.addRow([]);
        }

        const startRowIndex = worksheet.lastRow ? worksheet.lastRow.number + 1 : 1;

        // Banner Superior
        worksheet.mergeCells(`A${startRowIndex}:E${startRowIndex}`);
        const titleCell = worksheet.getCell(`A${startRowIndex}`);
        titleCell.value = titulo;
        titleCell.font = { name: 'Calibri', size: 11, bold: true };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = fillEstilo;

        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
            worksheet.getCell(`${col}${startRowIndex}`).border = borderStyle;
        });

        // Encabezados
        const headers = ['#', headerFechaLabel, 'CLIENTE', 'DETALLE DE LO COBRADO', 'VALOR\nCOBRADO'];
        const headerRow = worksheet.addRow(headers);
        headerRow.height = 28;

        headerRow.eachCell((cell) => {
            cell.font = { name: 'Calibri', size: 10, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = borderStyle;
        });

        // Filas de Datos con Cobro
        let sumaSeccion = 0;

        listaDatos.forEach((item, idx) => {
            sumaSeccion += item.valor;

            const dataRow = worksheet.addRow([
                idx + 1,
                item.fecha,
                item.cliente,
                item.detalle,
                item.valor
            ]);

            dataRow.height = 22;

            dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }; // #
            dataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }; // Fecha
            dataRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }; // Cliente
            dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' }; // Detalle

            const cellValor = dataRow.getCell(5);
            cellValor.alignment = { horizontal: 'right', vertical: 'middle' };
            cellValor.numFmt = '"$"#,##0.00;("$"#,##0.00);"-"';

            dataRow.eachCell({ includeEmpty: true }, (cell) => {
                cell.font = { name: 'Calibri', size: 10 };
                cell.border = borderStyle;
            });
        });

        // Fila Final de Suma Total
        const totalRowIndex = worksheet.lastRow.number + 1;

        worksheet.mergeCells(`A${totalRowIndex}:D${totalRowIndex}`);
        const labelTotalCell = worksheet.getCell(`A${totalRowIndex}`);
        labelTotalCell.value = totalLabel;
        labelTotalCell.font = { name: 'Calibri', size: 10, bold: true };
        labelTotalCell.alignment = { horizontal: 'center', vertical: 'middle' };
        labelTotalCell.fill = fillEstilo;

        ['A', 'B', 'C', 'D'].forEach(col => {
            worksheet.getCell(`${col}${totalRowIndex}`).border = borderStyle;
            worksheet.getCell(`${col}${totalRowIndex}`).fill = fillEstilo;
        });

        const valueTotalCell = worksheet.getCell(`E${totalRowIndex}`);
        valueTotalCell.value = sumaSeccion;
        valueTotalCell.font = { name: 'Calibri', size: 10, bold: true };
        valueTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
        valueTotalCell.numFmt = '"$"#,##0.00;("$"#,##0.00);"-"';
        valueTotalCell.fill = fillEstilo;
        valueTotalCell.border = borderStyle;

        worksheet.getRow(totalRowIndex).height = 24;
    }

    // 4. GENERAR SOLO LAS SECCIONES QUE TENGAN REGISTROS COBRADOS
    if (instalaciones.length > 0) {
        construirSeccion(
            'INSTALACIONES',
            'FECHA DE\nINSTALACIÓN',
            'TOTAL DE INSTALACIÓN',
            instalaciones,
            fillAzul
        );
    }

    if (traslados.length > 0) {
        construirSeccion(
            'TRASLADOS',
            'FECHA DE\nTRASLADOS',
            'TOTAL DE TRASLADOS',
            traslados,
            fillVerde
        );
    }

    if (otrasActividades.length > 0) {
        construirSeccion(
            'OTRAS ACTIVIDADES',
            'FECHA DE\nACTIVIDAD',
            'TOTAL DE OTRAS ACTIVIDADES',
            otrasActividades,
            fillAzul
        );
    }

    // 5. DESCARGAR EL ARCHIVO EXCEL
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Reporte_Valores_Cobrados_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Vincular al botón de Reporte Excel
document.addEventListener('DOMContentLoaded', () => {
    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', generarReporteExcel);
    }
});