document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editForm');
    const alertDiv = document.getElementById('alert');
    const btnSubmit = editForm ? editForm.querySelector('button[type="submit"]') : null;

    // URLs para Vercel y entorno local
    const BASE_VERCEL_URL = 'https://actividades-fmax-9ysb.vercel.app';
    const isVercel = window.location.hostname.includes('vercel.app');
    
    const API_UPDATE_URL = isVercel ? '/api/actualizar-perfil' : `${BASE_VERCEL_URL}/api/actualizar-perfil`;
    const API_CUADRILLAS_URL = isVercel ? '/api/obtener-cuadrillas' : `${BASE_VERCEL_URL}/api/obtener-cuadrillas`;

    // Obtener la sesión actual guardada
    const userSession = JSON.parse(localStorage.getItem('usuario_sesion'));

    if (!userSession) {
        window.location.href = '../index.html';
        return;
    }

    // 1. PRECARGA INMEDIATA DE TODOS LOS CAMPOS (Sin bloquear la pantalla)
    if (document.getElementById('nombre')) document.getElementById('nombre').value = userSession.nombre || userSession.user_nombre || '';
    if (document.getElementById('cedula')) document.getElementById('cedula').value = userSession.cedula || userSession.user_ci || '';
    if (document.getElementById('telefono')) document.getElementById('telefono').value = userSession.telefono || userSession.user_telefono || '';
    if (document.getElementById('direccion')) document.getElementById('direccion').value = userSession.direccion || userSession.user_direccion || '';

    // Precargar Cargo
    const cargoSelect = document.getElementById('cargo');
    if (cargoSelect && userSession.cargo) {
        cargoSelect.value = userSession.cargo.toUpperCase();
    }

    // Precargar Valores y Tarifas
    if (document.getElementById('valor_act')) document.getElementById('valor_act').value = userSession.valor_act || 0;
    if (document.getElementById('valor_visita')) document.getElementById('valor_visita').value = userSession.valor_visita || 0;
    if (document.getElementById('valor_pred')) document.getElementById('valor_pred').value = userSession.valor_pred || 0;
    if (document.getElementById('valor_ac')) document.getElementById('valor_ac').value = userSession.valor_ac || 0;
    if (document.getElementById('valor_exc')) document.getElementById('valor_exc').value = userSession.valor_exc || 0;

    // 2. Cargar lista de cuadrillas (con respaldo automático para local)
    cargarCuadrillas(userSession);

    // 3. EVENTO SUBMIT DEL FORMULARIO
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Guardando...';
            }

            const selectCuadrilla = document.getElementById('cuad_id');
            const selectedOption = selectCuadrilla ? selectCuadrilla.options[selectCuadrilla.selectedIndex] : null;
            const selectedCuadrillaName = (selectedOption && selectedOption.value) 
                ? selectedOption.text 
                : (userSession.cuadrilla || userSession.cuad_nombre);

            const updatedData = {
                id: userSession.id,
                nombre: document.getElementById('nombre').value.trim(),
                cedula: document.getElementById('cedula').value.trim(),
                cargo: document.getElementById('cargo') ? document.getElementById('cargo').value : userSession.cargo,
                cuad_id: selectCuadrilla && selectCuadrilla.value ? (parseInt(selectCuadrilla.value, 10) || null) : userSession.cuad_id,
                telefono: document.getElementById('telefono').value.trim(),
                direccion: document.getElementById('direccion').value.trim(),
                valor_act: parseFloat(document.getElementById('valor_act').value) || 0,
                valor_visita: parseFloat(document.getElementById('valor_visita').value) || 0,
                valor_pred: parseFloat(document.getElementById('valor_pred').value) || 0,
                valor_ac: parseFloat(document.getElementById('valor_ac').value) || 0,
                valor_exc: parseFloat(document.getElementById('valor_exc').value) || 0
            };

            try {
                const response = await fetch(API_UPDATE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });

                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    throw new Error('Respuesta no válida del servidor.');
                }

                if (response.ok && (data.status === 'success' || data.success)) {
                    // Actualizar localStorage con los nuevos datos
                    Object.assign(userSession, {
                        nombre: updatedData.nombre,
                        cedula: updatedData.cedula,
                        cargo: updatedData.cargo,
                        cuad_id: updatedData.cuad_id,
                        cuadrilla: selectedCuadrillaName,
                        cuad_nombre: selectedCuadrillaName,
                        telefono: updatedData.telefono,
                        direccion: updatedData.direccion,
                        valor_act: updatedData.valor_act,
                        valor_visita: updatedData.valor_visita,
                        valor_pred: updatedData.valor_pred,
                        valor_ac: updatedData.valor_ac,
                        valor_exc: updatedData.valor_exc
                    });

                    localStorage.setItem('usuario_sesion', JSON.stringify(userSession));

                    showAlert('Información actualizada correctamente.', 'alert-success');
                    setTimeout(() => {
                        window.location.href = 'perfil.html';
                    }, 1200);
                } else {
                    showAlert(data.message || data.error || 'Error al actualizar la información.', 'alert-error');
                }

            } catch (err) {
                console.error('Error al actualizar:', err);
                showAlert(err.message || 'Error de conexión con el servidor.', 'alert-error');
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Guardar Cambios';
                }
            }
        });
    }

    // Función auxiliar para cargar cuadrillas con respaldo si falla el fetch
    async function cargarCuadrillas(session) {
        const selectCuadrilla = document.getElementById('cuad_id');
        if (!selectCuadrilla) return;

        const currentCuadId = session.cuad_id || 1;
        const currentCuadNombre = session.cuadrilla || session.cuad_nombre || 'WILMER CHICANGO';

        try {
            const response = await fetch(API_CUADRILLAS_URL);
            if (!response.ok) throw new Error('API no disponible');

            const data = await response.json();

            if (data.status === 'success' && Array.isArray(data.cuadrillas) && data.cuadrillas.length > 0) {
                selectCuadrilla.innerHTML = '<option value="">Seleccione una cuadrilla...</option>';
                data.cuadrillas.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.cuad_id;
                    option.textContent = item.cuad_nombre;
                    if (String(item.cuad_id) === String(currentCuadId)) {
                        option.selected = true;
                    }
                    selectCuadrilla.appendChild(option);
                });
                return;
            }
            throw new Error('Respuesta vacía');
        } catch (error) {
            // Plan B: Si la API no está desplegada en Vercel aún, mostramos la cuadrilla actual de la sesión
            selectCuadrilla.innerHTML = '';
            const option = document.createElement('option');
            option.value = currentCuadId;
            option.textContent = currentCuadNombre;
            option.selected = true;
            selectCuadrilla.appendChild(option);
        }
    }

    function showAlert(message, typeClass) {
        if (alertDiv) {
            alertDiv.textContent = message;
            alertDiv.className = `alert ${typeClass}`;
        }
    }
});