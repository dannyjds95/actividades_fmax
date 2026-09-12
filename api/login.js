const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // Configuración CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Método no permitido' });
    }

    let connection;
    try {
        const { user_usuario, user_password } = req.body || {};

        if (!user_usuario || !user_password) {
            return res.status(400).json({ status: 'error', message: 'Usuario y contraseña requeridos' });
        }

        connection = await mysql.createConnection(process.env.DATABASE_URL);

        const [rows] = await connection.execute(
            `SELECT * FROM usuarios WHERE user_usuario = ? AND user_password = ? AND user_estado = 1`,
            [user_usuario, user_password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Usuario o contraseña incorrectos' });
        }

        const rawUser = rows[0];

        const user = {
            id: rawUser.user_id,
            nombre: rawUser.user_nombre,
            user_usuario: rawUser.user_usuario,
            cargo: rawUser.user_cargo,
            empresa: rawUser.id_empresa || 'No especificada',
            cedula: rawUser.user_ci || 'Sin registro',
            telefono: rawUser.user_telefono || 'Sin registro',
            direccion: rawUser.user_direccion || 'Sin registro',
            sector: rawUser.user_sector || 'Sin registro',
            valor_act: rawUser.valor_act || 0,
            valor_visita: rawUser.valor_visita || 0,
            valor_pred: rawUser.valor_pred || 0,
            valor_ac: rawUser.valor_ac || 0,
            valor_exc: rawUser.valor_exc || 0,
            excedente: rawUser.excedente || 'No especificado'
        };

        return res.status(200).json({ status: 'success', message: 'Login exitoso', user });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: error.message });
    } finally {
        if (connection) await connection.end();
    }
};