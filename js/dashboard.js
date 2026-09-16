// ==========================================
// 1. CONFIGURACIÓN GLOBAL Y AUXILIARES
// ==========================================
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

// ==========================================
// 2. FUNCIONES DE CONSULTA Y RENDERIZADO
// ==========================================

// Cargar métricas principales (Tarjetas superiores)
async function cargarMetricas(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin || fechaFin === 'undefined') return;

    try {
        const res = await fetch(`${BASE_URL}/api/obtener-dashboard-metricas?inicio=${fechaInicio}&fin=${fechaFin}`);
        const data = await res.json();

        if (data.status === 'success') {
            const m = data.metricas || {};
            document.getElementById('lbl_monto_facturado').textContent = `$${parseFloat(m.monto_facturado || 0).toFixed(2)}`;
            document.getElementById('lbl_total_actividades').textContent = m.total_actividades || 0;
            document.getElementById('lbl_registros_guardados').textContent = m.registros_guardados || 0;
            document.getElementById('lbl_excedente_fibra').textContent = `${m.excedente_m || 0} m`;
            document.getElementById('lbl_excedente_valor').textContent = `$${parseFloat(m.excedente_valor || 0).toFixed(2)}`;
            document.getElementById('lbl_puntos_red_ac').textContent = `${m.puntos_red || 0} Pts / ${m.equipos_ac || 0} AC`;
        }
    } catch (err) {
        console.error('Error cargando métricas:', err);
    }
}

async function cargarSeccionesSecundarias(fechaInicio, fechaFin) {
    try {
        let url = `${BASE_URL}/api/obtener-ultimos-registros`;
        if (fechaInicio && fechaFin) {
            url += `?inicio=${fechaInicio}&fin=${fechaFin}`;
        }

        const res = await fetch(url);
        
        // Si el servidor falla antes de responder en JSON
        if (!res.ok) {
            const errorHtml = await res.text();
            console.error('Respuesta no válida del servidor:', res.status, errorHtml);
            return;
        }

        const data = await res.json();

        if (data.status === 'success') {
            // 1. Resumen Cuadrilla
            const trabajos = data.cuadrilla?.total_trabajos || 0;
            const monto = parseFloat(data.cuadrilla?.total_monto || 0).toFixed(2);
            
            const elTrabajos = document.getElementById('lbl_cuadrilla_trabajos');
            const elMonto = document.getElementById('lbl_cuadrilla_monto');
            
            if (elTrabajos) elTrabajos.textContent = `${trabajos} trabajos`;
            if (elMonto) elMonto.textContent = `$${monto}`;

// 2. Detalle de Actividades
const cntActividades = document.getElementById('cnt_detalle_actividades');
if (cntActividades) {
    if (data.actividades && data.actividades.length > 0) {
        cntActividades.innerHTML = data.actividades.map(act => {
            // Lee 'cantidad', si no existe busca 'registros', si no asigna 0
            const totalCantidad = act.cantidad !== undefined ? act.cantidad : (act.registros !== undefined ? act.registros : 0);

            return `
                <div class="activity-item">
                    <div>
                        <span class="badge-tipo ${getBadgeClass(act.tipo)}">${act.tipo}</span>
                        <div class="item-subtitle" style="margin-top:4px;">${totalCantidad} cantidad</div>
                    </div>
                    <span class="activity-amount-blue">$${parseFloat(act.monto || 0).toFixed(2)}</span>
                </div>
            `;
        }).join('');
    } else {
        cntActividades.innerHTML = '<p style="color:#94a3b8; font-size:13px; text-align:center; padding:12px;">Sin actividades en este período</p>';
    }
}
            // 3. Tabla Últimos 10 Registros
            const tblBody = document.getElementById('tbl_ultimos_registros');
            if (tblBody) {
                if (data.ultimos && data.ultimos.length > 0) {
                    tblBody.innerHTML = data.ultimos.map(reg => {
                        const fechaFormateada = reg.fecha ? String(reg.fecha).split('T')[0] : '-';
                        return `
                            <tr>
                                <td>${fechaFormateada}</td>
                                <td class="td-cuadrilla">${reg.cuadrilla}</td>
                                <td>${reg.cliente}</td>
                                <td><span class="badge-tipo ${getBadgeClass(reg.tipo)}">${reg.tipo}</span></td>
                                <td>${reg.forma}</td>
                                <td class="td-monto">$${parseFloat(reg.monto || 0).toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    tblBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">No se encontraron registros</td></tr>';
                }
            }
        }
    } catch (err) {
        console.error('Error al procesar datos secundarios:', err);
    }
}

// Cargar opciones en el selector de Períodos
async function cargarPeriodos(selectPeriodo) {
    try {
        const res = await fetch(`${BASE_URL}/api/obtener-periodos`);
        const data = await res.json();

        if (data.status === 'success' && data.periodos.length > 0) {
            selectPeriodo.innerHTML = '<option value="">Seleccione un período...</option>';

            data.periodos.forEach(p => {
                const option = document.createElement('option');
                const id = p.id;
                const inicio = formatFecha(p.fecha_inicio);
                const fin = formatFecha(p.fecha_final);

                option.value = id;
                option.textContent = `Período ${id} (${inicio} a ${fin})`;
                option.dataset.inicio = inicio;
                option.dataset.fin = fin;
                selectPeriodo.appendChild(option);
            });

            // Auto-seleccionar el primer período activo y cargar datos inmediatamente
            if (selectPeriodo.options.length > 1) {
                selectPeriodo.selectedIndex = 1;
                const firstOpt = selectPeriodo.options[1];
                cargarMetricas(firstOpt.dataset.inicio, firstOpt.dataset.fin);
                cargarSeccionesSecundarias(firstOpt.dataset.inicio, firstOpt.dataset.fin);
            }
        }
    } catch (err) {
        console.error('Error cargando períodos:', err);
    }
}

// ==========================================
// 3. INICIALIZACIÓN ÚNICA DE LA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Control de Sesión de Usuario
    const sessionData = localStorage.getItem('usuario_sesion');
    if (!sessionData) {
        window.location.href = '../index.html';
        return;
    }

    const usuario = JSON.parse(sessionData);
    const userNameEl = document.getElementById('userName');
    const welcomeUserEl = document.getElementById('welcomeUser');

    if (userNameEl) userNameEl.textContent = `${usuario.nombre}`;
    if (welcomeUserEl) welcomeUserEl.textContent = usuario.nombre;

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('usuario_sesion');
            window.location.href = '../index.html';
        });
    }

    // 2. Control del Selector de Períodos
    const selectPeriodo = document.getElementById('select_periodo');
    if (selectPeriodo) {
        selectPeriodo.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            if (selectedOption && selectedOption.dataset.inicio) {
                const inicio = selectedOption.dataset.inicio;
                const fin = selectedOption.dataset.fin;
                cargarMetricas(inicio, fin);
                cargarSeccionesSecundarias(inicio, fin);
            }
        });

        // Cargar los períodos al inicializar
        await cargarPeriodos(selectPeriodo);
    }
});