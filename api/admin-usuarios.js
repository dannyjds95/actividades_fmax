const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // 🎯 1. Cabeceras CORS Universales
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT, DELETE');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Responder 200 OK de inmediato al Preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000,
            user: process.env.DB_USER || '2ji5HdpY4sfmZMo.root',
            password: process.env.DB_PASSWORD || 'tQPdtsQdqHSASOp6',
            database: process.env.DB_NAME || 'actividades2',
            ssl: { rejectUnauthorized: false }
        });

        // -------------------------------------------------------------
        // 1. OBTENER USUARIOS CON TARIFAS Y EMPRESA (GET)
        // -------------------------------------------------------------
        if (req.method === 'GET') {
            const { id } = req.query;

            // 🎯 Incluye los valores numéricos y tarifas de la cuadrilla
            const sqlBase = `
                SELECT 
                    u.user_id, 
                    u.user_nombre, 
                    u.user_usuario, 
                    u.user_ci, 
                    u.user_cargo, 
                    u.user_telefono, 
                    u.user_direccion, 
                    u.user_estado, 
                    u.cuad_id, 
                    u.id_empresa, 
                    e.emp_razon AS empresa,
                    c.cuad_nombre,
                    c.cuad_valor_act AS valor_act,
                    c.cuad_valor_visita AS valor_visita,
                    c.cuad_valor_pred AS valor_pred,
                    c.cuad_valor_ac AS valor_ac,
                    c.cuad_valor_exc AS valor_exc,
                    c.cuad_excedente AS excedente
                FROM usuarios u 
                LEFT JOIN cuadrilla c ON u.cuad_id = c.cuad_id
                LEFT JOIN empresa e ON u.id_empresa = e.emp_id
            `;

            // Caso A: Un solo usuario por ID (para perfil.js)
            if (id) {
                const [rows] = await connection.execute(`${sqlBase} WHERE u.user_id = ?`, [id]);

                if (rows.length === 0) {
                    return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
                }

                return res.status(200).json({ status: 'success', usuario: rows[0] });
            }

            // Caso B: Todos los usuarios (para la tabla de administración)
            const [usuarios] = await connection.execute(`${sqlBase} ORDER BY u.user_id ASC`);
            return res.status(200).json({ status: 'success', usuarios });
        }

        // -------------------------------------------------------------
        // 2. GUARDAR O EDITAR USUARIO (POST / PUT)
        // -------------------------------------------------------------
        if (req.method === 'POST' || req.method === 'PUT') {
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
                user_telefono,
                user_direccion
            } = bodyData;

            if (!user_nombre || !user_usuario) {
                return res.status(400).json({ status: 'error', message: 'Nombre y usuario son obligatorios' });
            }

            if (user_id) {
                if (user_password && user_password.trim() !== '') {
                    await connection.execute(
                        `UPDATE usuarios 
                         SET user_nombre = ?, user_ci = ?, user_usuario = ?, user_password = ?, 
                             user_cargo = ?, cuad_id = ?, id_empresa = ?, user_telefono = ?, user_direccion = ? 
                         WHERE user_id = ?`,
                        [
                            user_nombre.trim(),
                            user_ci || null,
                            user_usuario.trim(),
                            user_password.trim(),
                            user_cargo || 'TECNICO',
                            cuad_id || null,
                            id_empresa || 1,
                            user_telefono || null,
                            user_direccion || null,
                            user_id
                        ]
                    );
                } else {
                    await connection.execute(
                        `UPDATE usuarios 
                         SET user_nombre = ?, user_ci = ?, user_usuario = ?, 
                             user_cargo = ?, cuad_id = ?, id_empresa = ?, user_telefono = ?, user_direccion = ? 
                         WHERE user_id = ?`,
                        [
                            user_nombre.trim(),
                            user_ci || null,
                            user_usuario.trim(),
                            user_cargo || 'TECNICO',
                            cuad_id || null,
                            id_empresa || 1,
                            user_telefono || null,
                            user_direccion || null,
                            user_id
                        ]
                    );
                }
                return res.status(200).json({ status: 'success', message: 'Usuario actualizado correctamente' });
            } else {
                await connection.execute(
                    `INSERT INTO usuarios (user_nombre, user_ci, user_usuario, user_password, user_cargo, cuad_id, id_empresa, user_telefono, user_direccion, user_estado) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                    [
                        user_nombre.trim(),
                        user_ci || null,
                        user_usuario.trim(),
                        user_password && user_password.trim() !== '' ? user_password.trim() : '123456',
                        user_cargo || 'TECNICO',
                        cuad_id || null,
                        id_empresa || 1,
                        user_telefono || null,
                        user_direccion || null
                    ]
                );
                return res.status(200).json({ status: 'success', message: 'Usuario guardado correctamente' });
            }
        }

        // -------------------------------------------------------------
        // 3. ELIMINAR USUARIO (DELETE)
        // -------------------------------------------------------------
        if (req.method === 'DELETE') {
            const bodyData = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
            const id = req.query.id || bodyData.user_id;

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