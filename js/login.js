// ===================================================
// SISTEMA DE AUTENTICACIÓN Y GESTIÓN DE SESIÓN (login.js)
// ===================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configuración de URLs y Rutas Adaptativas
    const isVercel = window.location.hostname.includes('vercel.app');
    const BASE_URL = isVercel ? '' : 'https://actividades-fmax-9ysb.vercel.app';
    const API_LOGIN = `${BASE_URL}/api/login`;

    const inSubfolder = window.location.pathname.includes('/html/');
    const loginPagePath = inSubfolder ? '../index.html' : './index.html';
    const dashboardPagePath = inSubfolder ? 'dashboard.html' : 'html/dashboard.html';

    const loginForm = document.getElementById('loginForm');
    const alertDiv = document.getElementById('alert');

    // ===================================================
    // SECCIÓN A: PÁGINA DE LOGIN (index.html)
    // ===================================================
    if (loginForm) {
        // Redirección automática si el usuario YA tiene sesión válida
        const sessionData = localStorage.getItem('usuario_sesion');
        const userId = localStorage.getItem('user_id');

        if (sessionData && userId && userId !== 'null' && userId !== 'undefined') {
            window.location.href = dashboardPagePath;
            return;
        }

        const btnSubmit = loginForm.querySelector('button[type="submit"]');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const user_usuario = document.getElementById('user_usuario')?.value.trim();
            const user_password = document.getElementById('user_password')?.value.trim();

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
                const response = await fetch(API_LOGIN, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_usuario, user_password })
                });

                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    throw new Error('Respuesta no válida del servidor.');
                }

                if (response.ok && data.status === 'success') {
                    showAlert(data.message || '¡Inicio de sesión exitoso!', 'alert-success');

                    const usuario = data.user || data.usuario || {};

                    // Guardar objeto completo de sesión
                    localStorage.setItem('usuario_sesion', JSON.stringify(usuario));

                    // Sincronizar llaves individuales para consultas a las APIs
                    const uId = usuario.user_id || usuario.id;
                    const uCargo = usuario.user_cargo || usuario.cargo;
                    const uCuad = usuario.cuad_id;

                    if (uId) localStorage.setItem('user_id', String(uId));
                    if (uCargo) localStorage.setItem('user_cargo', String(uCargo));
                    if (uCuad !== undefined && uCuad !== null) localStorage.setItem('cuad_id', String(uCuad));

                    setTimeout(() => {
                        window.location.href = dashboardPagePath;
                    }, 800);
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

        return; // Detiene la ejecución en el Login
    }

    // ===================================================
    // SECCIÓN B: PÁGINAS PROTEGIDAS (Dashboard, Actividades, etc.)
    // ===================================================
    const sessionData = localStorage.getItem('usuario_sesion');
    const userId = localStorage.getItem('user_id');

    if (!sessionData || !userId || userId === 'null' || userId === 'undefined') {
        cerrarSesionCompleta(loginPagePath);
        return;
    }

    let usuario = {};
    try {
        usuario = JSON.parse(sessionData);
    } catch (e) {
        console.error('Error al parsear datos de sesión:', e);
        cerrarSesionCompleta(loginPagePath);
        return;
    }

    // Re-sincronizar llaves por seguridad
    const uId = usuario.user_id || usuario.id;
    const uCargo = usuario.user_cargo || usuario.cargo;
    const uCuad = usuario.cuad_id;

    if (uId) localStorage.setItem('user_id', String(uId));
    if (uCargo) localStorage.setItem('user_cargo', String(uCargo));
    if (uCuad !== undefined && uCuad !== null) localStorage.setItem('cuad_id', String(uCuad));

    // Mostrar nombre de usuario en la barra de navegación / perfil
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = usuario.nombre || usuario.user_nombre || usuario.usuario || 'Perfil';
    }

    // Control Menú Desplegable de Perfil
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            userDropdown.classList.add('hidden');
        });
    }

    // Control Botón Cerrar Sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarSesionCompleta(loginPagePath);
        });
    }
});

// ===================================================
// FUNCIONES GLOBALES Y REGISTRO DE SERVICE WORKER (PWA)
// ===================================================

function cerrarSesionCompleta(redirectPath) {
    localStorage.removeItem('usuario_sesion');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_cargo');
    localStorage.removeItem('cuad_id');

    const inSubfolder = window.location.pathname.includes('/html/');
    const target = redirectPath || (inSubfolder ? '../index.html' : './index.html');
    window.location.href = target;
}

// Registro y auto-actualización automática de PWA (Service Worker)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swPath = window.location.pathname.includes('/actividades_fmax/')
            ? '/actividades_fmax/sw.js'
            : '/sw.js';

        navigator.serviceWorker.register(swPath).then((reg) => {
            // Verificar si hay una nueva versión del SW en Vercel/GitHub
            reg.update();
        }).catch((err) => {
            console.warn('Service Worker no registrado:', err);
        });

        // Recargar automáticamente cuando se active la nueva versión de caché
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    });
}