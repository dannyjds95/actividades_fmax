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

    // URL base dinámica según el entorno
    const BASE_URL = window.location.hostname.includes('vercel.app')
        ? ''
        : 'https://actividades-fmax-9ysb.vercel.app';

    // 1. Cargar Períodos en el Select
    async function cargarPeriodos() {
        try {
            const res = await fetch(`${BASE_URL}/api/obtener-periodos`);
            const data = await res.json();
            
            if (data.status === 'success') {
                selectPeriodo.innerHTML = '<option value="">Seleccione un período...</option>';
                data.periodos.forEach(p => {
                    const option = document.createElement('option');
                    // Soporta diferentes nombres de columna (id_periodo / peri_id, etc.)
                    const id = p.id_periodo || p.peri_id || p.id;
                    const nombre = p.nombre_periodo || p.peri_nombre || `Período ${id}`;
                    const inicio = p.fecha_inicio || p.peri_fecha_inicio;
                    const fin = p.fecha_fin || p.peri_fecha_fin;

                    option.value = id;
                    option.textContent = `${nombre} (${inicio} a ${fin})`;
                    option.dataset.inicio = inicio;
                    option.dataset.fin = fin;
                    selectPeriodo.appendChild(option);
                });
            } else {
                console.error('Error del servidor:', data.message);
            }
        } catch (err) {
            console.error('Error cargando períodos:', err);
        }
    }

    // 2. Cargar Métricas Filtradas por Período
    async function cargarMetricas(fechaInicio, fechaFin) {
        try {
            const res = await fetch(`${BASE_URL}/api/obtener-dashboard-metricas?inicio=${fechaInicio}&fin=${fechaFin}`);
            const data = await res.json();

            if (data.status === 'success') {
                const m = data.metricas;
                document.getElementById('lbl_monto_facturado').textContent = `$${parseFloat(m.monto_facturado || 0).toFixed(2)}`;
                document.getElementById('lbl_total_actividades').textContent = m.total_actividades || 0;
                document.getElementById('lbl_registros_guardados').textContent = m.registros_guardados || 0;
                document.getElementById('lbl_excedente_fibra').textContent = `${m.excedente_m || 0} m`;
                document.getElementById('lbl_excedente_valor').textContent = `$${parseFloat(m.excedente_valor || 0).toFixed(2)}`;
                document.getElementById('lbl_puntos_red_ac').textContent = `${m.puntos_red || 0} Pts / ${m.equipos_ac || 0} AC`;
            }
        } catch (err) {
            console.error('Error cargando métricas:', err);
        }
    }

    // Escuchar cambios de selección
    selectPeriodo.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        if (selectedOption.value) {
            cargarMetricas(selectedOption.dataset.inicio, selectedOption.dataset.fin);
        }
    });

    await cargarPeriodos();
});