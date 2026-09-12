document.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('usuario_sesion');
    
    if (sessionData) {
        const usuario = JSON.parse(sessionData);

        // Renderiza los campos guardados en la sesión
        const elNombre = document.getElementById('profileNombre');
        const elUsuario = document.getElementById('profileUsuario');
        const elCargo = document.getElementById('profileCargo');

        if (elNombre) elNombre.textContent = usuario.nombre || 'No especificado';
        if (elUsuario) elUsuario.textContent = usuario.user_usuario || usuario.usuario || 'No especificado';
        if (elCargo) elCargo.textContent = usuario.cargo || 'Sin cargo asignado';
    }
});