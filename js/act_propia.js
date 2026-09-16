document.addEventListener('DOMContentLoaded', () => {
    // Verificar sesión del usuario
    const userSession = JSON.parse(localStorage.getItem('usuario_sesion'));
    if (!userSession) {
        window.location.href = '../index.html';
        return;
    }

    // Elementos del Formulario
    const form = document.getElementById('actividadForm');
    const userNombreInput = document.getElementById('user_nombre');
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

    // 1. Inicializar Campos Fijos (Campos 2 y 4)
    userIdInput.value = userSession.id || userSession.user_id;
    userNombreInput.value = userSession.nombre || userSession.user_nombre;
    actFechaInput.value = new Date().toISOString().split('T')[0];

    // 2. Manejo Dinámico de Campo 8 (Forma condicionado por Campo 7)
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
    }));

    // 4. Lógica de Cálculo en Tiempo Real
    function calculateAll() {
        // Campo 9: Cantidad (1 si es NORMAL/CAMBIO CONECTOR, 2 si es DOBLE)
        const forma = actFormaSelect.value;
        const actCantidad = (forma === 'DOBLE' || forma === 'RECABLEADO DOBLE') ? 2 : 1;
        lblCantidad.textContent = actCantidad;

        // Campo 10: Valor Actividad (Tarifa del usuario * Campo 9)
        const tarifaBase = (actTipoSelect.value === 'VISITA') 
            ? (parseFloat(userSession.valor_visita) || 0) 
            : (parseFloat(userSession.valor_act) || 0);
        const actValor = tarifaBase * actCantidad;
        lblValorAct.textContent = `$${actValor.toFixed(2)}`;

        // Campo 12 y 13: Puntos de Red y su Valor
        const hasPred = document.querySelector('input[name="has_pred"]:checked').value === 'SI';
        const actPredQty = hasPred ? parseInt(selectPredQty.value) : 0;
        const actPredValor = actPredQty * (parseFloat(userSession.valor_pred) || 0);
        lblValorPred.textContent = `$${actPredValor.toFixed(2)}`;

        // Campo 14 y 15: Equipos AC y su Valor
        const hasAc = document.querySelector('input[name="has_ac"]:checked').value === 'SI';
        const actAcQty = hasAc ? parseInt(selectAcQty.value) : 0;
        const actAcValor = actAcQty * (parseFloat(userSession.valor_ac) || 0);
        lblValorAc.textContent = `$${actAcValor.toFixed(2)}`;

        // Campo 16 y 17: Excedente de Fibra (> 350m) y su Valor
        const fibra = parseInt(actFibraInput.value) || 0;
        const actExcedenteM = fibra > 350 ? (fibra - 350) : 0;
        const actExcedenteValor = actExcedenteM * (parseFloat(userSession.valor_exc) || 0);
        
        lblExcedenteM.textContent = actExcedenteM;
        lblValorExc.textContent = `$${actExcedenteValor.toFixed(2)}`;

        // Campo 18: Total Actividad (Suma de 10 + 13 + 15 + 17)
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

    // Inicializar Opciones y Cálculos
    updateFormaOptions();

    // 5. Envío del Formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const calcs = calculateAll();
        
        const payload = {
            user_id: userIdInput.value,                                  // Campo 2
            act_cliente: document.getElementById('act_cliente').value,  // Campo 3
            act_fecha: actFechaInput.value,                             // Campo 4
            cuad_id: userSession.cuad_id,                                // <---
            act_sector: document.getElementById('act_sector').value,    // Campo 6
            act_tipo: actTipoSelect.value,                               // Campo 7
            act_forma: actFormaSelect.value,                             // Campo 8
            act_cantidad: calcs.actCantidad,                             // Campo 9
            act_valor: calcs.actValor,                                   // Campo 10
            act_fibra: parseInt(actFibraInput.value) || 0,               // Campo 11
            act_pred: calcs.actPredQty,                                  // Campo 12
            act_pred_valor: calcs.actPredValor,                          // Campo 13
            act_ac: calcs.actAcQty,                                      // Campo 14
            act_ac_valor: calcs.actAcValor,                              // Campo 15
            act_excedente: calcs.actExcedenteM,                          // Campo 16
            act_excedente_valor: calcs.actExcedenteValor,                // Campo 17
            act_total: calcs.actTotal,                                   // Campo 18
            act_detalle: document.getElementById('act_detalle').value,  // Campo 19
            act_valores_cobrados: parseFloat(inputValoresCobrados.value) || 0 // Campo 20
        };

        const BASE_URL = window.location.hostname.includes('vercel.app')
            ? '/api/guardar-actividad'
            : 'https://actividades-fmax-9ysb.vercel.app/api/guardar-actividad';

        try {
            const btn = document.getElementById('btnSubmit');
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
            document.getElementById('btnSubmit').disabled = false;
            document.getElementById('btnSubmit').textContent = 'Guardar Actividad';
        }
    });
});