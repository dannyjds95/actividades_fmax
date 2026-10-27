document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const alertDiv = document.getElementById('alert');
    const btnSubmit = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    // Base URL adaptativa
    const isVercel = window.location.hostname.includes('vercel.app');
    const BASE_URL = isVercel ? '' : 'https://actividades-fmax-9ysb.vercel.app';
    const API_URL = `${BASE_URL}/api/login`; 

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const user_usuario = document.getElementById('user_usuario').value.trim();
            const user_password = document.getElementById('user_password').value.trim();

            if (!user_usuario || !user_password) {
                showAlert('Por favor complete todos los campos.', 'alert-error');
                return;
            }

            hideAlert();
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Ingresando...';
            }

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_usuario, user_password })
                });

                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    throw new Error('El servidor devolvió una respuesta no válida o inesperada.');
                }

                if (response.ok && data.status === 'success') {
                    showAlert(data.message || '¡Inicio de sesión exitoso!', 'alert-success');

                    // Obtener objeto de usuario (soporta propiedad user o usuario)
                    const usuario = data.user || data.usuario || {};

                    // Guardar en localStorage para consultas posteriores
                    localStorage.setItem('usuario_sesion', JSON.stringify(usuario));
                    if (usuario.user_id) {
                        localStorage.setItem('user_id', usuario.user_id);
                    }
                    if (usuario.user_cargo) {
                        localStorage.setItem('user_cargo', usuario.user_cargo);
                    }

                    setTimeout(() => {
                        // Redirección adaptativa según la ubicación de login.html
                        const inSubfolder = window.location.pathname.includes('/html/');
                        window.location.href = inSubfolder ? 'dashboard.html' : 'html/dashboard.html';
                    }, 1000);
                } else {
                    showAlert(data.message || 'Credenciales incorrectas.', 'alert-error');
                }

            } catch (err) {
                console.error('Error de autenticación:', err);
                showAlert(err.message || 'Error de conexión con la API.', 'alert-error');
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Ingresar';
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

    function hideAlert() {
        if (alertDiv) {
            alertDiv.className = 'alert hidden';
            alertDiv.textContent = '';
        }
    }
});