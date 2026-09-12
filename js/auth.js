document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar sesión activa
    const sessionData = localStorage.getItem('usuario_sesion');
    if (!sessionData) {
        window.location.href = '../index.html';
        return;
    }

    const usuario = JSON.parse(sessionData);

    // 2. Colocar nombre de usuario en el botón de perfil
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = usuario.nombre || 'Perfil';
    }

    // 3. Control del menú desplegable
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuBtn && userDropdown) {
        // Abrir / Cerrar al hacer clic en el botón
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });

        // Cerrar menú al hacer clic fuera de él
        document.addEventListener('click', () => {
            userDropdown.classList.add('hidden');
        });
    }

    // 4. Funcionalidad de Cerrar Sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('usuario_sesion');
            window.location.href = '../index.html';
        });
    }

});