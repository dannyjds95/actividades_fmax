const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // 1. Cabeceras CORS (sin conflicto entre Allow-Credentials y Origin: '*')
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Manejo de petición preflight (CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Método no permitido' });
    }

    let connection;
    try {
        // 2. Garantizar el parseo del cuerpo de la petición
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { id, nombre, cedula, telefono, direccion, valor_act, valor_visita, valor_pred, valor_ac, valor_exc } = body;

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'ID de usuario no proporcionado' });
        }

        // 3. Conexión usando variables de entorno o valores por defecto
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000,
            user: process.env.DB_USER || '2ji5HdpY4sfmZMo.root',
            password: process.env.DB_PASSWORD || 'tQPdtsQdqHSASOp6',
            database: process.env.DB_NAME || 'actividades2',
            ssl: { rejectUnauthorized: false }
        });

        await connection.execute(
            `UPDATE usuarios 
             SET user_nombre = ?, user_ci = ?, user_telefono = ?, user_direccion = ?,
                 valor_act = ?, valor_visita = ?, valor_pred = ?, valor_ac = ?, valor_exc = ?
             WHERE user_id = ?`,
            [nombre, cedula, telefono, direccion, valor_act, valor_visita, valor_pred, valor_ac, valor_exc, id]
        );

        return res.status(200).json({ status: 'success', message: 'Perfil actualizado correctamente' });

    } catch (error) {
        console.error('Error DB:', error);
        return res.status(500).json({ status: 'error', message: error.message || 'Error en el servidor' });
    } finally {
        if (connection) await connection.end();
    }
};