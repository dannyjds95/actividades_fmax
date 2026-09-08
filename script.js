document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const alertDiv = document.getElementById('alert');
    const btnSubmit = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    // CONFIGURACIÓN DE LA URL DE LA API:
    // Si estás desplegando en GitHub Pages, pon tu URL de Vercel aquí (ejemplo: 'https://actividades-fmax.vercel.app/api/login')
    // Si ejecutas todo dentro de Vercel o localmente con Node/Express, déjalo como '/api/login'
    const API_URL = 'https://actividades-fmax-9ysb.vercel.app/api'; 

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const user_usuario = document.getElementById('user_usuario').value.trim();
            const user_password = document.getElementById('user_password').value.trim();

            if (!user_usuario || !user_password) {
                showAlert('Por favor complete todos los campos.', 'alert-error');
                return;
            }

            // Ocultar alertas y bloquear el botón mientras procesa
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

                // Validar que la respuesta contenga JSON válido antes de transformarlo
                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    throw new Error('El servidor devolvió una respuesta no válida o inesperada.');
                }

                if (response.ok && data.status === 'success') {
                    showAlert(data.message || '¡Inicio de sesión exitoso!', 'alert-success');

                    // Guardar datos de la sesión en localStorage
                    localStorage.setItem('usuario_sesion', JSON.stringify(data.user));

                    // Redirigir a la vista de actividades tras 1 segundo
                    setTimeout(() => {
                        window.location.href = 'html/actividades.html';
                    }, 1000);
                } else {
                    showAlert(data.message || 'Error al iniciar sesión.', 'alert-error');
                }

            } catch (err) {
                console.error('Error de autenticación:', err);
                showAlert(err.message || 'Error de conexión con la API.', 'alert-error');
            } finally {
                // Restaurar el botón tras completar la solicitud
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