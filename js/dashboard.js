document.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('usuario_sesion');

    // Si no hay sesión iniciada, redirige al login
    if (!sessionData) {
        window.location.href = '../index.html';
        return;
    }

    const usuario = JSON.parse(sessionData);

    const userNameEl = document.getElementById('userName');
    const welcomeUserEl = document.getElementById('welcomeUser');

    if (userNameEl) userNameEl.textContent = `${usuario.nombre} (${usuario.cargo})`;
    if (welcomeUserEl) welcomeUserEl.textContent = usuario.nombre;

    // Control del botón cerrar sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('usuario_sesion');
            window.location.href = '../index.html';
        });
    }
});