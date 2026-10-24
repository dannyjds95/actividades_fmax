const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

        const [usuarios] = await connection.execute(
            `SELECT u.user_id, u.user_nombre, u.user_usuario, u.user_ci, u.user_cargo, 
                    u.user_telefono, u.user_estado, u.cuad_id, c.cuad_nombre 
             FROM usuarios u 
             LEFT JOIN cuadrilla c ON u.cuad_id = c.cuad_id 
             ORDER BY u.user_id ASC`
        );

        return res.status(200).json({ status: 'success', usuarios });

    } catch (error) {
        console.error('Error DB:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    } finally {
        if (connection) await connection.end();
    }
};