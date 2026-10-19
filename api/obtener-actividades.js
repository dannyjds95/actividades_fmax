const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // Cabeceras CORS y Content-Type
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 1. Extraer 'cliente' (o 'sector' como alternativa) de la URL
    const { inicio, fin, tipo, cliente, sector, cobradas } = req.query;

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

        // 2. Filtro de Rango de Fechas
        if (inicio && fin && inicio !== 'undefined' && fin !== 'undefined' && inicio !== 'null') {
            conditions.push('a.act_fecha BETWEEN ? AND ?');
            params.push(inicio, fin);
        }

        // 3. Filtro por Tipo (INSTALACION, TRASLADO, VISITA)
        if (tipo && tipo !== 'TODOS' && tipo.trim() !== '') {
            conditions.push('a.act_tipo = ?');
            params.push(tipo);
        }

        // 4. Búsqueda por Nombre de Cliente (Soporta 'cliente' o 'sector')
        const terminoCliente = (cliente || sector || '').trim();
        if (terminoCliente !== '') {
            conditions.push('a.act_cliente LIKE ?');
            params.push(`%${terminoCliente}%`);
        }

        // 5. Filtro por Valores Cobrados
        if (cobradas === 'si') {
            conditions.push('CAST(COALESCE(a.act_valores_cobrados, 0) AS DECIMAL(10,2)) > 0');
        } else if (cobradas === 'no') {
            conditions.push('CAST(COALESCE(a.act_valores_cobrados, 0) AS DECIMAL(10,2)) = 0');
        }

        const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

        // 🔍 Consulta con LEFT JOIN para obtener el campo 'cuad_nombre' de la tabla 'cuadrilla'
        const query = `
            SELECT a.*, c.cuad_nombre 
            FROM actividad_detalle a 
            LEFT JOIN cuadrilla c ON a.cuad_id = c.cuad_id 
            ${whereClause} 
            ORDER BY a.act_fecha DESC
        `;

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