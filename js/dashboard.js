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

    if (userNameEl) userNameEl.textContent = `${usuario.nombre}`;
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

document.addEventListener('DOMContentLoaded', async () => {
    const selectPeriodo = document.getElementById('select_periodo');

    // 1. Cargar Períodos en el Select
    async function cargarPeriodos() {
        try {
            const res = await fetch('/api/obtener-periodos');
            const data = await res.json();
            
            if (data.status === 'success') {
                selectPeriodo.innerHTML = '<option value="">Seleccione un período</option>';
                data.periodos.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.id_periodo;
                    option.textContent = `${p.nombre_periodo} (${p.fecha_inicio} a ${p.fecha_fin})`;
                    option.dataset.inicio = p.fecha_inicio;
                    option.dataset.fin = p.fecha_fin;
                    selectPeriodo.appendChild(option);
                });
            }
        } catch (err) {
            console.error('Error cargando períodos:', err);
        }
    }

    // 2. Cargar Métricas Filtradas por Período
    async function cargarMétricas(fechaInicio, fechaFin) {
        try {
            const res = await fetch(`/api/obtener-dashboard-metricas?inicio=${fechaInicio}&fin=${fechaFin}`);
            const data = await res.json();

            if (data.status === 'success') {
                const m = data.metricas;
                document.getElementById('lbl_monto_facturado').textContent = `$${parseFloat(m.monto_facturado).toFixed(2)}`;
                document.getElementById('lbl_total_actividades').textContent = m.total_actividades;
                document.getElementById('lbl_registros_guardados').textContent = m.registros_guardados;
                document.getElementById('lbl_excedente_fibra').textContent = `${m.excedente_m} m`;
                document.getElementById('lbl_excedente_valor').textContent = `$${parseFloat(m.excedente_valor).toFixed(2)}`;
                document.getElementById('lbl_puntos_red_ac').textContent = `${m.puntos_red} Pts / ${m.equipos_ac} AC`;
            }
        } catch (err) {
            console.error('Error cargando métricas:', err);
        }
    }

    // Listener para actualizar al cambiar de período
    selectPeriodo.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        if (selectedOption.value) {
            cargarMétricas(selectedOption.dataset.inicio, selectedOption.dataset.fin);
        }
    });

    await cargarPeriodos();
});