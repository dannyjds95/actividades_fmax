document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editForm');
    const alertDiv = document.getElementById('alert');
    const btnSubmit = editForm ? editForm.querySelector('button[type="submit"]') : null;

    // URL completa hacia la API desplegada en Vercel
const API_URL = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
    ? 'https://actividades-fmax-9ysb.vercel.app/api/actualizar-perfil'
    : '/api/actualizar-perfil';

    // Obtener la sesión actual guardada
    const userSession = JSON.parse(localStorage.getItem('usuario_sesion'));

    if (!userSession) {
        window.location.href = '../index.html';
        return;
    }

    // 1. Precargar valores existentes en el formulario
    document.getElementById('nombre').value = userSession.nombre || '';
    document.getElementById('cedula').value = userSession.cedula || '';
    document.getElementById('telefono').value = userSession.telefono || '';
    document.getElementById('direccion').value = userSession.direccion || '';
    document.getElementById('valor_act').value = userSession.valor_act || 0;
    document.getElementById('valor_visita').value = userSession.valor_visita || 0;
    document.getElementById('valor_pred').value = userSession.valor_pred || 0;
    document.getElementById('valor_ac').value = userSession.valor_ac || 0;
    document.getElementById('valor_exc').value = userSession.valor_exc || 0;

    // 2. Enviar actualización
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Guardando...';
            }

            const updatedData = {
                id: userSession.id,
                nombre: document.getElementById('nombre').value.trim(),
                cedula: document.getElementById('cedula').value.trim(),
                telefono: document.getElementById('telefono').value.trim(),
                direccion: document.getElementById('direccion').value.trim(),
                valor_act: parseFloat(document.getElementById('valor_act').value) || 0,
                valor_visita: parseFloat(document.getElementById('valor_visita').value) || 0,
                valor_pred: parseFloat(document.getElementById('valor_pred').value) || 0,
                valor_ac: parseFloat(document.getElementById('valor_ac').value) || 0,
                valor_exc: parseFloat(document.getElementById('valor_exc').value) || 0
            };

            try {
                const response = await fetch(API_URL, {
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

                if (response.ok && data.status === 'success') {
                    // Actualizar localStorage
                    Object.assign(userSession, {
                        nombre: updatedData.nombre,
                        cedula: updatedData.cedula,
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
                    showAlert(data.message || 'Error al actualizar la información.', 'alert-error');
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

    function showAlert(message, typeClass) {
        if (alertDiv) {
            alertDiv.textContent = message;
            alertDiv.className = `alert ${typeClass}`;
        }
    }
});