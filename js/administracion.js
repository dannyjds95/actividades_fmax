document.addEventListener('DOMContentLoaded', () => {
    const isVercel = window.location.hostname.includes('vercel.app');
    const BASE_URL = isVercel ? '' : 'https://actividades-fmax-9ysb.vercel.app';

    const API_CUADRILLAS = `${BASE_URL}/api/obtener-cuadrillas`;
    const API_GUARDAR_CUADRILLA = `${BASE_URL}/api/guardar-cuadrilla`;
    const API_USUARIOS = `${BASE_URL}/api/admin-usuarios`;

    const tabCuadrillas = document.getElementById('tabCuadrillas');
    const tabUsuarios = document.getElementById('tabUsuarios');
    const secCuadrillas = document.getElementById('secCuadrillas');
    const secUsuarios = document.getElementById('secUsuarios');
    const alertDiv = document.getElementById('alert');

    let listaCuadrillas = [];
    let listaUsuarios = [];
    let usuariosCargados = false;

    // Cargar cuadrillas inmediatamente
    cargarCuadrillas();

    // Cambiar de pestaña (Carga usuarios solo cuando se presione la pestaña Usuarios)
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
    // CUADRILLAS
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

                tbody.innerHTML = listaCuadrillas.map(c => `
                    <tr>
                        <td><strong>#${c.cuad_id}</strong></td>
                        <td>${c.cuad_nombre}</td>
                        <td>${c.cuad_sector || 'N/A'}</td>
                        <td>${c.fecha_creacion ? c.fecha_creacion.split('T')[0] : 'N/A'}</td>
                        <td style="text-align: center;">
                            <button class="btn-action edit" onclick="editarCuadrilla(${c.cuad_id})">✏️</button>
                            <button class="btn-action delete" onclick="eliminarCuadrilla(${c.cuad_id})">🗑️</button>
                        </td>
                    </tr>
                `).join('');

                if (selectModalUser) {
                    selectModalUser.innerHTML = '<option value="">Seleccione...</option>' +
                        listaCuadrillas.map(c => `<option value="${c.cuad_id}">${c.cuad_nombre}</option>`).join('');
                }
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay cuadrillas registradas.</td></tr>';
            }
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar cuadrillas.</td></tr>';
        }
    }

    // Modal Cuadrilla
    const modalCuadrilla = document.getElementById('modalCuadrilla');
    const btnNuevaCuadrilla = document.getElementById('btnNuevaCuadrilla');

    if (btnNuevaCuadrilla) {
        btnNuevaCuadrilla.addEventListener('click', () => {
            document.getElementById('modalCuadrillaTitle').textContent = 'Nueva Cuadrilla';
            document.getElementById('cuad_id_edit').value = '';
            document.getElementById('formCuadrilla').reset();
            modalCuadrilla.classList.remove('hidden');
        });
    }

    window.editarCuadrilla = (id) => {
        const item = listaCuadrillas.find(c => c.cuad_id === id);
        if (!item) return;

        document.getElementById('modalCuadrillaTitle').textContent = 'Editar Cuadrilla';
        document.getElementById('cuad_id_edit').value = item.cuad_id;
        document.getElementById('cuad_nombre_input').value = item.cuad_nombre;
        document.getElementById('cuad_sector_input').value = item.cuad_sector || '';
        modalCuadrilla.classList.remove('hidden');
    };

    document.getElementById('formCuadrilla').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('cuad_id_edit').value;
        const body = {
            cuad_id: id ? parseInt(id, 10) : null,
            cuad_nombre: document.getElementById('cuad_nombre_input').value.trim(),
            cuad_sector: document.getElementById('cuad_sector_input').value.trim()
        };

        try {
            const res = await fetch(API_GUARDAR_CUADRILLA, {
                method: 'POST',
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
            console.error(err);
            showAlert('Error al conectar con el servidor', 'alert-error');
        }
    });

    window.eliminarCuadrilla = async (id) => {
        if (!confirm('¿Deseas eliminar esta cuadrilla?')) return;
        try {
            const res = await fetch(`${BASE_URL}/api/eliminar-cuadrilla?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Endpoint no encontrado');
            const data = await res.json();
            if (data.status === 'success') {
                showAlert('Cuadrilla eliminada', 'alert-success');
                cargarCuadrillas();
            } else {
                showAlert(data.message || 'No se pudo eliminar la cuadrilla', 'alert-error');
            }
        } catch (err) {
            showAlert('Error al conectar con la API de eliminación', 'alert-error');
        }
    };

    // ==========================================
    // USUARIOS
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
                tbody.innerHTML = listaUsuarios.map(u => `
                    <tr>
                        <td><strong>#${u.user_id}</strong></td>
                        <td>${u.user_nombre}</td>
                        <td>${u.user_usuario}</td>
                        <td><span class="badge">${u.user_cargo || 'N/A'}</span></td>
                        <td>${u.cuad_nombre || 'Sin asignación'}</td>
                        <td><span class="status ${u.user_estado == 1 ? 'active' : 'inactive'}">${u.user_estado == 1 ? 'Activo' : 'Inactivo'}</span></td>
                        <td style="text-align: center;">
                            <button class="btn-action edit" onclick="editarUsuario(${u.user_id})">✏️</button>
                            <button class="btn-action delete" onclick="eliminarUsuario(${u.user_id})">🗑️</button>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay usuarios registrados.</td></tr>';
            }
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8;">Endpoint de usuarios aún no desplegado en Vercel.</td></tr>';
        }
    }

    // Cerrar Modales
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            if (modalCuadrilla) modalCuadrilla.classList.add('hidden');
            const modalUsuario = document.getElementById('modalUsuario');
            if (modalUsuario) modalUsuario.classList.add('hidden');
        });
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