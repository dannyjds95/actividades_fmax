const BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    const selectPeriodo = document.getElementById('select_periodo');
    const fechaDesde = document.getElementById('fecha_desde');
    const fechaHasta = document.getElementById('fecha_hasta');
    const filterTipo = document.getElementById('filter_tipo');
    const filterSector = document.getElementById('filter_sector');
    const filterCobradas = document.getElementById('filter_cobradas');

    // Cargar selector de períodos y seleccionar el activo de la fecha actual
    cargarPeriodos(selectPeriodo);

    // Listener para cambio de período
    selectPeriodo.addEventListener('change', (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        if (opt && opt.dataset.inicio && opt.dataset.fin) {
            fechaDesde.value = opt.dataset.inicio;
            fechaHasta.value = opt.dataset.fin;
            cargarActividades();
        }
    });

    // Listeners de actualización dinámica
    [fechaDesde, fechaHasta, filterTipo, filterCobradas].forEach(el => {
        el.addEventListener('change', cargarActividades);
    });

    let timeoutSector;
    filterSector.addEventListener('input', () => {
        clearTimeout(timeoutSector);
        timeoutSector = setTimeout(cargarActividades, 300);
    });
});

async function cargarPeriodos(selectPeriodo) {
    try {
        const res = await fetch(`${BASE_URL}/api/obtener-periodos`);
        const data = await res.json();

        if (data.status === 'success' && Array.isArray(data.periodos)) {
            selectPeriodo.innerHTML = '<option value="">Seleccione un período...</option>';

            const hoy = new Date().toISOString().split('T')[0];
            let actualIdx = -1;

            data.periodos.forEach((p, index) => {
                const opt = document.createElement('option');
                const inicio = String(p.fecha_inicio).split('T')[0];
                const fin = String(p.fecha_final).split('T')[0];

                opt.value = p.id;
                opt.textContent = `${inicio} a ${fin}`;
                opt.dataset.inicio = inicio;
                opt.dataset.fin = fin;
                selectPeriodo.appendChild(opt);

                if (hoy >= inicio && hoy <= fin) {
                    actualIdx = index + 1;
                }
            });

            const selIndex = actualIdx !== -1 ? actualIdx : 1;
            if (selectPeriodo.options[selIndex]) {
                selectPeriodo.selectedIndex = selIndex;
                const optSel = selectPeriodo.options[selIndex];
                document.getElementById('fecha_desde').value = optSel.dataset.inicio;
                document.getElementById('fecha_hasta').value = optSel.dataset.fin;
                cargarActividades();
            }
        }
    } catch (err) {
        console.error('Error al obtener períodos:', err);
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
        const data = await res.json();

        if (data.status === 'success' && Array.isArray(data.actividades)) {
            const lista = data.actividades;
            txtTotal.textContent = `${lista.length} registros`;

            if (lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="11" class="text-center">No se encontraron registros para estos filtros.</td></tr>';
                return;
            }

            tbody.innerHTML = lista.map(item => `
                <tr>
                    <td>${item.act_fecha ? item.act_fecha.split('T')[0] : ''}</td>
                    <td><b>${item.act_cliente || 'N/A'}</b></td>
                    <td><span class="badge-tipo badge-${(item.act_tipo || 'GENERAL').toLowerCase()}">${item.act_tipo || 'GENERAL'}</span></td>
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
        tbody.innerHTML = '<tr><td colspan="11" class="text-center text-red">Error al cargar datos.</td></tr>';
    }
}

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