// URL dinámica de la API (Vercel vs Local)
const BASE_VERCEL_URL = 'https://actividades-fmax-9ysb.vercel.app';
const BASE_URL = (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'))
    ? ''
    : BASE_VERCEL_URL;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar sesión del usuario
    const userSession = JSON.parse(localStorage.getItem('usuario_sesion'));
    if (!userSession) {
        window.location.href = '../index.html';
        return;
    }

    // 2. Obtener referencias a los elementos del DOM
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

    // Etiquetas de Resumen Económico
    const lblCantidad = document.getElementById('lbl_cantidad');
    const lblValorAct = document.getElementById('lbl_valor_act');
    const lblValorPred = document.getElementById('lbl_valor_pred');
    const lblValorAc = document.getElementById('lbl_valor_ac');
    const lblExcedenteM = document.getElementById('lbl_excedente_m');
    const lblValorExc = document.getElementById('lbl_valor_exc');
    const lblTotal = document.getElementById('lbl_total');

    // Inicializar IDs de usuario y Fecha actual si es nuevo registro
    if (userIdInput) userIdInput.value = userSession.id || userSession.user_id || '';
    if (actFechaInput && !actFechaInput.value) {
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        actFechaInput.value = `${year}-${month}-${day}`;
    }

    // 3. Manejo Dinámico de Opciones de Forma según Tipo
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

    // 4. Lógica de Cálculo de Totales
    function calculateAll() {
        const tipo = actTipoSelect ? actTipoSelect.value : '';
        const forma = actFormaSelect ? actFormaSelect.value : '';

        let actCantidad = 0;
        let tarifaBase = 0;

        if (tipo !== '' && forma !== '') {
            actCantidad = (forma === 'DOBLE' || forma === 'RECABLEADO DOBLE') ? 2 : 1;
            tarifaBase = (tipo === 'VISITA') 
                ? (parseFloat(userSession.valor_visita) || 0) 
                : (parseFloat(userSession.valor_act) || 0);
        }

        if (lblCantidad) lblCantidad.textContent = actCantidad;

        const actValor = tarifaBase * actCantidad;
        if (lblValorAct) lblValorAct.textContent = `$${actValor.toFixed(2)}`;

        // Puntos de Red
        const radioPredChecked = document.querySelector('input[name="has_pred"]:checked, input[name="radio_pred"]:checked')?.value;
        const hasPred = radioPredChecked === 'SI' || radioPredChecked === 'si';
        const actPredQty = (hasPred && selectPredQty) ? (parseInt(selectPredQty.value, 10) || 0) : 0;
        const actPredValor = actPredQty * (parseFloat(userSession.valor_pred) || 0);
        if (lblValorPred) lblValorPred.textContent = `$${actPredValor.toFixed(2)}`;

        // Equipos AC
        const radioAcChecked = document.querySelector('input[name="has_ac"]:checked, input[name="radio_ac"]:checked')?.value;
        const hasAc = radioAcChecked === 'SI' || radioAcChecked === 'si';
        const actAcQty = (hasAc && selectAcQty) ? (parseInt(selectAcQty.value, 10) || 0) : 0;
        const actAcValor = actAcQty * (parseFloat(userSession.valor_ac) || 0);
        if (lblValorAc) lblValorAc.textContent = `$${actAcValor.toFixed(2)}`;

        // Excedente de Fibra
        const fibra = actFibraInput ? (parseInt(actFibraInput.value, 10) || 0) : 0;
        const actExcedenteM = fibra > 350 ? (fibra - 350) : 0;
        const actExcedenteValor = actExcedenteM * (parseFloat(userSession.valor_exc) || 0);
        
        if (lblExcedenteM) lblExcedenteM.textContent = actExcedenteM;
        if (lblValorExc) lblValorExc.textContent = `$${actExcedenteValor.toFixed(2)}`;

        // Total General
        const actTotal = actValor + actPredValor + actAcValor + actExcedenteValor;
        if (lblTotal) lblTotal.textContent = `$${actTotal.toFixed(2)}`;

        return {
            actCantidad, actValor, actPredQty, actPredValor, 
            actAcQty, actAcValor, actExcedenteM, actExcedenteValor, actTotal
        };
    }

    // Exportar funciones de cálculo al ámbito global
    window.calculateAll = calculateAll;
    window.calcularTotales = calculateAll;

    // 5. Configurar escuchadores de eventos para los inputs
    if (actTipoSelect) actTipoSelect.addEventListener('change', updateFormaOptions);
    if (actFormaSelect) actFormaSelect.addEventListener('change', calculateAll);
    if (actFibraInput) actFibraInput.addEventListener('input', calculateAll);
    if (selectPredQty) selectPredQty.addEventListener('change', calculateAll);
    if (selectAcQty) selectAcQty.addEventListener('change', calculateAll);

    // Escuchadores de Radio Buttons
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

    // 6. Cargar Datos si venimos de Actividades en Modo Edición
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('editId');

    if (editId) {
        cargarDatosParaEditar(editId);
    }

    // 7. Interceptar y procesar la acción de Guardar / Editar
    if (form) {
        form.onsubmit = guardarFormulario;
    }

    // Función para Cargar los Datos del Registro a Editar
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

            if (actIdInput) actIdInput.value = item.act_id || item.id || id;
            if (actClienteInput) actClienteInput.value = item.act_cliente || '';
            if (actFechaInput) actFechaInput.value = item.act_fecha ? String(item.act_fecha).split('T')[0] : '';
            if (actSectorSelect) actSectorSelect.value = item.act_sector || '';
            if (actTipoSelect) actTipoSelect.value = item.act_tipo || '';
            
            updateFormaOptions();
            if (actFormaSelect) actFormaSelect.value = item.act_forma || '';
            if (actFibraInput) actFibraInput.value = item.act_fibra || 0;
            if (actDetalleInput) actDetalleInput.value = item.act_detalle || '';

            // Carga de Puntos de Red, AC y Cobros
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

    // Función Unificada de Guardado
    async function guardarFormulario(event) {
        if (event) event.preventDefault();

        const urlParamsNow = new URLSearchParams(window.location.search);
        const idFromUrl = urlParamsNow.get('editId');
        const idFromInput = actIdInput ? actIdInput.value.trim() : '';

        const actId = idFromUrl || idFromInput;
        const esEdicion = Boolean(actId && actId !== 'null' && actId !== 'undefined' && actId !== '');

        const calcs = calculateAll();
        const clienteVal = actClienteInput ? actClienteInput.value.trim() : '';

        const payload = {
            act_id: esEdicion ? Number(actId) : null,
            id: esEdicion ? Number(actId) : null,
            user_id: userSession.id || userSession.user_id,
            act_origen: 'ACTIVIDAD PROPIA',
            act_cliente: clienteVal !== '' ? clienteVal : 'NO DEFINIDO',
            act_fecha: actFechaInput ? actFechaInput.value : '',
            cuad_id: userSession.cuad_id,
            act_sector: actSectorSelect ? actSectorSelect.value : '',
            act_tipo: actTipoSelect ? actTipoSelect.value : '',
            act_forma: actFormaSelect ? actFormaSelect.value : '',
            act_cantidad: calcs.actCantidad,
            act_valor: calcs.actValor,
            act_fibra: actFibraInput ? (parseInt(actFibraInput.value, 10) || 0) : 0,
            act_pred: calcs.actPredQty,
            act_pred_valor: calcs.actPredValor,
            act_ac: calcs.actAcQty,
            act_ac_valor: calcs.actAcValor,
            act_excedente: calcs.actExcedenteM,
            act_excedente_valor: calcs.actExcedenteValor,
            act_total: calcs.actTotal,
            act_detalle: actDetalleInput ? actDetalleInput.value : '',
            act_valores_cobrados: inputValoresCobrados ? (parseFloat(inputValoresCobrados.value) || 0) : 0
        };

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
                alert(`⚠️ Error al procesar: ${data.message || 'Error en el servidor'}`);
            }
        } catch (err) {
            console.error('Error de red:', err);
            alert('❌ Error de conexión con el servidor.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = esEdicion ? 'Actualizar Actividad' : 'Guardar Actividad';
            }
        }
    }

    // Exponer función de guardado a nivel global
    window.guardarFormulario = guardarFormulario;
    window.guardarActividad = guardarFormulario;
});