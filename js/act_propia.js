// Variable global para almacenar el registro original de la BD al entrar en modo edición
let actividadCargada = null;

// URL dinámica de la API (Vercel vs Local)
const BASE_VERCEL_URL = 'https://actividades-fmax-9ysb.vercel.app';
const BASE_URL = (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'))
    ? ''
    : BASE_VERCEL_URL;

// Helper para obtener la sesión activa del usuario
function obtenerSesionUsuario() {
    try {
        return JSON.parse(localStorage.getItem('usuario_sesion')) || {};
    } catch (e) {
        return {};
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const userSession = obtenerSesionUsuario();
    if (!userSession || (!userSession.id && !userSession.user_id)) {
        window.location.href = '../index.html';
        return;
    }

    // Elementos del Formulario
    const form = document.getElementById('actividadForm') || document.getElementById('form_actividad') || document.querySelector('form');
    const userIdInput = document.getElementById('user_id');
    const actIdInput = document.getElementById('act_id');
    const actFechaInput = document.getElementById('act_fecha');
    const actClienteInput = document.getElementById('act_cliente');
    const actSectorSelect = document.getElementById('act_sector');
    const actTipoSelect = document.getElementById('act_tipo');
    const actFormaSelect = document.getElementById('act_forma');
    const actFibraInput = document.getElementById('act_fibra');
    const actDetalleInput = document.getElementById('act_detalle');

    // Radios y Controles Condicionales
    const selectPredQty = document.getElementById('act_pred_qty') || document.getElementById('act_pred');
    const selectAcQty = document.getElementById('act_ac_qty') || document.getElementById('act_ac');
    const inputValoresCobrados = document.getElementById('act_valores_cobrados');

    // Etiquetas del Resumen Económico
    const lblCantidad = document.getElementById('lbl_cantidad');
    const lblValorAct = document.getElementById('lbl_valor_act');
    const lblValorPred = document.getElementById('lbl_valor_pred');
    const lblValorAc = document.getElementById('lbl_valor_ac');
    const lblExcedenteM = document.getElementById('lbl_excedente_m');
    const lblValorExc = document.getElementById('lbl_valor_exc');
    const lblTotal = document.getElementById('lbl_total');

    // Asignar ID de Usuario y Fecha inicial si es registro nuevo
    if (userIdInput) userIdInput.value = userSession.id || userSession.user_id || '';
    if (actFechaInput && !actFechaInput.value) {
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        actFechaInput.value = `${year}-${month}-${day}`;
    }

    // Actualizar opciones de Forma según el Tipo seleccionado
    function updateFormaOptions() {
        if (!actTipoSelect || !actFormaSelect) return;
        const tipo = actTipoSelect.value;
        const currentForma = actFormaSelect.value;
        actFormaSelect.innerHTML = '';

        if (tipo === 'INSTALACION' || tipo === 'TRASLADO') {
            actFormaSelect.add(new Option('NORMAL', 'NORMAL'));
            actFormaSelect.add(new Option('DOBLE', 'DOBLE'));
        } else if (tipo === 'VISITA') {
            actFormaSelect.add(new Option('CAMBIO CONECTOR', 'CAMBIO CONECTOR'));
            actFormaSelect.add(new Option('RECABLEADO NORMAL', 'RECABLEADO NORMAL'));
            actFormaSelect.add(new Option('RECABLEADO DOBLE', 'RECABLEADO DOBLE'));
        } else {
            actFormaSelect.add(new Option('Seleccione Forma', ''));
        }

        if (currentForma) actFormaSelect.value = currentForma;
        calculateAll();
    }

// Cálculo general de tarifas y métricas
    function calculateAll() {
        const session = obtenerSesionUsuario();
        const tipo = actTipoSelect ? actTipoSelect.value : '';
        const forma = actFormaSelect ? actFormaSelect.value : '';

        let actCantidad = 0;
        let tarifaBase = 0;

        if (tipo !== '' && forma !== '') {
            const esDoble = (forma === 'DOBLE' || forma === 'RECABLEADO DOBLE');
            actCantidad = esDoble ? 2 : 1;

            // Si es VISITA pero la forma es DOBLE o RECABLEADO DOBLE,
            // se cobra como actividad/traslado/instalación normal (valor_act)
            if (tipo === 'VISITA' && !esDoble) {
                tarifaBase = parseFloat(session.valor_visita) || 0;
            } else {
                tarifaBase = parseFloat(session.valor_act) || 0;
            }
        }

        if (lblCantidad) lblCantidad.textContent = actCantidad;

        const actValor = tarifaBase * actCantidad;
        if (lblValorAct) lblValorAct.textContent = `$${actValor.toFixed(2)}`;

        // Puntos de Red
        const radioPredChecked = document.querySelector('input[name="has_pred"]:checked, input[name="radio_pred"]:checked')?.value;
        const hasPred = String(radioPredChecked).toUpperCase() === 'SI';
        const actPredQty = (hasPred && selectPredQty) ? (parseInt(selectPredQty.value, 10) || 0) : 0;
        const actPredValor = actPredQty * (parseFloat(session.valor_pred) || 0);
        if (lblValorPred) lblValorPred.textContent = `$${actPredValor.toFixed(2)}`;

        // Equipos AC
        const radioAcChecked = document.querySelector('input[name="has_ac"]:checked, input[name="radio_ac"]:checked')?.value;
        const hasAc = String(radioAcChecked).toUpperCase() === 'SI';
        const actAcQty = (hasAc && selectAcQty) ? (parseInt(selectAcQty.value, 10) || 0) : 0;
        const actAcValor = actAcQty * (parseFloat(session.valor_ac) || 0);
        if (lblValorAc) lblValorAc.textContent = `$${actAcValor.toFixed(2)}`;

        // Excedente de Fibra
        const fibra = actFibraInput ? (parseInt(actFibraInput.value, 10) || 0) : 0;
        const actExcedenteM = fibra > 350 ? (fibra - 350) : 0;
        const actExcedenteValor = actExcedenteM * (parseFloat(session.valor_exc) || 0);
        
        if (lblExcedenteM) lblExcedenteM.textContent = actExcedenteM;
        if (lblValorExc) lblValorExc.textContent = `$${actExcedenteValor.toFixed(2)}`;

        // Total General
        const actTotal = actValor + actPredValor + actAcValor + actExcedenteValor;
        if (lblTotal) lblTotal.textContent = `$${actTotal.toFixed(2)}`;

        return {
            actCantidad: Number(actCantidad) || 0,
            actValor: Number(actValor) || 0,
            actPredQty: Number(actPredQty) || 0,
            actPredValor: Number(actPredValor) || 0,
            actAcQty: Number(actAcQty) || 0,
            actAcValor: Number(actAcValor) || 0,
            actExcedenteM: Number(actExcedenteM) || 0,
            actExcedenteValor: Number(actExcedenteValor) || 0,
            actTotal: Number(actTotal) || 0
        };
    }

    window.calculateAll = calculateAll;
    window.calcularTotales = calculateAll;

    // Escuchadores de eventos
    if (actTipoSelect) actTipoSelect.addEventListener('change', updateFormaOptions);
    if (actFormaSelect) actFormaSelect.addEventListener('change', calculateAll);
    if (actFibraInput) actFibraInput.addEventListener('input', calculateAll);
    if (selectPredQty) selectPredQty.addEventListener('change', calculateAll);
    if (selectAcQty) selectAcQty.addEventListener('change', calculateAll);

    document.querySelectorAll('input[name="has_pred"], input[name="radio_pred"]').forEach(r => {
        r.addEventListener('change', (e) => {
            if (selectPredQty) selectPredQty.classList.toggle('hidden', e.target.value.toUpperCase() === 'NO');
            calculateAll();
        });
    });

    document.querySelectorAll('input[name="has_ac"], input[name="radio_ac"]').forEach(r => {
        r.addEventListener('change', (e) => {
            if (selectAcQty) selectAcQty.classList.toggle('hidden', e.target.value.toUpperCase() === 'NO');
            calculateAll();
        });
    });

    document.querySelectorAll('input[name="has_cobro"], input[name="radio_cobro"]').forEach(r => {
        r.addEventListener('change', (e) => {
            const isSi = e.target.value.toUpperCase() === 'SI';
            if (inputValoresCobrados) {
                inputValoresCobrados.classList.toggle('hidden', !isSi);
                if (!isSi) inputValoresCobrados.value = 0;
            }
            calculateAll();
        });
    });

    // Detectar si venimos a editar desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('editId');

    if (editId) {
        cargarDatosParaEditar(editId);
    }

    // Interceptador principal de envío
    if (form) {
        form.onsubmit = guardarFormulario;
    }

    // Cargar datos del registro para editar
    async function cargarDatosParaEditar(id) {
        try {
            if (actIdInput) actIdInput.value = id;

            const tituloHeader = document.querySelector('h1, h2, h3, .title');
            if (tituloHeader) tituloHeader.textContent = `Editar Actividad #${id}`;

            const response = await fetch(`${BASE_URL}/api/obtener-actividades`);
            if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

            const data = await response.json();
            const actividades = data.actividades || [];
            const item = actividades.find(a => (a.act_id || a.id) == id);

            if (!item) {
                alert(`No se encontró la actividad #${id}.`);
                return;
            }

            // Almacenar el objeto original recuperado de MySQL
            actividadCargada = item;

            if (actIdInput) actIdInput.value = item.act_id || item.id || id;
            if (actClienteInput) actClienteInput.value = item.act_cliente || '';
            if (actFechaInput) actFechaInput.value = item.act_fecha ? String(item.act_fecha).split('T')[0] : '';
            if (actSectorSelect) actSectorSelect.value = item.act_sector || '';
            if (actTipoSelect) actTipoSelect.value = item.act_tipo || '';
            
            updateFormaOptions();
            if (actFormaSelect) actFormaSelect.value = item.act_forma || '';
            if (actFibraInput) actFibraInput.value = item.act_fibra || 0;
            if (actDetalleInput) actDetalleInput.value = item.act_detalle || '';

            const valPtRed = parseFloat(item.act_pred ?? item.act_pt_red ?? 0);
            const valAC = parseFloat(item.act_ac ?? item.cant_ac ?? 0);
            const valCobro = parseFloat(item.act_valores_cobrados ?? item.act_cobro ?? 0);

            const setRadioGroup = (names, numVal, inputEl) => {
                const targetVal = numVal > 0 ? 'SI' : 'NO';
                for (let name of names) {
                    const r = document.querySelector(`input[name="${name}"][value="${targetVal}"], input[name="${name}"][value="${targetVal.toLowerCase()}"]`);
                    if (r) {
                        r.checked = true;
                        r.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
                if (numVal > 0 && inputEl) {
                    inputEl.value = numVal;
                    inputEl.classList.remove('hidden');
                }
            };

            setRadioGroup(['has_pred', 'radio_pred'], valPtRed, selectPredQty);
            setRadioGroup(['has_ac', 'radio_ac'], valAC, selectAcQty);
            setRadioGroup(['has_cobro', 'radio_cobro'], valCobro, inputValoresCobrados);

            setTimeout(calculateAll, 100);

        } catch (err) {
            console.error('Error al cargar datos:', err);
            alert(`Ocurrió un inconveniente al cargar el registro: ${err.message}`);
        }
    }

    // Función Unificada, Sanitizada y Dual de Guardado/Actualización
    async function guardarFormulario(event) {
        if (event) event.preventDefault();

        const session = obtenerSesionUsuario();
        const urlParamsNow = new URLSearchParams(window.location.search);
        const idFromUrl = urlParamsNow.get('editId');
        const idFromInput = actIdInput ? actIdInput.value.trim() : '';

        const actId = idFromUrl || idFromInput;
        const esEdicion = Boolean(actId && actId !== 'null' && actId !== 'undefined' && actId !== '');

        const calcs = calculateAll();
        const clienteVal = actClienteInput ? actClienteInput.value.trim() : '';

        const rawCobrado = inputValoresCobrados ? inputValoresCobrados.value : '0';
        const valCobradoLimpio = parseFloat(String(rawCobrado).replace(',', '.')) || 0;

        const totalFinal = Number(calcs.actTotal) || 0;
        const fibraFinal = actFibraInput ? (parseInt(actFibraInput.value, 10) || 0) : 0;

        // 1. PRESERVAR EL cuad_id ORIGINAL DE LA BASE DE DATOS EN EDICIÓN
        let cuadIdSeguro = null;
        if (esEdicion && actividadCargada && actividadCargada.cuad_id !== undefined && actividadCargada.cuad_id !== null) {
            const parsedCuad = Number(actividadCargada.cuad_id);
            cuadIdSeguro = (!isNaN(parsedCuad) && parsedCuad > 0) ? parsedCuad : null;
        } else if (session.cuad_id && !isNaN(Number(session.cuad_id)) && Number(session.cuad_id) > 0) {
            cuadIdSeguro = Number(session.cuad_id);
        }

        // 2. PRESERVAR EL user_id ORIGINAL O DE SESIÓN
        let userIdSeguro = null;
        if (esEdicion && actividadCargada && actividadCargada.user_id) {
            userIdSeguro = Number(actividadCargada.user_id);
        } else if (session.id || session.user_id) {
            userIdSeguro = Number(session.id || session.user_id);
        }

        // Payload completo con todos los nombres de columnas y aliases para la BD
        const payload = {
            act_id: esEdicion ? Number(actId) : null,
            id: esEdicion ? Number(actId) : null,

            user_id: userIdSeguro,
            cuad_id: cuadIdSeguro,
            act_origen: 'ACTIVIDAD PROPIA',

            act_fecha: actFechaInput ? (actFechaInput.value || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
            fecha: actFechaInput ? (actFechaInput.value || '') : '',

            act_cliente: clienteVal !== '' ? clienteVal : 'NO DEFINIDO',
            cliente: clienteVal !== '' ? clienteVal : 'NO DEFINIDO',

            act_sector: actSectorSelect ? (actSectorSelect.value || 'NORTE') : 'NORTE',
            sector: actSectorSelect ? (actSectorSelect.value || 'NORTE') : 'NORTE',

            act_tipo: actTipoSelect ? (actTipoSelect.value || 'INSTALACION') : 'INSTALACION',
            tipo: actTipoSelect ? (actTipoSelect.value || 'INSTALACION') : 'INSTALACION',

            act_forma: actFormaSelect ? (actFormaSelect.value || 'NORMAL') : 'NORMAL',
            forma: actFormaSelect ? (actFormaSelect.value || 'NORMAL') : 'NORMAL',

            // Métricas y Valores Calculados
            act_cantidad: Number(calcs.actCantidad) || 1,
            cantidad: Number(calcs.actCantidad) || 1,

            act_valor: Number(calcs.actValor) || 0,
            valor: Number(calcs.actValor) || 0,

            act_fibra: fibraFinal,
            fibra: fibraFinal,

            act_pred: Number(calcs.actPredQty) || 0,
            pt_red: Number(calcs.actPredQty) || 0,
            act_pred_valor: Number(calcs.actPredValor) || 0,

            act_ac: Number(calcs.actAcQty) || 0,
            ac: Number(calcs.actAcQty) || 0,
            act_ac_valor: Number(calcs.actAcValor) || 0,

            act_excedente: Number(calcs.actExcedenteM) || 0,
            excedente: Number(calcs.actExcedenteM) || 0,
            act_excedente_valor: Number(calcs.actExcedenteValor) || 0,

            // Total General
            act_total: totalFinal,
            total: totalFinal,
            total_actividad: totalFinal,

            act_detalle: actDetalleInput ? (actDetalleInput.value || '') : '',
            detalle: actDetalleInput ? (actDetalleInput.value || '') : '',

            act_valores_cobrados: valCobradoLimpio,
            valores_cobrados: valCobradoLimpio
        };

        // Sanitización estricta respetando los campos 'null' para no alterar las Foreign Keys
        Object.keys(payload).forEach(key => {
            if (payload[key] === undefined) {
                payload[key] = null;
            } else if (typeof payload[key] === 'number' && isNaN(payload[key])) {
                payload[key] = 0;
            }
        });

        const targetApiUrl = esEdicion 
            ? `${BASE_URL}/api/editar-actividad` 
            : `${BASE_URL}/api/guardar-actividad`;
            
        const method = esEdicion ? 'PUT' : 'POST';
        const btn = document.getElementById('btnSubmit') || document.querySelector('button[type="submit"]');

        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = esEdicion ? 'Actualizando...' : 'Guardando...';
            }

            console.log(`🚀 Enviando datos [${method}] a ${targetApiUrl}:`, payload);

            const res = await fetch(targetApiUrl, {
                method: method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && (data.status === 'success' || data.affectedRows > 0 || data.message?.includes('exito'))) {
                alert(esEdicion ? '✅ Actividad actualizada correctamente' : '✅ Actividad registrada correctamente');
                window.location.href = 'actividades.html';
            } else {
                alert(`⚠️ Error al guardar: ${data.message || 'Error en la base de datos'}`);
            }
        } catch (err) {
            console.error('Error al enviar:', err);
            alert('❌ Error de conexión al intentar guardar.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = esEdicion ? 'Actualizar Actividad' : 'Guardar Actividad';
            }
        }
    }

    window.guardarFormulario = guardarFormulario;
    window.guardarActividad = guardarFormulario;
});