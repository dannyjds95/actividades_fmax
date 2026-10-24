document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('credentialsForm');
    const alertDiv = document.getElementById('alert');
    const btnSubmit = form ? form.querySelector('button[type="submit"]') : null;

    const BASE_VERCEL_URL = 'https://actividades-fmax-9ysb.vercel.app';
    const isVercel = window.location.hostname.includes('vercel.app');
    const API_URL = isVercel ? '/api/cambiar-credenciales' : `${BASE_VERCEL_URL}/api/cambiar-credenciales`;

    const userSession = JSON.parse(localStorage.getItem('usuario_sesion'));

    if (!userSession) {
        window.location.href = '../index.html';
        return;
    }

    // Cargar nombre de usuario actual en el input
    const usuarioInput = document.getElementById('user_usuario');
    if (usuarioInput) {
        usuarioInput.value = userSession.user_usuario || userSession.usuario || '';
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newUsername = document.getElementById('user_usuario').value.trim();
            const currentPassword = document.getElementById('current_password').value;
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = document.getElementById('confirm_password').value;

            // Validaciones locales
            if (!currentPassword) {
                showAlert('Debes ingresar tu contraseña actual para confirmar los cambios.', 'alert-error');
                return;
            }

            if (newPassword || confirmPassword) {
                if (newPassword !== confirmPassword) {
                    showAlert('La nueva contraseña y su confirmación no coinciden.', 'alert-error');
                    return;
                }
                if (newPassword.length < 4) {
                    showAlert('La nueva contraseña debe tener al menos 4 caracteres.', 'alert-error');
                    return;
                }
            }

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Actualizando...';
            }

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: userSession.id,
                        user_usuario: newUsername,
                        current_password: currentPassword,
                        new_password: newPassword || null
                    })
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    // Actualizar localStorage
                    userSession.user_usuario = newUsername;
                    userSession.usuario = newUsername;
                    localStorage.setItem('usuario_sesion', JSON.stringify(userSession));

                    showAlert('Credenciales actualizadas correctamente.', 'alert-success');
                    
                    // Limpiar campos de contraseña
                    document.getElementById('current_password').value = '';
                    document.getElementById('new_password').value = '';
                    document.getElementById('confirm_password').value = '';

                    setTimeout(() => {
                        window.location.href = 'perfil.html';
                    }, 1200);
                } else {
                    showAlert(data.message || 'Error al actualizar credenciales.', 'alert-error');
                }

            } catch (err) {
                console.error('Error:', err);
                showAlert('Error de conexión con el servidor.', 'alert-error');
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
            alertDiv.classList.remove('hidden');
        }
    }
});