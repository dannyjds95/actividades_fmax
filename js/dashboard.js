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

// Obtener datos del usuario y cuadrilla en sesión
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
        console.warn('Error al leer usuario_sesion de localStorage', e);
    }

    return { userId, userCargo, cuadId };
}

// ==========================================
// 2. FUNCIONES DE CONSULTA Y RENDERIZADO
// ==========================================

// Cargar métricas principales (Tarjetas superiores)
async function cargarMetricas(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin || fechaInicio === 'undefined' || fechaFin === 'undefined' || fechaInicio === 'null' || fechaFin === 'null') return;

    const { userId, userCargo, cuadId } = getDatosSesion();

    try {
        const queryParams = new URLSearchParams({
            inicio: fechaInicio,
            fin: fechaFin,
            user_id: userId,
            user_cargo: userCargo,
            cuad_id: cuadId // 👈 Filtro por Cuadrilla agregado
        });

        const res = await fetch(`${BASE_URL}/api/dashboard-metricas?${queryParams}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();

        if (data.status === 'success') {
            const m = data.metricas || {};

            const setTexto = (id, texto) => {
                const el = document.getElementById(id);
                if (el) el.textContent = texto;
            };

            setTexto('lbl_monto_facturado', `$${parseFloat(m.monto_facturado || 0).toFixed(2)}`);
            setTexto('lbl_total_actividades', m.total_actividades || 0);
            setTexto('lbl_registros_guardados', m.registros_guardados || 0);
            setTexto('lbl_excedente_fibra', `${m.excedente_m || 0} m`);
            setTexto('lbl_excedente_valor', `$${parseFloat(m.excedente_valor || 0).toFixed(2)}`);
            setTexto('lbl_puntos_red_ac', `${m.puntos_red || 0} / ${m.equipos_ac || 0}`);

            const totalCobrado = m.valores_cobrados !== undefined ? m.valores_cobrados : (m.act_valores_cobrados || 0);
            setTexto('lbl_valores_cobrados', `$${parseFloat(totalCobrado || 0).toFixed(2)}`);
        }
    } catch (err) {
        console.error('Error cargando métricas:', err);
    }
}

// Cargar secciones secundarias (Resumen cuadrilla y desglose de actividades)
async function cargarSeccionesSecundarias(fechaInicio, fechaFin) {
    const { userId, userCargo, cuadId } = getDatosSesion();

    try {
        const queryParams = new URLSearchParams({
            user_id: userId,
            user_cargo: userCargo,
            cuad_id: cuadId // 👈 Filtro por Cuadrilla agregado
        });

        if (fechaInicio && fechaFin) {
            queryParams.append('inicio', fechaInicio);
            queryParams.append('fin', fechaFin);
        }

        const res = await fetch(`${BASE_URL}/api/dashboard-metricas?${queryParams}`);

        if (!res.ok) {
            const errorHtml = await res.text();
            console.error('Respuesta no válida del servidor:', res.status, errorHtml);
            return;
        }

        const data = await res.json();

        if (data.status === 'success') {
            // 1. Resumen Cuadrilla / Usuario
            const trabajos = data.cuadrilla?.total_trabajos || 0;
            const monto = parseFloat(data.cuadrilla?.total_monto || 0).toFixed(2);

            const elTrabajos = document.getElementById('lbl_cuadrilla_trabajos');
            const elMonto = document.getElementById('lbl_cuadrilla_monto');

            if (elTrabajos) elTrabajos.textContent = `${trabajos} trabajos`;
            if (elMonto) elMonto.textContent = `$${monto}`;

            // 2. Detalle de Actividades por tipo
            const cntActividades = document.getElementById('cnt_detalle_actividades');
            if (cntActividades) {
                if (data.actividades && data.actividades.length > 0) {
                    cntActividades.innerHTML = data.actividades.map(act => {
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

        }
    } catch (err) {
        console.error('Error al procesar datos secundarios:', err);
    }
}

// Cargar opciones en el selector de Períodos
async function cargarPeriodos(selectPeriodo) {
    try {
        const res = await fetch(`${BASE_URL}/api/obtener-periodos`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();

        if (data.status === 'success' && Array.isArray(data.periodos) && data.periodos.length > 0) {
            selectPeriodo.innerHTML = '<option value="">Seleccione un período...</option>';

            const ahora = new Date();
            const year = ahora.getFullYear();
            const month = String(ahora.getMonth() + 1).padStart(2, '0');
            const day = String(ahora.getDate()).padStart(2, '0');
            const hoy = `${year}-${month}-${day}`;

            let periodoActualIndex = -1;

            const obtenerFechaLimpia = (f) => {
                if (!f) return '';
                if (typeof formatFecha === 'function') {
                    const formatted = formatFecha(f);
                    if (formatted && formatted.includes('-')) return formatted;
                }
                return String(f).split('T')[0];
            };

            data.periodos.forEach((p, index) => {
                const option = document.createElement('option');
                const id = p.id;
                const inicio = obtenerFechaLimpia(p.fecha_inicio);
                const fin = obtenerFechaLimpia(p.fecha_final);

                option.value = id;
                option.textContent = `${inicio} a ${fin}`;
                option.dataset.inicio = inicio;
                option.dataset.fin = fin;
                selectPeriodo.appendChild(option);

                if (inicio && fin && hoy >= inicio && hoy <= fin) {
                    periodoActualIndex = index + 1;
                }
            });

            const indexASeleccionar = periodoActualIndex !== -1 ? periodoActualIndex : 1;

            if (selectPeriodo.options[indexASeleccionar]) {
                selectPeriodo.selectedIndex = indexASeleccionar;
                const optSeleccionada = selectPeriodo.options[indexASeleccionar];

                const inicioSel = optSeleccionada.dataset.inicio;
                const finSel = optSeleccionada.dataset.fin;

                cargarMetricas(inicioSel, finSel);
                cargarSeccionesSecundarias(inicioSel, finSel);
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

    let usuario = {};
    try {
        usuario = JSON.parse(sessionData);
    } catch (e) {
        console.error('Error al leer datos de sesión:', e);
        localStorage.clear();
        window.location.href = '../index.html';
        return;
    }

    const nombreMostrar = usuario.user_nombre || usuario.nombre || 'Usuario';

    const userNameEl = document.getElementById('userName');
    const welcomeUserEl = document.getElementById('welcomeUser');

    if (userNameEl) userNameEl.textContent = nombreMostrar;
    if (welcomeUserEl) welcomeUserEl.textContent = nombreMostrar;

    // Control de Cierre de Sesión Completo
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('usuario_sesion');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_cargo');
            localStorage.removeItem('cuad_id'); // 👈 Se limpia la cuadrilla guardada
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

        await cargarPeriodos(selectPeriodo);
    }
});