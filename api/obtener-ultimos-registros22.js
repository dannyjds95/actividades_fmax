const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // Cabeceras CORS y Content-Type
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 1. Extraer fechas y datos de sesión desde los parámetros URL
    const { inicio, fin, user_id, user_cargo } = req.query;

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000,
            user: process.env.DB_USER || '2ji5HdpY4sfmZMo.root',
            password: process.env.DB_PASSWORD || 'tQPdtsQdqHSASOp6',
            database: process.env.DB_NAME || 'actividades2',
            ssl: { rejectUnauthorized: false }
        });

        let conditions = [];
        let params = [];

        // 2. Filtro de Seguridad por Usuario / Cargo
        if (user_cargo !== 'ADMINISTRADOR' && user_cargo !== 'SUPERVISOR') {
            // Usuarios normales: filtrar solo sus propias actividades
            if (user_id && user_id !== 'null' && user_id !== 'undefined') {
                conditions.push('user_id = ?');
                params.push(user_id);
            }
        } else {
            // Administradores / Supervisores: filtrar por usuario solo si viene especificado en la consulta
            if (user_id && user_id !== 'TODOS' && user_id !== 'null' && user_id !== 'undefined') {
                conditions.push('user_id = ?');
                params.push(user_id);
            }
        }

        // 3. Filtro Opcional por Rango de Fechas
        if (inicio && fin && inicio !== 'undefined' && fin !== 'undefined' && inicio !== 'null') {
            conditions.push('act_fecha BETWEEN ? AND ?');
            params.push(inicio, fin);
        }

        const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

        // --- CONSULTA 1: Resumen de Trabajos y Monto ---
        const queryCuadrilla = `
            SELECT 
                COUNT(*) AS total_trabajos, 
                COALESCE(SUM(COALESCE(act_total, act_valor, 0)), 0) AS total_monto 
            FROM actividad_detalle
            ${whereClause}
        `;
        const [cuadrillaRows] = await connection.execute(queryCuadrilla, params);

        // --- CONSULTA 2: Detalle por Tipo de Actividad (Instalación, Traslado, Visita) ---
        const queryActividades = `
            SELECT 
                act_tipo AS tipo, 
                SUM(COALESCE(act_cantidad, 1)) AS cantidad, 
                COALESCE(SUM(COALESCE(act_total, act_valor, 0)), 0) AS monto 
            FROM actividad_detalle
            ${whereClause}
            GROUP BY act_tipo
            ORDER BY cantidad DESC
        `;
        const [actividadesRows] = await connection.execute(queryActividades, params);

        // --- CONSULTA 3: Últimos 10 Registros ---

        return res.status(200).json({
            status: 'success',
            cuadrilla: cuadrillaRows[0] || { total_trabajos: 0, total_monto: 0 },
            actividades: actividadesRows,
            ultimos: ultimosRows
        });

    } catch (err) {
        console.error('Error en obtener-ultimos-registros:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
};