const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // Cabeceras CORS y Content-Type
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { inicio, fin, tipo, sector, cobradas } = req.query;

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

        // 1. Filtro de Rango de Fechas
        if (inicio && fin && inicio !== 'undefined' && fin !== 'undefined' && inicio !== 'null') {
            conditions.push('act_fecha BETWEEN ? AND ?');
            params.push(inicio, fin);
        }

        // 2. Filtro por Tipo (INSTALACION, TRASLADO, VISITA)
        if (tipo && tipo !== 'TODOS') {
            conditions.push('act_tipo = ?');
            params.push(tipo);
        }

        // 3. Búsqueda por Sector o Cliente
        if (sector && sector.trim() !== '') {
            conditions.push('(act_cliente LIKE ? OR act_detalle LIKE ?)');
            params.push(`%${sector}%`, `%${sector}%`);
        }

        // 4. Filtro por Valores Cobrados
        if (cobradas === 'si') {
            conditions.push('CAST(COALESCE(act_valores_cobrados, 0) AS DECIMAL(10,2)) > 0');
        } else if (cobradas === 'no') {
            conditions.push('CAST(COALESCE(act_valores_cobrados, 0) AS DECIMAL(10,2)) = 0');
        }

        const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

        // Consulta sobre la tabla actividad_detalle
        const query = `SELECT * FROM actividad_detalle ${whereClause} ORDER BY act_fecha DESC`;

        const [rows] = await connection.execute(query, params);

        return res.status(200).json({
            status: 'success',
            actividades: rows
        });

    } catch (err) {
        console.error('Error en obtener-actividades:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
};