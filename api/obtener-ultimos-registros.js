async function cargarSeccionesSecundarias(fechaInicio, fechaFin) {
    try {
        let url = `${BASE_URL}/api/obtener-ultimos-registros`;
        if (fechaInicio && fechaFin) {
            url += `?inicio=${fechaInicio}&fin=${fechaFin}`;
        }

        console.log('Consultando API secundaria:', url);
        const res = await fetch(url);
        const data = await res.json();
        console.log('Respuesta recibida del backend:', data);

        if (data.status === 'success') {
            // 1. Resumen Cuadrilla
            const trabajos = data.cuadrilla?.total_trabajos || 0;
            const monto = parseFloat(data.cuadrilla?.total_monto || 0).toFixed(2);
            
            const elTrabajos = document.getElementById('lbl_cuadrilla_trabajos');
            const elMonto = document.getElementById('lbl_cuadrilla_monto');
            
            if (elTrabajos) elTrabajos.textContent = `${trabajos} trabajos`;
            if (elMonto) elMonto.textContent = `$${monto}`;

            // 2. Detalle de Actividades
            const cntActividades = document.getElementById('cnt_detalle_actividades');
            if (cntActividades) {
                if (data.actividades && data.actividades.length > 0) {
                    cntActividades.innerHTML = data.actividades.map(act => `
                        <div class="activity-item">
                            <div>
                                <span class="badge-tipo ${getBadgeClass(act.tipo)}">${act.tipo}</span>
                                <div class="item-subtitle" style="margin-top:4px;">${act.registros} registros</div>
                            </div>
                            <span class="activity-amount-blue">$${parseFloat(act.monto || 0).toFixed(2)}</span>
                        </div>
                    `).join('');
                } else {
                    cntActividades.innerHTML = '<p style="color:#94a3b8; font-size:13px; text-align:center; padding:12px;">Sin actividades en este período</p>';
                }
            }

            // 3. Tabla Últimos 10 Registros
            const tblBody = document.getElementById('tbl_ultimos_registros');
            if (tblBody) {
                if (data.ultimos && data.ultimos.length > 0) {
                    tblBody.innerHTML = data.ultimos.map(reg => {
                        const fechaFormateada = reg.fecha ? String(reg.fecha).split('T')[0] : '-';
                        return `
                            <tr>
                                <td>${fechaFormateada}</td>
                                <td class="td-cuadrilla">${reg.cuadrilla}</td>
                                <td>${reg.cliente}</td>
                                <td><span class="badge-tipo ${getBadgeClass(reg.tipo)}">${reg.tipo}</span></td>
                                <td>${reg.forma}</td>
                                <td class="td-monto">$${parseFloat(reg.monto || 0).toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    tblBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">No se encontraron registros en este período</td></tr>';
                }
            }
        } else {
            console.error('El backend retornó un error:', data.message);
        }
    } catch (err) {
        console.error('Error de red al consultar secciones secundarias:', err);
    }
}