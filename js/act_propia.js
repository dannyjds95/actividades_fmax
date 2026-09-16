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
                window.location.href = 'perfil.html';
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