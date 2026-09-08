document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar si el usuario tiene sesión activa
    const sessionData = localStorage.getItem('usuario_sesion');
    
    if (!sessionData) {
        // Redirige al login si no existe la sesión
        window.location.href = '../index.html';
        return;
    }

    const usuario = JSON.parse(sessionData);

    // 2. Mostrar nombre de usuario en la barra de navegación si existe el contenedor
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = `${usuario.nombre || 'Usuario'} (${usuario.cargo || 'Sin Cargo'})`;
    }

    // 3. Dar funcionalidad al botón Cerrar Sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();

            // Eliminar token/datos de sesión
            localStorage.removeItem('usuario_sesion');

            // Redirigir a la pantalla de login principal
            window.location.href = '../index.html';
        });
    }
});