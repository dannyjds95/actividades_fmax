const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2ji5HdpY4sfmZMo.root',
    password: 'tQPdtsQdqHSASOp6',
    database: 'actividades2',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
};

module.exports = async (req, res) => {
    // Permisos CORS para GitHub Pages
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Método no permitido' });
    }

    const { user_usuario, user_password } = req.body || {};

    if (!user_usuario || !user_password) {
        return res.status(400).json({ status: 'error', message: 'Por favor complete todos los campos' });
    }

    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT * FROM usuarios WHERE user_usuario = ? LIMIT 1',
            [user_usuario]
        );

        if (rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'El usuario no existe' });
        }

        const user = rows[0];

        if (!user.user_estado) {
            return res.status(403).json({ status: 'error', message: 'El usuario se encuentra inactivo' });
        }

        if (user.user_password === user_password) {
            return res.status(200).json({
                status: 'success',
                message: `¡Bienvenido/a ${user.user_nombre}!`,
                user: { id: user.user_id, nombre: user.user_nombre, cargo: user.user_cargo }
            });
        } else {
            return res.status(401).json({ status: 'error', message: 'Contraseña incorrecta' });
        }

    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Error en BD: ' + error.message });
    } finally {
        if (connection) await connection.end();
    }
};