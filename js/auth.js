document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar sesión activa
    const sessionData = localStorage.getItem('usuario_sesion');
    if (!sessionData) {
        window.location.href = '../index.html';
        return;
    }

    let usuario = {};
    try {
        usuario = JSON.parse(sessionData);
    } catch (e) {
        console.error('Error al parsear datos de sesión:', e);
        cerrarSesionCompleta();
        return;
    }

    // 2. Sincronizar llaves individuales necesarias para las APIs
    if (usuario.user_id || usuario.id) {
        localStorage.setItem('user_id', usuario.user_id || usuario.id);
    }
    if (usuario.user_cargo || usuario.cargo) {
        localStorage.setItem('user_cargo', usuario.user_cargo || usuario.cargo);
    }
    if (usuario.cuad_id !== undefined && usuario.cuad_id !== null) {
        localStorage.setItem('cuad_id', usuario.cuad_id);
    }

    // 3. Colocar nombre de usuario en el botón de perfil
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = usuario.nombre || usuario.user_nombre || 'Perfil';
    }

    // 4. Control del menú desplegable
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

    // 5. Funcionalidad de Cerrar Sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarSesionCompleta();
        });
    }
});

// Función auxiliar para borrar completamente la sesión
function cerrarSesionCompleta() {
    localStorage.removeItem('usuario_sesion');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_cargo');
    localStorage.removeItem('cuad_id');
    
    // Redirigir al inicio de sesión
    window.location.href = '../index.html';
}