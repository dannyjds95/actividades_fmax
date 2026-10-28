document.addEventListener('DOMContentLoaded', async () => {
    // 1. Configuración de URL base adaptativa
    const isVercel = window.location.hostname.includes('vercel.app');
    const BASE_URL = isVercel ? '' : 'https://actividades-fmax-9ysb.vercel.app';

    // Obtener ID del usuario desde localStorage
    let userId = localStorage.getItem('user_id');
    const sessionData = localStorage.getItem('usuario_sesion');
    
    if (sessionData && (!userId || userId === 'null' || userId === 'undefined')) {
        try {
            const parsed = JSON.parse(sessionData);
            userId = parsed.user_id || parsed.id;
        } catch (e) {
            console.error('Error al leer sesión:', e);
        }
    }

    // Auxiliar para asignar texto por defecto si viene vacío o null
    const setFieldText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (value !== undefined && value !== null && value !== '') ? value : 'No especificado';
    };

    // Auxiliar para formatear los valores numéricos/monetarios
    const setFieldCurrency = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            if (value !== undefined && value !== null && value !== '') {
                const num = parseFloat(value);
                el.textContent = isNaN(num) ? value : `$${num.toFixed(2)}`;
            } else {
                el.textContent = '$0.00';
            }
        }
    };

    // Función encargada de renderizar los datos en pantalla con fallbacks completos
    const renderPerfil = (usuario) => {
        if (!usuario) return;

        // 1. Datos Personales
        setFieldText('profileNombre', usuario.user_nombre || usuario.nombre);
        setFieldText('profileCuadrilla', usuario.cuad_nombre || usuario.cuadrilla || usuario.nom_cuadrilla || usuario.nombre_cuadrilla);
        setFieldText('profileCargo', usuario.user_cargo || usuario.cargo);
        setFieldText('profileEmpresa', usuario.empresa || usuario.emp_razon || usuario.nombre_empresa);
        setFieldText('profileCedula', usuario.user_ci || usuario.cedula);
        setFieldText('profileTelefono', usuario.user_telefono || usuario.telefono);
        setFieldText('profileDireccion', usuario.user_direccion || usuario.direccion);
        setFieldText('profileSector', usuario.user_sector || usuario.sector);

        // 2. Valores y Tarifas de Actividades (Soporta nombres de la BD y la API)
        setFieldCurrency('profileValorAct', usuario.valor_act ?? usuario.cuad_valor_act);
        setFieldCurrency('profileValorVisita', usuario.valor_visita ?? usuario.cuad_valor_visita);
        setFieldCurrency('profileValorPred', usuario.valor_pred ?? usuario.cuad_valor_pred);
        setFieldCurrency('profileValorAc', usuario.valor_ac ?? usuario.cuad_valor_ac);
        setFieldCurrency('profileValorExc', usuario.valor_exc ?? usuario.cuad_valor_exc);
        setFieldText('profileExcedente', usuario.excedente ?? usuario.cuad_excedente);
    };

    // Paso A: Carga inmediata desde localStorage para evitar retrasos visuales
    if (sessionData) {
        try {
            const usuarioLocal = JSON.parse(sessionData);
            renderPerfil(usuarioLocal);
        } catch (e) {
            console.error('Error cargando datos de sesión local:', e);
        }
    }

    // Paso B: CONSULTA A LA BASE DE DATOS (API) PARA OBTENER DATOS FRESCOS DE MYSQL
    if (userId && userId !== 'null' && userId !== 'undefined') {
        try {
            const res = await fetch(`${BASE_URL}/api/admin-usuarios?id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                const usuarioFresh = data.usuario || data.user;

                if (usuarioFresh) {
                    // Actualizar localStorage con la información en tiempo real
                    localStorage.setItem('usuario_sesion', JSON.stringify(usuarioFresh));
                    
                    const nuevoCargo = usuarioFresh.user_cargo || usuarioFresh.cargo;
                    if (nuevoCargo) {
                        localStorage.setItem('user_cargo', String(nuevoCargo));
                    }

                    // Re-renderizar la pantalla con los datos actualizados de la BD
                    renderPerfil(usuarioFresh);
                }
            }
        } catch (err) {
            console.warn('No se pudo actualizar el perfil desde la base de datos (usando caché local):', err);
        }
    }
});