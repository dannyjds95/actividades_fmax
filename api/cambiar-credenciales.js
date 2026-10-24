const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Método no permitido' });
    }

    let connection;
    try {
        const { id, user_usuario, current_password, new_password } = req.body || {};

        if (!id || !user_usuario || !current_password) {
            return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios' });
        }

        connection = await mysql.createConnection({
            host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: 4000,
            user: '2ji5HdpY4sfmZMo.root',
            password: 'tQPdtsQdqHSASOp6',
            database: 'actividades2',
            ssl: { rejectUnauthorized: false }
        });

        // 1. Verificar que la contraseña actual sea correcta
        const [userCheck] = await connection.execute(
            `SELECT user_id FROM usuarios WHERE user_id = ? AND user_password = ?`,
            [id, current_password]
        );

        if (userCheck.length === 0) {
            return res.status(401).json({ status: 'error', message: 'La contraseña actual es incorrecta' });
        }

        // 2. Verificar que el nuevo nombre de usuario no lo tenga otra persona
        const [duplicateCheck] = await connection.execute(
            `SELECT user_id FROM usuarios WHERE user_usuario = ? AND user_id != ?`,
            [user_usuario, id]
        );

        if (duplicateCheck.length > 0) {
            return res.status(400).json({ status: 'error', message: 'El nombre de usuario ya está en uso' });
        }

        // 3. Definir contraseña final (mantener la actual si no se envió nueva)
        const finalPassword = new_password && new_password.trim() !== '' ? new_password : current_password;

        // 4. Actualizar usuario en la BD
        await connection.execute(
            `UPDATE usuarios SET user_usuario = ?, user_password = ? WHERE user_id = ?`,
            [user_usuario, finalPassword, id]
        );

        return res.status(200).json({ status: 'success', message: 'Credenciales actualizadas exitosamente' });

    } catch (error) {
        console.error('Error DB:', error);
        return res.status(500).json({ status: 'error', message: error.message || 'Error en el servidor' });
    } finally {
        if (connection) await connection.end();
    }
};