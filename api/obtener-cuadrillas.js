const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: 4000,
            user: '2ji5HdpY4sfmZMo.root',
            password: 'tQPdtsQdqHSASOp6',
            database: 'actividades2',
            ssl: { rejectUnauthorized: false }
        });

        // 🎯 Incluimos cuad_sector y fecha_creacion
        const [cuadrillas] = await connection.execute(
            `SELECT cuad_id, cuad_nombre, cuad_sector, fecha_creacion FROM cuadrilla ORDER BY cuad_id ASC`
        );

        return res.status(200).json({ status: 'success', cuadrillas });
    } catch (error) {
        console.error('Error DB:', error);
        return res.status(500).json({ status: 'error', message: 'Error al consultar cuadrillas' });
    } finally {
        if (connection) await connection.end();
    }
};