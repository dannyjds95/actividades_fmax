const BASE_VERCEL_URL = 'https://actividades-fmax-9ysb.vercel.app';
const BASE_URL = window.location.hostname.includes('vercel.app')
    ? ''
    : BASE_VERCEL_URL;

document.addEventListener('DOMContentLoaded', () => {
    // Verificar sesión del usuario
    const userSession = JSON.parse(localStorage.getItem('usuario_sesion'));
    if (!userSession) {
        window.location.href = '../index.html';
        return;
    }

    // Elementos del Formulario
    const form = document.getElementById('actividadForm');
    const userIdInput = document.getElementById('user_id');
    const actFechaInput = document.getElementById('act_fecha');
    const actTipoSelect = document.getElementById('act_tipo');
    const actFormaSelect = document.getElementById('act_forma');
    const actFibraInput = document.getElementById('act_fibra');
    
    // Radios y selects condicionales
    const radiosPred = document.querySelectorAll('input[name="has_pred"]');
    const selectPredQty = document.getElementById('act_pred_qty');
    
    const radiosAc = document.querySelectorAll('input[name="has_ac"]');
    const selectAcQty = document.getElementById('act_ac_qty');
    
    const radiosCobro = document.querySelectorAll('input[name="has_cobro"]');
    const inputValoresCobrados = document.getElementById('act_valores_cobrados');

    // Etiquetas de Resumen
    const lblCantidad = document.getElementById('lbl_cantidad');
    const lblValorAct = document.getElementById('lbl_valor_act');
    const lblValorPred = document.getElementById('lbl_valor_pred');
    const lblValorAc = document.getElementById('lbl_valor_ac');
    const lblExcedenteM = document.getElementById('lbl_excedente_m');
    const lblValorExc = document.getElementById('lbl_valor_exc');
    const lblTotal = document.getElementById('lbl_total');

    // 1. Inicializar Campos Ocultos y Fecha Actual (zona horaria local)
    if (userIdInput) {
        userIdInput.value = userSession.id || userSession.user_id || '';
    }

    if (actFechaInput && !actFechaInput.value) {
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        actFechaInput.value = `${year}-${month}-${day}`;
    }

    // 2. Manejo Dinámico de Forma condicionado por Tipo de Actividad
    function updateFormaOptions() {
        const tipo = actTipoSelect.value;
        actFormaSelect.innerHTML = '';

        if (tipo === 'INSTALACION' || tipo === 'TRASLADO') {
            actFormaSelect.add(new Option('NORMAL', 'NORMAL'));
            actFormaSelect.add(new Option('DOBLE', 'DOBLE'));
        } else if (tipo === 'VISITA') {
            actFormaSelect.add(new Option('CAMBIO CONECTOR', 'CAMBIO CONECTOR'));
            actFormaSelect.add(new Option('RECABLEADO NORMAL', 'RECABLEADO NORMAL'));
            actFormaSelect.add(new Option('RECABLEADO DOBLE', 'RECABLEADO DOBLE'));
        } else {
            // Opción predeterminada si no hay tipo seleccionado
            actFormaSelect.add(new Option('Seleccione Forma', ''));
        }
        calculateAll();
    }

    // 3. Mostrar/Ocultar Selects de Puntos de Red, Equipos AC y Cobro
    radiosPred.forEach(radio => radio.addEventListener('change', (e) => {
        selectPredQty.classList.toggle('hidden', e.target.value === 'NO');
        calculateAll();
    }));

    radiosAc.forEach(radio => radio.addEventListener('change', (e) => {
        selectAcQty.classList.toggle('hidden', e.target.value === 'NO');
        calculateAll();
    }));

    radiosCobro.forEach(radio => radio.addEventListener('change', (e) => {
        const isSi = e.target.value === 'SI';
        inputValoresCobrados.classList.toggle('hidden', !isSi);
        if (!isSi) inputValoresCobrados.value = 0;
        calculateAll();
    }));

    // 4. Lógica de Cálculo
    function calculateAll() {
        const tipo = actTipoSelect.value;
        const forma = actFormaSelect.value;

        let actCantidad = 0;
        let tarifaBase = 0;

        // Si se selecciona un tipo y forma válidos
        if (tipo !== '' && forma !== '') {
            actCantidad = (forma === 'DOBLE' || forma === 'RECABLEADO DOBLE') ? 2 : 1;
            tarifaBase = (tipo === 'VISITA') 
                ? (parseFloat(userSession.valor_visita) || 0) 
                : (parseFloat(userSession.valor_act) || 0);
        }

        lblCantidad.textContent = actCantidad;

        // Valor Actividad
        const actValor = tarifaBase * actCantidad;
        lblValorAct.textContent = `$${actValor.toFixed(2)}`;

        // Puntos de Red
        const hasPred = document.querySelector('input[name="has_pred"]:checked')?.value === 'SI';
        const actPredQty = hasPred ? parseInt(selectPredQty.value) : 0;
        const actPredValor = actPredQty * (parseFloat(userSession.valor_pred) || 0);
        lblValorPred.textContent = `$${actPredValor.toFixed(2)}`;

        // Equipos AC
        const hasAc = document.querySelector('input[name="has_ac"]:checked')?.value === 'SI';
        const actAcQty = hasAc ? parseInt(selectAcQty.value) : 0;
        const actAcValor = actAcQty * (parseFloat(userSession.valor_ac) || 0);
        lblValorAc.textContent = `$${actAcValor.toFixed(2)}`;

        // Excedente de Fibra
        const fibra = parseInt(actFibraInput.value) || 0;
        const actExcedenteM = fibra > 350 ? (fibra - 350) : 0;
        const actExcedenteValor = actExcedenteM * (parseFloat(userSession.valor_exc) || 0);
        
        lblExcedenteM.textContent = actExcedenteM;
        lblValorExc.textContent = `$${actExcedenteValor.toFixed(2)}`;

        // Total General
        const actTotal = actValor + actPredValor + actAcValor + actExcedenteValor;
        lblTotal.textContent = `$${actTotal.toFixed(2)}`;

        return {
            actCantidad, actValor, actPredQty, actPredValor, 
            actAcQty, actAcValor, actExcedenteM, actExcedenteValor, actTotal
        };
    }

    // Escuchadores de Eventos
    actTipoSelect.addEventListener('change', updateFormaOptions);
    actFormaSelect.addEventListener('change', calculateAll);
    actFibraInput.addEventListener('input', calculateAll);
    selectPredQty.addEventListener('change', calculateAll);
    selectAcQty.addEventListener('change', calculateAll);

    // Inicializar Opciones y Cálculos al Cargar
    updateFormaOptions();

    // 5. Envío del Formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const calcs = calculateAll();
        
        // Asignación predeterminada si el nombre viene vacío
        const clienteInput = document.getElementById('act_cliente')?.value.trim() || '';
        const actCliente = clienteInput !== '' ? clienteInput : 'NO DEFINIDO';

        const payload = {
            user_id: userSession.id || userSession.user_id,
            act_origen: 'ACTIVIDAD PROPIA',
            act_cliente: actCliente,
            act_fecha: actFechaInput.value,
            cuad_id: userSession.cuad_id,
            act_sector: document.getElementById('act_sector').value,
            act_tipo: actTipoSelect.value,
            act_forma: actFormaSelect.value,
            act_cantidad: calcs.actCantidad,
            act_valor: calcs.actValor,
            act_fibra: parseInt(actFibraInput.value) || 0,
            act_pred: calcs.actPredQty,
            act_pred_valor: calcs.actPredValor,
            act_ac: calcs.actAcQty,
            act_ac_valor: calcs.actAcValor,
            act_excedente: calcs.actExcedenteM,
            act_excedente_valor: calcs.actExcedenteValor,
            act_total: calcs.actTotal,
            act_detalle: document.getElementById('act_detalle').value,
            act_valores_cobrados: parseFloat(inputValoresCobrados.value) || 0
        };

        const BASE_URL = window.location.hostname.includes('vercel.app')
            ? '/api/guardar-actividad'
            : 'https://actividades-fmax-9ysb.vercel.app/api/guardar-actividad';

        const btn = document.getElementById('btnSubmit');
        try {
            btn.disabled = true;
            btn.textContent = 'Guardando...';

            const res = await fetch(BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.status === 'success') {
                alert('¡Actividad registrada correctamente!');
                window.location.href = 'dashboard.html';
            } else {
                alert(data.message || 'Error al guardar la actividad');
            }
        } catch (err) {
            alert('Error de conexión con el servidor');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Guardar Actividad';
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Detectar si se ingresó a la página en modo edición desde actividades.html
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('editId');

    if (editId) {
        cargarDatosParaEditar(editId);
    }
});

// Cargar y popular el formulario de edición de forma precisa
async function cargarDatosParaEditar(id) {
    try {
        const tituloHeader = document.querySelector('h1, h2, h3, .title');
        if (tituloHeader) tituloHeader.textContent = `Editar Actividad #${id}`;

        // Petición a la API usando la URL correspondiente
        const response = await fetch(`${BASE_URL}/api/obtener-actividades`);
        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

        const data = await response.json();
        const actividades = data.actividades || [];
        const item = actividades.find(a => (a.act_id || a.id) == id);

        if (!item) {
            alert(`No se encontró la actividad #${id}.`);
            return;
        }

        console.log('🔍 DATOS RECUPERADOS DE LA BD:', item);

        // Helper seguro para asignar valor sin alterar otros campos
        const setVal = (selectors, val) => {
            if (val === null || val === undefined) return;
            const list = Array.isArray(selectors) ? selectors : [selectors];
            for (let s of list) {
                const el = document.getElementById(s) || document.querySelector(`[name="${s}"]`);
                if (el) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        };

        // 1. Llenar Campos Básicos
        setVal(['act_id', 'id'], item.act_id || item.id);
        setVal(['act_fecha', 'fecha'], item.act_fecha ? String(item.act_fecha).split('T')[0] : '');
        setVal(['act_cliente', 'cliente', 'nombre_cliente'], item.act_cliente);
        setVal(['act_sector', 'sector'], item.act_sector);
        setVal(['act_tipo', 'tipo'], item.act_tipo);
        setVal(['act_fibra', 'fibra'], item.act_fibra || 0);
        setVal(['act_detalle', 'detalle', 'comentario'], item.act_detalle || '');

        // Cargar Forma de Actividad tras asegurar el tipo
        setTimeout(() => {
            setVal(['act_forma', 'forma'], item.act_forma);
        }, 50);

        // 2. Extraer cantidades de Puntos de Red, AC y Cobros
        const valPtRed = parseFloat(item.act_pred ?? item.act_pt_red ?? item.act_puntos_red ?? item.cant_pred ?? item.puntos_red ?? 0);
        const valAC = parseFloat(item.act_ac ?? item.cant_ac ?? item.equipos_ac ?? item.ac ?? 0);
        const valCobro = parseFloat(item.act_valores_cobrados ?? item.act_cobro ?? item.valores_cobrados ?? item.cobro ?? 0);

        // 3. Función para simular el click en 'SI' y asignar la cantidad en el selector visible
        const activarModulo = (radioName, keywordText, valor, inputSelectors) => {
            const esPositivo = valor > 0;
            const targetVal = esPositivo ? 'SI' : 'NO';

            // Buscar el radio por su atributo name o por el texto en su contenedor
            let radio = document.querySelector(`input[name="${radioName}"][value="${targetVal}"], input[name="${radioName}"][value="${targetVal.toLowerCase()}"]`);

            if (!radio) {
                const contenedores = Array.from(document.querySelectorAll('div, .form-group, .card, .field-group'));
                const card = contenedores.find(c => c.textContent && c.textContent.toLowerCase().includes(keywordText.toLowerCase()));
                if (card) {
                    radio = card.querySelector(`input[type="radio"][value="${targetVal}"], input[type="radio"][value="${targetVal.toLowerCase()}"]`);
                }
            }

            if (radio) {
                radio.checked = true;
                radio.click(); // Ejecuta el script nativo que hace visible el <select>
                radio.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Una vez desplegado el control, colocar el número correspondiente (ej: 1)
            if (esPositivo) {
                setTimeout(() => {
                    setVal(inputSelectors, valor);
                }, 100);
            }
        };

        // Ejecutar activación para Puntos de Red, Equipos AC y Cobros
        activarModulo('radio_pred', 'puntos', valPtRed, ['act_pred', 'cant_pred', 'puntos_red', 'pt_red', 'select_pred']);
        activarModulo('radio_ac', 'ac', valAC, ['act_ac', 'cant_ac', 'equipos_ac', 'select_ac']);
        activarModulo('radio_cobro', 'cobr', valCobro, ['act_valores_cobrados', 'valores_cobrados', 'val_cobrado', 'cobro']);

        // 4. Recalcular los totales en la tarjeta verde/azul del resumen inferior
        setTimeout(() => {
            if (typeof calcularTotales === 'function') calcularTotales();
            if (typeof actualizarResumen === 'function') actualizarResumen();
            if (typeof recalcular === 'function') recalcular();
        }, 200);

    } catch (err) {
        console.error('Error al cargar datos de edición:', err);
        alert(`No se pudo cargar la actividad: ${err.message}`);
    }
}

async function guardarFormulario(event) {
    if (event) event.preventDefault();

    const actId = document.getElementById('act_id')?.value;
    const esEdicion = Boolean(actId);

    const payload = {
        act_id: esEdicion ? Number(actId) : null,
        act_fecha: document.getElementById('act_fecha')?.value,
        act_cliente: document.getElementById('act_cliente')?.value,
        act_tipo: document.getElementById('act_tipo')?.value,
        act_forma: document.getElementById('act_forma')?.value,
        act_sector: document.getElementById('act_sector')?.value,
        act_fibra: parseFloat(document.getElementById('act_fibra')?.value || 0),
        act_pred: parseInt(document.getElementById('act_pred')?.value || 0, 10),
        act_ac: parseInt(document.getElementById('act_ac')?.value || 0, 10),
        act_valores_cobrados: parseFloat(document.getElementById('act_valores_cobrados')?.value || 0),
        act_detalle: document.getElementById('act_detalle')?.value
    };

    const url = esEdicion ? `${BASE_URL}/api/editar-actividad` : `${BASE_URL}/api/guardar-actividad`;
    const method = esEdicion ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resData = await response.json();

        if (resData.status === 'success') {
            alert(esEdicion ? '✅ Registro actualizado con éxito' : '✅ Registro guardado con éxito');
            // Redirigir de regreso al panel del dashboard
            window.location.href = 'actividades.html';
        } else {
            alert(`⚠️ Error: ${resData.message}`);
        }
    } catch (err) {
        console.error('Error al enviar formulario:', err);
        alert('❌ Error al procesar la solicitud.');
    }
}