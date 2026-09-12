document.addEventListener('DOMContentLoaded', () => {
    const sessionData = localStorage.getItem('usuario_sesion');
    
    if (sessionData) {
        const usuario = JSON.parse(sessionData);

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

        // 1. Datos Personales
        setFieldText('profileNombre', usuario.nombre);
        setFieldText('profileUsuario', usuario.user_usuario || usuario.usuario);
        setFieldText('profileCargo', usuario.cargo);
        setFieldText('profileEmpresa', usuario.empresa);
        setFieldText('profileCedula', usuario.cedula);
        setFieldText('profileTelefono', usuario.telefono);
        setFieldText('profileDireccion', usuario.direccion);
        setFieldText('profileSector', usuario.sector);

        // 2. Valores de Actividades
        setFieldCurrency('profileValorAct', usuario.valor_act);
        setFieldCurrency('profileValorVisita', usuario.valor_visita);
        setFieldCurrency('profileValorPred', usuario.valor_pred);
        setFieldCurrency('profileValorAc', usuario.valor_ac);
        setFieldCurrency('profileValorExc', usuario.valor_exc);
        setFieldText('profileExcedente', usuario.excedente);
    }
});