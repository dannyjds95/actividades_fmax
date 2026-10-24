const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // 1. Cabeceras CORS asignadas en la primera línea (evita bloqueos de preflight)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 2. Responder 200 OK inmediatamente al preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Método no permitido' });
    }

    let connection;
    try {
        // Parsear body si viene como String o como Objeto
        const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { cuad_id, cuad_nombre, cuad_sector } = bodyData;

        if (!cuad_nombre || !cuad_nombre.trim()) {
            return res.status(400).json({ status: 'error', message: 'El nombre de la cuadrilla es requerido' });
        }

        connection = await mysql.createConnection({
            host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: 4000,
            user: '2ji5HdpY4sfmZMo.root',
            password: 'tQPdtsQdqHSASOp6',
            database: 'actividades2',
            ssl: { rejectUnauthorized: false }
        });

        if (cuad_id) {
            await connection.execute(
                `UPDATE cuadrilla SET cuad_nombre = ?, cuad_sector = ? WHERE cuad_id = ?`,
                [cuad_nombre.trim(), cuad_sector ? cuad_sector.trim() : null, cuad_id]
            );
        } else {
            await connection.execute(
                `INSERT INTO cuadrilla (cuad_nombre, cuad_sector) VALUES (?, ?)`,
                [cuad_nombre.trim(), cuad_sector ? cuad_sector.trim() : null]
            );
        }

        return res.status(200).json({ status: 'success', message: 'Cuadrilla guardada correctamente' });

    } catch (error) {
        console.error('Error DB:', error);
        return res.status(500).json({ status: 'error', message: error.message || 'Error interno en el servidor' });
    } finally {
        if (connection) await connection.end();
    }
};