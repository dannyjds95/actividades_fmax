// ===================================================
// 1. CONFIGURACIÓN GLOBAL Y AUXILIARES
// ===================================================
const BASE_URL = window.location.hostname.includes('vercel.app')
    ? ''
    : 'https://actividades-fmax-9ysb.vercel.app';

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
    const filterSector = document.getElementById('filter_sector');
    const filterCobradas = document.getElementById('filter_cobradas');

    // Cargar selector de períodos y auto-seleccionar el período actual
    cargarPeriodos(selectPeriodo);

    // Evento al cambiar de período en el select
    selectPeriodo.addEventListener('change', (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        if (opt && opt.dataset.inicio && opt.dataset.fin) {
            fechaDesde.value = opt.dataset.inicio;
            fechaHasta.value = opt.dataset.fin;
            cargarActividades();
        }
    });

    // Filtros dinámicos inmediatos
    [fechaDesde, fechaHasta, filterTipo, filterCobradas].forEach(el => {
        if (el) el.addEventListener('change', cargarActividades);
    });

    // Filtro por sector/cliente con debounce
    let timeoutSector;
    if (filterSector) {
        filterSector.addEventListener('input', () => {
            clearTimeout(timeoutSector);
            timeoutSector = setTimeout(cargarActividades, 300);
        });
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

async function cargarActividades() {
    const tbody = document.getElementById('tbl_actividades_body');
    const txtTotal = document.getElementById('txt_total_registros');

    const inicio = document.getElementById('fecha_desde').value;
    const fin = document.getElementById('fecha_hasta').value;
    const tipo = document.getElementById('filter_tipo').value;
    const sector = document.getElementById('filter_sector').value.trim();
    const cobradas = document.getElementById('filter_cobradas').value;

    tbody.innerHTML = '<tr><td colspan="11" class="text-center">Buscando registros...</td></tr>';

    try {
        const queryParams = new URLSearchParams({ inicio, fin, tipo, sector, cobradas });
        const res = await fetch(`${BASE_URL}/api/obtener-actividades?${queryParams}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();

        if (data.status === 'success' && Array.isArray(data.actividades)) {
            const lista = data.actividades;
            if (txtTotal) txtTotal.textContent = `${lista.length} registros`;

            if (lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="11" class="text-center">No se encontraron registros para estos filtros.</td></tr>';
                return;
            }

            tbody.innerHTML = lista.map(item => `
                <tr>
                    <td>${formatFecha(item.act_fecha)}</td>
                    <td><b>${item.act_cliente || 'N/A'}</b></td>
                    <td><span class="badge-tipo ${getBadgeClass(item.act_tipo)}">${item.act_tipo || 'GENERAL'}</span></td>
                    <td>${item.act_forma || 'NORMAL'}</td>
                    <td>${item.act_fibra || 0} m</td>
                    <td>${item.act_excedente || 0} m ($${parseFloat(item.act_excedente_valor || 0).toFixed(2)})</td>
                    <td>${item.act_pred || 0}</td>
                    <td>${item.act_ac || 0}</td>
                    <td><b>$${parseFloat(item.act_total || item.act_valor || 0).toFixed(2)}</b></td>
                    <td class="${parseFloat(item.act_valores_cobrados || 0) > 0 ? 'text-green' : ''}">
                        $${parseFloat(item.act_valores_cobrados || 0).toFixed(2)}
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-edit" onclick="editarActividad(${item.id})">Editar</button>
                            <button class="btn-action btn-delete" onclick="eliminarActividad(${item.id})">Eliminar</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error al cargar lista de actividades:', err);
        tbody.innerHTML = '<tr><td colspan="11" class="text-center text-red">Error al conectar con la base de datos.</td></tr>';
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