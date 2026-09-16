const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
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

        if (inicio && fin && inicio !== 'undefined' && fin !== 'undefined' && inicio !== 'null') {
            whereClause = ' WHERE act_fecha BETWEEN ? AND ?';
            params = [inicio, fin];
        }

        let cuadrillaData = { total_trabajos: 0, total_monto: 0 };
        let actividadesData = [];
        let ultimosData = [];

        // 1. Resumen por Cuadrilla
        try {
            const [q1] = await connection.execute(
                `SELECT COUNT(*) AS total_trabajos, COALESCE(SUM(act_valor), 0) AS total_monto FROM actividad_detalle ${whereClause}`,
                params
            );
            if (q1.length > 0) cuadrillaData = q1[0];
        } catch (e1) {
            console.error('Error Q1:', e1.message);
        }

        // 2. Detalle de Actividades por Tipo
        try {
            const [q2] = await connection.execute(
                `SELECT COALESCE(act_tipo, 'GENERAL') AS tipo, COUNT(*) AS registros, COALESCE(SUM(act_valor), 0) AS monto FROM actividad_detalle ${whereClause} GROUP BY act_tipo ORDER BY monto DESC`,
                params
            );
            actividadesData = q2;
        } catch (e2) {
            console.error('Error Q2:', e2.message);
        }

        // 3. Últimos 10 Registros (Lectura completa flexible para evitar fallos de columnas)
        try {
            const [q3] = await connection.execute(
                `SELECT * FROM actividad_detalle ${whereClause} ORDER BY act_fecha DESC LIMIT 10`,
                params
            );

            ultimosData = q3.map(row => ({
                fecha: row.act_fecha || row.fecha || '',
                cuadrilla: row.act_cuadrilla || row.cuadrilla || 'PROPIA',
                cliente: row.act_cliente || row.cliente || row.nombre_cliente || row.nom_cliente || 'N/A',
                tipo: row.act_tipo || row.tipo || 'GENERAL',
                forma: row.act_forma || row.forma || row.forma_pago || 'NORMAL',
                monto: row.act_valor || row.valor || row.monto || 0
            }));
        } catch (e3) {
            console.error('Error Q3:', e3.message);
        }

        return res.status(200).json({
            status: 'success',
            cuadrilla: cuadrillaData,
            actividades: actividadesData,
            ultimos: ultimosData
        });

    } catch (err) {
        console.error('Fallo general:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
};