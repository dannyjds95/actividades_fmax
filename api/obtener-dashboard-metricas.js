const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { inicio, fin } = req.query;

    if (!inicio || !fin || inicio === 'undefined' || fin === 'undefined') {
        return res.status(400).json({ status: 'error', message: 'Rango de fechas no válido' });
    }

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

        const query = `
            SELECT 
                COALESCE(SUM(act_valor), 0) AS monto_facturado,
                COALESCE(SUM(act_cantidad), 0) AS total_actividades,
                COUNT(*) AS registros_guardados,
                COALESCE(SUM(act_excedente), 0) AS excedente_m,
                COALESCE(SUM(act_excedente_valor), 0) AS excedente_valor,
                COALESCE(SUM(act_pred), 0) AS puntos_red,
                COALESCE(SUM(act_ac), 0) AS equipos_ac
            FROM actividad_detalle
            WHERE act_fecha BETWEEN ? AND ?
        `;

        const [rows] = await connection.execute(query, [inicio, fin]);

        return res.status(200).json({
            status: 'success',
            metricas: rows[0]
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    } finally {
        if (connection) await connection.end();
    }
};