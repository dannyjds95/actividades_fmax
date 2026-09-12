const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Método no permitido' });

    let connection;
    try {
        const { id, nombre, cedula, telefono, direccion, valor_act, valor_visita, valor_pred, valor_ac, valor_exc } = req.body || {};

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'ID de usuario no proporcionado' });
        }

        connection = await mysql.createConnection({
            host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: 4000,
            user: '2ji5HdpY4sfmZMo.root',
            password: 'tQPdtsQdqHSASOp6',
            database: 'actividades2',
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