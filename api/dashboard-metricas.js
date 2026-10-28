const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // Cabeceras CORS y Content-Type
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 1. Extraer filtros de fecha y datos de sesión (user_id, user_cargo, cuad_id)
    const { inicio, fin, user_id, user_cargo, cuad_id } = req.query;

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

        // 2. Filtro de Seguridad por Cuadrilla / Usuario / Cargo
        if (user_cargo !== 'ADMINISTRADOR' && user_cargo !== 'SUPERVISOR') {
            if (cuad_id && cuad_id !== 'null' && cuad_id !== 'undefined' && cuad_id !== '0') {
                conditions.push('cuad_id = ?');
                params.push(cuad_id);
            } else if (user_id && user_id !== 'null' && user_id !== 'undefined') {
                conditions.push('user_id = ?');
                params.push(user_id);
            }
        } else {
            if (cuad_id && cuad_id !== 'TODOS' && cuad_id !== 'null' && cuad_id !== 'undefined') {
                conditions.push('cuad_id = ?');
                params.push(cuad_id);
            } else if (user_id && user_id !== 'TODOS' && user_id !== 'null' && user_id !== 'undefined') {
                conditions.push('user_id = ?');
                params.push(user_id);
            }
        }

        // 3. Filtro por Rango de Fechas
        if (inicio && fin && inicio !== 'undefined' && fin !== 'undefined' && inicio !== 'null') {
            conditions.push('act_fecha BETWEEN ? AND ?');
            params.push(inicio, fin);
        }

        const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

        // --- CONSULTA 1: Métricas Principales (Tarjetas Superiores) ---
        const queryMetricas = `
            SELECT 
                COALESCE(SUM(COALESCE(act_total, act_valor, 0)), 0) AS monto_facturado,
                COALESCE(SUM(act_cantidad), 0) AS total_actividades,
                COUNT(*) AS registros_guardados,
                COALESCE(SUM(act_excedente), 0) AS excedente_m,
                COALESCE(SUM(act_excedente_valor), 0) AS excedente_valor,
                COALESCE(SUM(act_pred), 0) AS puntos_red,
                COALESCE(SUM(act_ac), 0) AS equipos_ac,
                COALESCE(SUM(CAST(COALESCE(act_valores_cobrados, 0) AS DECIMAL(10,2))), 0) AS valores_cobrados
            FROM actividad_detalle
            ${whereClause}
        `;
        const [metricasRows] = await connection.execute(queryMetricas, params);

        // --- CONSULTA 2: Resumen Cuadrilla / Trabajos ---
        const queryCuadrilla = `
            SELECT 
                COUNT(*) AS total_trabajos, 
                COALESCE(SUM(COALESCE(act_total, act_valor, 0)), 0) AS total_monto 
            FROM actividad_detalle
            ${whereClause}
        `;
        const [cuadrillaRows] = await connection.execute(queryCuadrilla, params);

        // --- CONSULTA 3: Detalle por Tipo de Actividad ---
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

        // --- CONSULTA 4: Últimos 10 Registros ---
        const queryUltimos = `
            SELECT 
                act_id AS id, 
                act_fecha AS fecha, 
                act_cliente AS cliente, 
                act_tipo AS tipo, 
                act_forma AS forma, 
                COALESCE(act_total, act_valor, 0) AS monto 
            FROM actividad_detalle
            ${whereClause}
            ORDER BY act_fecha DESC, act_id DESC 
            LIMIT 10
        `;
        const [ultimosRows] = await connection.execute(queryUltimos, params);

        // --- CONSULTA 5: Lista Detallada Completa (Para los Pop-ups Modal) ---
        const queryListaDetallada = `
            SELECT 
                act_id AS id,
                act_fecha AS fecha,
                act_cliente AS cliente,
                act_tipo AS tipo,
                COALESCE(act_tipo, 'INSTALACION') AS tipo_instalacion,
                COALESCE(act_cantidad, 1) AS cantidad,
                COALESCE(act_total, act_valor, 0) AS total,
                COALESCE(act_excedente, 0) AS excedente,
                COALESCE(act_pred, 0) AS puntos_red,
                COALESCE(act_ac, 0) AS ac,
                COALESCE(CAST(COALESCE(act_valores_cobrados, 0) AS DECIMAL(10,2)), 0) AS valores_cobrados
            FROM actividad_detalle
            ${whereClause}
            ORDER BY act_fecha DESC, act_id DESC
        `;
        const [listaDetalladaRows] = await connection.execute(queryListaDetallada, params);

        // Respuesta unificada
        return res.status(200).json({
            status: 'success',
            metricas: metricasRows[0] || {},
            cuadrilla: cuadrillaRows[0] || { total_trabajos: 0, total_monto: 0 },
            actividades: actividadesRows,
            ultimos: ultimosRows,
            lista_detallada: listaDetalladaRows
        });

    } catch (err) {
        console.error('Error en API Dashboard Unificada:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
};