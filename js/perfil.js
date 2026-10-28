document.addEventListener('DOMContentLoaded', async () => {
    // 1. Configuración de URL base
    const isVercel = window.location.hostname.includes('vercel.app');
    const BASE_URL = isVercel ? '' : 'https://actividades-fmax-9ysb.vercel.app';

    // Obtener ID del usuario desde localStorage
    let userId = localStorage.getItem('user_id');
    const sessionData = localStorage.getItem('usuario_sesion');
    
    if (sessionData && !userId) {
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

    // Función encargada de dibujar los datos en pantalla
    const renderPerfil = (usuario) => {
        // 1. Datos Personales
        setFieldText('profileNombre', usuario.nombre || usuario.user_nombre);
        setFieldText('profileCuadrilla', usuario.cuadrilla || usuario.cuad_nombre || usuario.nom_cuadrilla || usuario.nombre_cuadrilla);
        setFieldText('profileCargo', usuario.cargo || usuario.user_cargo);
        setFieldText('profileEmpresa', usuario.empresa || usuario.nombre_empresa);
        setFieldText('profileCedula', usuario.cedula || usuario.user_ci);
        setFieldText('profileTelefono', usuario.telefono || usuario.user_telefono);
        setFieldText('profileDireccion', usuario.direccion || usuario.user_direccion);
        setFieldText('profileSector', usuario.sector || usuario.user_sector);

        // 2. Valores de Actividades
        setFieldCurrency('profileValorAct', usuario.valor_act);
        setFieldCurrency('profileValorVisita', usuario.valor_visita);
        setFieldCurrency('profileValorPred', usuario.valor_pred);
        setFieldCurrency('profileValorAc', usuario.valor_ac);
        setFieldCurrency('profileValorExc', usuario.valor_exc);
        setFieldText('profileExcedente', usuario.excedente);
    };

    // paso A: Carga inmediata desde localStorage (para evitar pantallazos en blanco)
    if (sessionData) {
        try {
            const usuarioLocal = JSON.parse(sessionData);
            renderPerfil(usuarioLocal);
        } catch (e) {
            console.error('Error cargando datos de sesión local:', e);
        }
    }

    // paso B: CONSULTA A LA BASE DE DATOS (API) PARA SINCRONIZAR CAMBIOS
    if (userId) {
        try {
            const res = await fetch(`${BASE_URL}/api/admin-usuarios?id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                const usuarioFresh = data.usuario || data.user;

                if (usuarioFresh) {
                    // Actualizar localStorage con los datos más recientes de MySQL
                    localStorage.setItem('usuario_sesion', JSON.stringify(usuarioFresh));
                    
                    const nuevoCargo = usuarioFresh.user_cargo || usuarioFresh.cargo;
                    if (nuevoCargo) {
                        localStorage.setItem('user_cargo', nuevoCargo);
                    }

                    // Re-renderizar la pantalla con el nuevo cargo y datos reales
                    renderPerfil(usuarioFresh);
                }
            }
        } catch (err) {
            console.warn('No se pudo actualizar el perfil desde la base de datos (usando datos locales):', err);
        }
    }
});