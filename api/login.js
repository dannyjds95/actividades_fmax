const mysql = require('mysql2/promise');

export default async function handler(req, res) {
    // Permite conexiones desde cualquier origen (Live Server, GitHub Pages, Vercel)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde exitosamente a la verificación previa que hace el navegador (preflight request)
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

        const [rows] = await connection.execute(
            `SELECT 
                user_id AS id,
                user_nombre AS nombre,
                user_usuario,
                user_cargo AS cargo,
                id_empresa AS empresa,
                user_ci AS cedula,
                user_telefono AS telefono,
                user_direccion AS direccion,
                user_sector AS sector,
                valor_act,
                valor_visita,
                valor_pred,
                valor_ac,
                valor_exc,
                excedente
            FROM usuarios 
            WHERE user_usuario = ? AND user_password = ? AND user_estado = 1`,
            [user_usuario, user_password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Usuario o contraseña incorrectos' });
        }

        const user = rows[0];

        return res.status(200).json({
            status: 'success',
            message: 'Inicio de sesión exitoso',
            user
        });

    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    } finally {
        if (connection) await connection.end();
    }
}