const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { inicio, fin } = req.query;

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

        let whereClause = '';
        let params = [];

        if (inicio && fin && inicio !== 'undefined' && fin !== 'undefined' && inicio !== 'null' && fin !== 'null') {
            whereClause = ' WHERE act_fecha BETWEEN ? AND ?';
            params = [inicio, fin];
        }

        // 1. Resumen por Cuadrilla
        const [cuadrillaRows] = await connection.execute(
            `SELECT COUNT(*) AS total_trabajos, COALESCE(SUM(act_valor), 0) AS total_monto FROM actividad_detalle ${whereClause}`,
            params
        );

        // 2. Desglose por Tipo de Actividad
        const [tiposRows] = await connection.execute(
            `SELECT COALESCE(act_tipo, 'SIN TIPO') AS tipo, COUNT(*) AS registros, COALESCE(SUM(act_valor), 0) AS monto FROM actividad_detalle ${whereClause} GROUP BY act_tipo ORDER BY monto DESC`,
            params
        );

        // 3. Últimos 10 Registros
        const [ultimosRows] = await connection.execute(
            `SELECT act_fecha AS fecha, COALESCE(act_cuadrilla, 'PROPIA') AS cuadrilla, COALESCE(act_cliente, 'N/A') AS cliente, COALESCE(act_tipo, 'GENERAL') AS tipo, COALESCE(act_forma, 'NORMAL') AS forma, COALESCE(act_valor, 0) AS monto FROM actividad_detalle ${whereClause} ORDER BY act_fecha DESC, id DESC LIMIT 10`,
            params
        );

        return res.status(200).json({
            status: 'success',
            cuadrilla: cuadrillaRows[0] || { total_trabajos: 0, total_monto: 0 },
            actividades: tiposRows || [],
            ultimos: ultimosRows || []
        });
    } catch (err) {
        console.error('Error en API:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    } finally {
        if (connection) await connection.end();
    }
};