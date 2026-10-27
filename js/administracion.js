document.addEventListener('DOMContentLoaded', () => {
    const isVercel = window.location.hostname.includes('vercel.app');
    const BASE_URL = isVercel ? '' : 'https://actividades-fmax-9ysb.vercel.app';

    // Endpoints Unificados de la API
    const API_CUADRILLAS = `${BASE_URL}/api/cuadrillas`;
    const API_USUARIOS = `${BASE_URL}/api/admin-usuarios`;

    const tabCuadrillas = document.getElementById('tabCuadrillas');
    const tabUsuarios = document.getElementById('tabUsuarios');
    const secCuadrillas = document.getElementById('secCuadrillas');
    const secUsuarios = document.getElementById('secUsuarios');
    const alertDiv = document.getElementById('alert');

    let listaCuadrillas = [];
    let listaUsuarios = [];
    let usuariosCargados = false;

    // Cargar cuadrillas al iniciar la página
    cargarCuadrillas();

    // ==========================================
    // NAVEGACIÓN POR PESTAÑAS
    // ==========================================
    if (tabCuadrillas && tabUsuarios) {
        tabCuadrillas.addEventListener('click', () => {
            tabCuadrillas.classList.add('active-tab');
            tabUsuarios.classList.remove('active-tab');
            secCuadrillas.classList.remove('hidden');
            secUsuarios.classList.add('hidden');
        });

        tabUsuarios.addEventListener('click', () => {
            tabUsuarios.classList.add('active-tab');
            tabCuadrillas.classList.remove('active-tab');
            secUsuarios.classList.remove('hidden');
            secCuadrillas.classList.add('hidden');

            if (!usuariosCargados) {
                cargarUsuarios();
            }
        });
    }

    // ==========================================
    // 1. MÓDULO CUADRILLAS
    // ==========================================
    async function cargarCuadrillas() {
        const tbody = document.getElementById('tbodyCuadrillas');
        const selectModalUser = document.getElementById('usr_cuad_id');

        try {
            const res = await fetch(API_CUADRILLAS);
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

            const data = await res.json();

            if (data.status === 'success' && Array.isArray(data.cuadrillas)) {
                listaCuadrillas = data.cuadrillas;

                if (tbody) {
                    tbody.innerHTML = listaCuadrillas.map(c => `
                        <tr>
                            <td><strong>#${c.cuad_id}</strong></td>
                            <td>${c.cuad_nombre}</td>
                            <td>${c.cuad_sector || 'Sin Sector'}</td>
                            <td style="text-align: center;">
                                <button class="btn-action edit" onclick="editarCuadrilla(${c.cuad_id})" title="Editar">✏️</button>
                                <button class="btn-action delete" onclick="eliminarCuadrilla(${c.cuad_id})" title="Eliminar">🗑️</button>
                            </td>
                        </tr>
                    `).join('');
                }

                // Poblar selector de cuadrillas en el modal de usuarios
                if (selectModalUser) {
                    selectModalUser.innerHTML = '<option value="">Seleccione...</option>' +
                        listaCuadrillas.map(c => `<option value="${c.cuad_id}">${c.cuad_nombre}</option>`).join('');
                }
            } else if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay cuadrillas registradas.</td></tr>';
            }
        } catch (err) {
            console.error('Error al cargar cuadrillas:', err);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error al cargar cuadrillas.</td></tr>';
            }
        }
    }

    // Abrir Modal para Nueva Cuadrilla
    const modalCuadrilla = document.getElementById('modalCuadrilla');
    const btnNuevaCuadrilla = document.getElementById('btnNuevaCuadrilla');

    if (btnNuevaCuadrilla) {
        btnNuevaCuadrilla.addEventListener('click', () => {
            const titleEl = document.getElementById('modalCuadrillaTitle');
            if (titleEl) titleEl.textContent = 'Nueva Cuadrilla';
            document.getElementById('cuad_id_edit').value = '';
            document.getElementById('formCuadrilla').reset();
            modalCuadrilla.classList.remove('hidden');
        });
    }

    // Abrir Modal para Editar Cuadrilla
    window.editarCuadrilla = (id) => {
        const item = listaCuadrillas.find(c => c.cuad_id === id);
        if (!item) return;

        const titleEl = document.getElementById('modalCuadrillaTitle');
        if (titleEl) titleEl.textContent = 'Editar Cuadrilla';
        document.getElementById('cuad_id_edit').value = item.cuad_id;
        document.getElementById('cuad_nombre_input').value = item.cuad_nombre || '';
        document.getElementById('cuad_sector_input').value = item.cuad_sector === 'Sin Sector' ? '' : (item.cuad_sector || '');
        modalCuadrilla.classList.remove('hidden');
    };

    // Guardar / Editar Cuadrilla
    const formCuadrilla = document.getElementById('formCuadrilla');
    if (formCuadrilla) {
        formCuadrilla.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('cuad_id_edit').value;
            const method = id ? 'PUT' : 'POST';

            const body = {
                cuad_id: id ? parseInt(id, 10) : null,
                cuad_nombre: document.getElementById('cuad_nombre_input').value.trim(),
                cuad_sector: document.getElementById('cuad_sector_input').value.trim()
            };

            try {
                const res = await fetch(API_CUADRILLAS, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
                const data = await res.json();

                if (data.status === 'success') {
                    modalCuadrilla.classList.add('hidden');
                    showAlert('Cuadrilla guardada con éxito', 'alert-success');
                    cargarCuadrillas();
                } else {
                    showAlert(data.message || 'Error al guardar cuadrilla', 'alert-error');
                }
            } catch (err) {
                console.error('Error al guardar cuadrilla:', err);
                showAlert('Error al conectar con el servidor', 'alert-error');
            }
        });
    }

    // Eliminar Cuadrilla
    window.eliminarCuadrilla = async (id) => {
        if (!confirm('¿Deseas eliminar esta cuadrilla?')) return;
        try {
            const res = await fetch(`${API_CUADRILLAS}?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Endpoint no encontrado');
            const data = await res.json();

            if (data.status === 'success') {
                showAlert('Cuadrilla eliminada correctamente', 'alert-success');
                cargarCuadrillas();
            } else {
                showAlert(data.message || 'No se pudo eliminar la cuadrilla', 'alert-error');
            }
        } catch (err) {
            console.error('Error al eliminar cuadrilla:', err);
            showAlert('Error al conectar con la API de eliminación', 'alert-error');
        }
    };

    // ==========================================
    // 2. MÓDULO USUARIOS
    // ==========================================
    async function cargarUsuarios() {
        const tbody = document.getElementById('tbodyUsuarios');
        try {
            const res = await fetch(API_USUARIOS);
            if (!res.ok) throw new Error('API no disponible');

            const data = await res.json();

            if (data.status === 'success' && Array.isArray(data.usuarios)) {
                usuariosCargados = true;
                listaUsuarios = data.usuarios;

                if (tbody) {
                    tbody.innerHTML = listaUsuarios.map(u => `
                        <tr>
                            <td><strong>#${u.user_id}</strong></td>
                            <td>${u.user_nombre}</td>
                            <td>${u.user_usuario}</td>
                            <td><span class="badge">${u.user_cargo || 'N/A'}</span></td>
                            <td>${u.cuad_nombre || 'Sin asignación'}</td>
                            <td><span class="${u.user_estado == 1 ? 'badge-activo' : 'badge-inactivo'}">${u.user_estado == 1 ? 'Activo' : 'Inactivo'}</span></td>
                            <td style="text-align: center;">
                                <button class="btn-action edit" onclick="editarUsuario(${u.user_id})" title="Editar">✏️</button>
                                <button class="btn-action delete" onclick="eliminarUsuario(${u.user_id})" title="Eliminar">🗑️</button>
                            </td>
                        </tr>
                    `).join('');
                }
            } else if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay usuarios registrados.</td></tr>';
            }
        } catch (err) {
            console.error('Error al cargar usuarios:', err);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8;">Error al cargar usuarios.</td></tr>';
            }
        }
    }

    // Abrir Modal para Nuevo Usuario
    const modalUsuario = document.getElementById('modalUsuario');
    const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');

    if (btnNuevoUsuario) {
        btnNuevoUsuario.addEventListener('click', () => {
            const titleEl = document.getElementById('modalUsuarioTitle');
            if (titleEl) titleEl.textContent = 'Nuevo Usuario';
            document.getElementById('user_id_edit').value = '';
            document.getElementById('formUsuario').reset();
            modalUsuario.classList.remove('hidden');
        });
    }

    // Abrir Modal para Editar Usuario
    window.editarUsuario = (id) => {
        const item = listaUsuarios.find(u => u.user_id === id);
        if (!item) return;

        const titleEl = document.getElementById('modalUsuarioTitle');
        if (titleEl) titleEl.textContent = 'Editar Usuario';
        document.getElementById('user_id_edit').value = item.user_id;
        document.getElementById('usr_nombre').value = item.user_nombre || '';
        document.getElementById('usr_ci').value = item.user_ci || '';
        document.getElementById('usr_usuario').value = item.user_usuario || '';
        document.getElementById('usr_password').value = ''; // Se deja vacío para no cambiar si no se edita
        document.getElementById('usr_cargo').value = item.user_cargo || 'TECNICO';
        document.getElementById('usr_cuad_id').value = item.cuad_id || '';
        
        const usrTelefono = document.getElementById('usr_telefono');
        if (usrTelefono) usrTelefono.value = item.user_telefono || '';

        modalUsuario.classList.remove('hidden');
    };

    // Guardar / Editar Usuario
    const formUsuario = document.getElementById('formUsuario');
    if (formUsuario) {
        formUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('user_id_edit').value;
            const passwordVal = document.getElementById('usr_password').value.trim();

            // Validación: La contraseña es requerida para un usuario nuevo
            if (!id && !passwordVal) {
                showAlert('La contraseña es obligatoria para nuevos usuarios', 'alert-error');
                return;
            }

            const method = id ? 'PUT' : 'POST';
            const empresaElem = document.getElementById('usr_empresa');
            const usrTelefonoElem = document.getElementById('usr_telefono');

            const body = {
                user_id: id ? parseInt(id, 10) : null,
                user_nombre: document.getElementById('usr_nombre').value.trim(),
                user_ci: document.getElementById('usr_ci').value.trim(),
                user_usuario: document.getElementById('usr_usuario').value.trim(),
                user_password: passwordVal || null,
                user_cargo: document.getElementById('usr_cargo').value,
                cuad_id: parseInt(document.getElementById('usr_cuad_id').value, 10) || null,
                id_empresa: empresaElem ? (parseInt(empresaElem.value, 10) || 1) : 1,
                user_telefono: usrTelefonoElem ? usrTelefonoElem.value.trim() : ''
            };

            try {
                const res = await fetch(API_USUARIOS, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
                const data = await res.json();

                if (data.status === 'success') {
                    modalUsuario.classList.add('hidden');
                    showAlert('Usuario guardado con éxito', 'alert-success');
                    cargarUsuarios();
                } else {
                    showAlert(data.message || 'Error al guardar usuario', 'alert-error');
                }
            } catch (err) {
                console.error('Error al guardar usuario:', err);
                showAlert('Error al conectar con la API de usuarios', 'alert-error');
            }
        });
    }

    // Eliminar Usuario
    window.eliminarUsuario = async (id) => {
        if (!confirm('¿Deseas eliminar este usuario?')) return;
        try {
            const res = await fetch(`${API_USUARIOS}?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Endpoint no encontrado');
            const data = await res.json();

            if (data.status === 'success') {
                showAlert('Usuario eliminado correctamente', 'alert-success');
                cargarUsuarios();
            } else {
                showAlert(data.message || 'No se pudo eliminar el usuario', 'alert-error');
            }
        } catch (err) {
            console.error('Error al eliminar usuario:', err);
            showAlert('Error al conectar con la API de eliminación de usuarios', 'alert-error');
        }
    };

    // ==========================================
    // CERRAR MODALES Y ALERTAS
    // ==========================================
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            if (modalCuadrilla) modalCuadrilla.classList.add('hidden');
            if (modalUsuario) modalUsuario.classList.add('hidden');
        });
    });

    // Cerrar modales con tecla ESC
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modalCuadrilla) modalCuadrilla.classList.add('hidden');
            if (modalUsuario) modalUsuario.classList.add('hidden');
        }
    });

    function showAlert(msg, cls) {
        if (alertDiv) {
            alertDiv.textContent = msg;
            alertDiv.className = `alert ${cls}`;
            alertDiv.classList.remove('hidden');
            setTimeout(() => alertDiv.classList.add('hidden'), 3500);
        }
    }
});