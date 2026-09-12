document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                // En móvil: abre/cierra menú deslizable con capa oscura
                sidebar.classList.toggle('active');
                if (overlay) overlay.classList.toggle('active');
            } else {
                // En escritorio: contrae/expande barra lateral
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    // Cerrar al hacer clic fuera del menú en móvil
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
});