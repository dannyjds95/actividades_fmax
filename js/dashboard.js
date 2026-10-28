// ==========================================
// 1. CONFIGURACIÓN GLOBAL Y ESTADO
// ==========================================
const BASE_URL = window.location.hostname.includes('vercel.app')
    ? ''
    : 'https://actividades-fmax-9ysb.vercel.app';

// Variable global para guardar la lista detallada del período actual
let listaDetalladaGlobal = [];

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
// 2. LÓGICA DE POP-UP MODAL
// ==========================================

function abrirModal(titulo, subtitulo, cabeceras, filas) {
    const modal = document.getElementById('dashboardModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const modalTableHead = document.getElementById('modalTableHead');
    const modalTableBody = document.getElementById('modalTableBody');

    if (!modal) {
        console.warn('El modal #dashboardModal no existe en el HTML.');
        return;
    }

    if (modalTitle) modalTitle.textContent = titulo;
    if (modalSubtitle) modalSubtitle.textContent = subtitulo;

    if (modalTableHead) {
        modalTableHead.innerHTML = `<tr>${cabeceras.map(h => `<th>${h}</th>`).join('')}</tr>`;
    }

    if (modalTableBody) {
        if (filas.length === 0) {
            modalTableBody.innerHTML = `<tr><td colspan="${cabeceras.length}" style="text-align:center; padding: 20px; color:#94a3b8;">No se encontraron registros.</td></tr>`;
        } else {
            modalTableBody.innerHTML = filas.map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
        }
    }

    modal.style.display = 'flex';
}

function inicializarModalGlobal() {
    const modal = document.getElementById('dashboardModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (closeModalBtn) {
        closeModalBtn.onclick = () => { if (modal) modal.style.display = 'none'; };
    }
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
}

function vincularEventosTarjetas() {
    const cards = document.querySelectorAll('.card, .metric-card, [class*="card"]');

    // 1. Total Actividades
    const cardTotal = document.getElementById('card_total_actividades') || cards[0];
    if (cardTotal) {
        cardTotal.classList.add('cursor-pointer');
        cardTotal.onclick = () => {
            const cabeceras = ['Cliente', 'Cantidad (act_cantidad)', 'Tipo'];
            const filas = listaDetalladaGlobal.map(a => [
                a.cliente || a.act_cliente || 'Sin Nombre',
                a.cantidad || a.act_cantidad || 1,
                a.tipo || a.act_tipo || 'N/A'
            ]);
            abrirModal('Total de Actividades', `${filas.length} registros cargados`, cabeceras, filas);
        };
    }

    // 2. Monto Facturado
    const cardMonto = document.getElementById('card_monto_facturado') || cards[1];
    if (cardMonto) {
        cardMonto.classList.add('cursor-pointer');
        cardMonto.onclick = () => {
            const cabeceras = ['Cliente', 'Total ($)'];
            const filas = listaDetalladaGlobal.map(a => [
                a.cliente || a.act_cliente || 'Sin Nombre',
                `$${parseFloat(a.total || a.act_total || 0).toFixed(2)}`
            ]);
            abrirModal('Monto Facturado', 'Detalle de montos por cliente', cabeceras, filas);
        };
    }

    // 3. Excedente
    const cardExcedente = document.getElementById('card_excedente_fibra') || cards[2];
    if (cardExcedente) {
        cardExcedente.classList.add('cursor-pointer');
        cardExcedente.onclick = () => {
            const filtrados = listaDetalladaGlobal.filter(a => parseFloat(a.excedente || a.act_excedente || 0) > 0);
            const cabeceras = ['Cliente', 'Cantidad Excedente'];
            const filas = filtrados.map(a => [
                a.cliente || a.act_cliente || 'Sin Nombre',
                `${a.excedente || a.act_excedente} m`
            ]);
            abrirModal('Excedente de Fibra', 'Solo actividades con excedente mayor a 0', cabeceras, filas);
        };
    }

    // 4. Puntos Red / AC
    const cardPredAc = document.getElementById('card_puntos_red_ac') || cards[3];
    if (cardPredAc) {
        cardPredAc.classList.add('cursor-pointer');
        cardPredAc.onclick = () => {
            const filtrados = listaDetalladaGlobal.filter(a => (Number(a.puntos_red || a.act_pred || 0) > 0 || Number(a.ac || a.act_ac || 0) > 0));
            const cabeceras = ['Cliente', 'Puntos de Red', 'Instalación AC'];
            const filas = filtrados.map(a => [
                a.cliente || a.act_cliente || 'Sin Nombre',
                a.puntos_red || a.act_pred || 0,
                a.ac || a.act_ac || 0
            ]);
            abrirModal('Puntos de Red / Equipos AC', 'Detalle por cliente', cabeceras, filas);
        };
    }

    // 🎯 5. Valores Cobrados (FILTRADO: Solo valores mayores a 0)
    const cardValores = document.getElementById('card_valores_cobrados') || cards[4];
    if (cardValores) {
        cardValores.classList.add('cursor-pointer');
        cardValores.onclick = () => {
            // Filtrar únicamente los registros donde el valor cobrado sea estrictamente mayor a 0
            const filtrados = listaDetalladaGlobal.filter(a => parseFloat(a.valores_cobrados || a.act_valores_cobrados || 0) > 0);
            
            const cabeceras = ['Cliente', 'Valor Cobrado ($)'];
            const filas = filtrados.map(a => [
                a.cliente || a.act_cliente || 'Sin Nombre',
                `$${parseFloat(a.valores_cobrados || a.act_valores_cobrados || 0).toFixed(2)}`
            ]);
            abrirModal('Valores Cobrados', `Detalle de cobros realizados (${filas.length} registros)`, cabeceras, filas);
        };
    }
}

function vincularEventosDetalleTipo() {
    const items = document.querySelectorAll('#cnt_detalle_actividades .activity-item');
    items.forEach(item => {
        item.classList.add('cursor-pointer');
        item.onclick = () => {
            const badge = item.querySelector('.badge-tipo');
            const tipoTexto = badge ? badge.textContent.trim().toUpperCase() : '';

            const filtrados = listaDetalladaGlobal.filter(a => {
                const t = String(a.tipo || a.act_tipo || '').toUpperCase();
                return t.includes(tipoTexto);
            });

            const cabeceras = ['Cliente', 'Tipo de Instalación / Detalle', 'Monto ($)'];
            const filas = filtrados.map(a => [
                a.cliente || a.act_cliente || 'Sin Nombre',
                a.tipo_instalacion || a.tipo || a.act_tipo || tipoTexto,
                `$${parseFloat(a.total || a.act_total || 0).toFixed(2)}`
            ]);

            abrirModal(`Listado de ${tipoTexto}`, `Total registros: ${filtrados.length}`, cabeceras, filas);
        };
    });
}

// ==========================================
// 3. FUNCIONES DE CONSULTA Y RENDERIZADO
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
            cuad_id: cuadId
        });

        const res = await fetch(`${BASE_URL}/api/dashboard-metricas?${queryParams}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();

        if (data.status === 'success') {
            const m = data.metricas || {};

            // Guardar la lista detallada devuelta por la API para los Pop-ups
            listaDetalladaGlobal = data.lista_detallada || [];

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

            // Activar eventos de clic en las tarjetas
            vincularEventosTarjetas();
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
            cuad_id: cuadId
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

                    // Activar eventos de clic en las actividades individuales de la sección inferior
                    vincularEventosDetalleTipo();
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
// 4. INICIALIZACIÓN ÚNICA DE LA PÁGINA
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    inicializarModalGlobal();

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
            localStorage.removeItem('cuad_id');
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