const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // Cabeceras CORS Universales
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responder 200 OK de inmediato al Preflight (OPTIONS)
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

        // -------------------------------------------------------------
        // 1. OBTENER USUARIOS (GET)
        // -------------------------------------------------------------
        if (req.method === 'GET') {
            const [usuarios] = await connection.execute(
                `SELECT u.user_id, u.user_nombre, u.user_usuario, u.user_ci, u.user_cargo, 
                        u.user_telefono, u.user_estado, u.cuad_id, c.cuad_nombre 
                 FROM usuarios u 
                 LEFT JOIN cuadrilla c ON u.cuad_id = c.cuad_id 
                 ORDER BY u.user_id ASC`
            );
            return res.status(200).json({ status: 'success', usuarios });
        }

        // -------------------------------------------------------------
        // 2. GUARDAR O EDITAR USUARIO (POST)
        // -------------------------------------------------------------
        if (req.method === 'POST') {
            const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            const {
                user_id,
                user_nombre,
                user_ci,
                user_usuario,
                user_password,
                user_cargo,
                cuad_id,
                id_empresa,
                user_telefono
            } = bodyData;

            if (!user_nombre || !user_usuario) {
                return res.status(400).json({ status: 'error', message: 'Nombre y usuario son obligatorios' });
            }

            if (user_id) {
                // Actualizar
                if (user_password && user_password.trim() !== '') {
                    await connection.execute(
                        `UPDATE usuarios 
                         SET user_nombre = ?, user_ci = ?, user_usuario = ?, user_password = ?, 
                             user_cargo = ?, cuad_id = ?, id_empresa = ?, user_telefono = ? 
                         WHERE user_id = ?`,
                        [user_nombre.trim(), user_ci, user_usuario.trim(), user_password.trim(), user_cargo, cuad_id || null, id_empresa || 1, user_telefono, user_id]
                    );
                } else {
                    await connection.execute(
                        `UPDATE usuarios 
                         SET user_nombre = ?, user_ci = ?, user_usuario = ?, 
                             user_cargo = ?, cuad_id = ?, id_empresa = ?, user_telefono = ? 
                         WHERE user_id = ?`,
                        [user_nombre.trim(), user_ci, user_usuario.trim(), user_cargo, cuad_id || null, id_empresa || 1, user_telefono, user_id]
                    );
                }
            } else {
                // Insertar nuevo usuario
                await connection.execute(
                    `INSERT INTO usuarios (user_nombre, user_ci, user_usuario, user_password, user_cargo, cuad_id, id_empresa, user_telefono, user_estado) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                    [user_nombre.trim(), user_ci, user_usuario.trim(), user_password ? user_password.trim() : '123456', user_cargo, cuad_id || null, id_empresa || 1, user_telefono]
                );
            }

            return res.status(200).json({ status: 'success', message: 'Usuario guardado correctamente' });
        }

        // -------------------------------------------------------------
        // 3. ELIMINAR / DESACTIVAR USUARIO (DELETE)
        // -------------------------------------------------------------
        if (req.method === 'DELETE') {
            const id = req.query.id;
            if (!id) {
                return res.status(400).json({ status: 'error', message: 'ID de usuario no proporcionado' });
            }
            await connection.execute(`DELETE FROM usuarios WHERE user_id = ?`, [id]);
            return res.status(200).json({ status: 'success', message: 'Usuario eliminado' });
        }

        return res.status(405).json({ status: 'error', message: 'Método no permitido' });

    } catch (error) {
        console.error('Error DB:', error);
        return res.status(500).json({ status: 'error', message: error.message || 'Error en la base de datos' });
    } finally {
        if (connection) await connection.end();
    }
};