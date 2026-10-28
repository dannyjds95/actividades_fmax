document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editForm') || document.getElementById('formEditarPerfil');
    const alertDiv = document.getElementById('alert') || document.querySelector('.alert');
    const btnSubmit = editForm ? editForm.querySelector('button[type="submit"]') : null;

    // 1. Configuración adaptativa de URLs base
    const isVercel = window.location.hostname.includes('vercel.app');
    const BASE_URL = isVercel ? '' : 'https://actividades-fmax-9ysb.vercel.app';
    
    const API_UPDATE_URL = `${BASE_URL}/api/admin-usuarios`;
    const API_CUADRILLAS_URL = `${BASE_URL}/api/cuadrillas`;

    // 2. Obtener y desempaquetar la sesión de forma segura
    const rawSession = localStorage.getItem('usuario_sesion');
    let userSession = null;

    if (rawSession) {
        try {
            userSession = JSON.parse(rawSession);
        } catch (e) {
            console.error('Error al leer sesión:', e);
        }
    }

    if (!userSession) {
        window.location.href = '../index.html';
        return;
    }

    // Extraer sub-objeto si la sesión está anidada ({ usuario: { ... } })
    const uData = userSession.usuario || userSession.user || userSession;
    
    // Obtener ID del usuario priorizando localStorage o las llaves conocidas
    let userId = localStorage.getItem('user_id') || uData.user_id || uData.id;

    if (!userId || userId === 'null' || userId === 'undefined') {
        showAlert('ID de usuario no proporcionado. Inicie sesión de nuevo.', 'alert-error');
        return;
    }

    // Asegurar persistencia del user_id en localStorage
    localStorage.setItem('user_id', String(userId));

    // 3. PRECARGA INMEDIATA DE CAMPOS EN EL FORMULARIO
    const setVal = (id, val) => {
        const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        if (el) el.value = (val !== undefined && val !== null) ? val : '';
    };

    setVal('nombre', uData.user_nombre || uData.nombre);
    setVal('user_nombre', uData.user_nombre || uData.nombre);

    setVal('cedula', uData.user_ci || uData.cedula);
    setVal('user_ci', uData.user_ci || uData.cedula);

    setVal('telefono', uData.user_telefono || uData.telefono);
    setVal('user_telefono', uData.user_telefono || uData.telefono);

    setVal('direccion', uData.user_direccion || uData.direccion);
    setVal('user_direccion', uData.user_direccion || uData.direccion);

    // Precargar Cargo
    const cargoSelect = document.getElementById('cargo') || document.getElementById('user_cargo');
    const cargoVal = uData.user_cargo || uData.cargo;
    if (cargoSelect && cargoVal) {
        cargoSelect.value = cargoVal.toUpperCase();
    }

    // Precargar Valores y Tarifas
    setVal('valor_act', uData.valor_act ?? uData.cuad_valor_act ?? 0);
    setVal('valor_visita', uData.valor_visita ?? uData.cuad_valor_visita ?? 0);
    setVal('valor_pred', uData.valor_pred ?? uData.cuad_valor_pred ?? 0);
    setVal('valor_ac', uData.valor_ac ?? uData.cuad_valor_ac ?? 0);
    setVal('valor_exc', uData.valor_exc ?? uData.cuad_valor_exc ?? 0);

    // 4. Cargar opciones del selector de cuadrillas
    cargarCuadrillas(uData);

    // 5. EVENTO SUBMIT DEL FORMULARIO
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Guardando...';
            }

            const getVal = (id) => {
                const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
                return el ? el.value.trim() : '';
            };

            const selectCuadrilla = document.getElementById('cuad_id') || document.querySelector('select[name="cuad_id"]');
            const selectedOption = selectCuadrilla ? selectCuadrilla.options[selectCuadrilla.selectedIndex] : null;
            const selectedCuadrillaName = (selectedOption && selectedOption.value) 
                ? selectedOption.text 
                : (uData.cuadrilla || uData.cuad_nombre);

            // 🎯 Payload alineado exactamente con api/admin-usuarios.js
            const payload = {
                user_id: Number(userId),
                user_nombre: getVal('nombre') || getVal('user_nombre'),
                user_ci: getVal('cedula') || getVal('user_ci'),
                user_usuario: uData.user_usuario || uData.usuario || getVal('nombre') || getVal('user_nombre'),
                user_cargo: getVal('cargo') || getVal('user_cargo') || uData.user_cargo || 'TECNICO',
                cuad_id: selectCuadrilla && selectCuadrilla.value ? (parseInt(selectCuadrilla.value, 10) || null) : uData.cuad_id,
                user_telefono: getVal('telefono') || getVal('user_telefono'),
                user_direccion: getVal('direccion') || getVal('user_direccion')
            };

            if (!payload.user_nombre) {
                showAlert('El nombre completo es obligatorio.', 'alert-error');
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Guardar Cambios';
                }
                return;
            }

            try {
                // Petición a /api/admin-usuarios mediante PUT
                const response = await fetch(API_UPDATE_URL, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    throw new Error('Respuesta no válida del servidor.');
                }

                if (response.ok && (data.status === 'success' || data.success)) {
                    // Actualización local de la sesión
                    const updatedSession = {
                        ...uData,
                        user_id: payload.user_id,
                        user_nombre: payload.user_nombre,
                        nombre: payload.user_nombre,
                        user_ci: payload.user_ci,
                        cedula: payload.user_ci,
                        user_cargo: payload.user_cargo,
                        cargo: payload.user_cargo,
                        cuad_id: payload.cuad_id,
                        cuadrilla: selectedCuadrillaName,
                        cuad_nombre: selectedCuadrillaName,
                        user_telefono: payload.user_telefono,
                        telefono: payload.user_telefono,
                        user_direccion: payload.user_direccion,
                        direccion: payload.user_direccion
                    };

                    localStorage.setItem('usuario_sesion', JSON.stringify(updatedSession));
                    localStorage.setItem('user_id', String(payload.user_id));
                    if (payload.user_cargo) localStorage.setItem('user_cargo', payload.user_cargo);

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

    // Función auxiliar para cargar cuadrillas
    async function cargarCuadrillas(session) {
        const selectCuadrilla = document.getElementById('cuad_id') || document.querySelector('select[name="cuad_id"]');
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
            alertDiv.style.display = 'block';
        } else {
            alert(message);
        }
    }
});