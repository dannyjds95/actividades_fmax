const mysql = require('mysql2/promise');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const { user_usuario, user_password } = req.body;

    if (!user_usuario || !user_password) {
        return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
    }

    let connection;
    try {
        connection = await mysql.createConnection(process.env.DATABASE_URL);

        // Traemos todas las columnas existentes sin forzar nombres en SQL
        const [rows] = await connection.execute(
            `SELECT * FROM usuarios WHERE user_usuario = ? AND user_password = ? AND user_estado = 1`,
            [user_usuario, user_password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Usuario o contraseña incorrectos' });
        }

        const rawUser = rows[0];

        // Mapeo seguro con valores por defecto si el campo no existe en la tabla
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

        return res.status(200).json({
            status: 'success',
            message: 'Inicio de sesión exitoso',
            user
        });

    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Error interno del servidor' 
        });
    } finally {
        if (connection) await connection.end();
    }
}