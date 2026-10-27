const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // 1. Configuración de cabeceras CORS unificadas
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responder inmediatamente con 200 OK a las peticiones PREFLIGHT (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let connection;
    try {
        // Parsear body si viene serializado como string
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        // Conexión a la base de datos TiDB
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000,
            user: process.env.DB_USER || '2ji5HdpY4sfmZMo.root',
            password: process.env.DB_PASSWORD || 'tQPdtsQdqHSASOp6',
            database: process.env.DB_NAME || 'actividades2',
            ssl: { rejectUnauthorized: false }
        });

        // ==========================================
        // ROUTING SEGÚN EL MÉTODO HTTP
        // ==========================================

        switch (req.method) {

            // --------------------------------------
            // 🟢 GET: OBTENER / LISTAR ACTIVIDADES
            // --------------------------------------
            case 'GET': {
                const { inicio, fin, tipo, cliente, sector, cobradas, user_id, user_cargo, cuad_id } = req.query;
                let conditions = [];
                let params = [];

                // Filtro de Seguridad por Usuario / Cuadrilla / Role
                if (user_cargo !== 'ADMINISTRADOR' && user_cargo !== 'SUPERVISOR') {
                    if (cuad_id && cuad_id !== 'null' && cuad_id !== 'undefined' && cuad_id !== '0') {
                        conditions.push('a.cuad_id = ?');
                        params.push(cuad_id);
                    } else if (user_id && user_id !== 'null' && user_id !== 'undefined') {
                        conditions.push('a.user_id = ?');
                        params.push(user_id);
                    }
                } else {
                    if (cuad_id && cuad_id !== 'TODOS' && cuad_id !== 'null' && cuad_id !== 'undefined') {
                        conditions.push('a.cuad_id = ?');
                        params.push(cuad_id);
                    } else if (user_id && user_id !== 'TODOS' && user_id !== 'null' && user_id !== 'undefined') {
                        conditions.push('a.user_id = ?');
                        params.push(user_id);
                    }
                }

                // Filtro por Fechas
                if (inicio && fin && inicio !== 'undefined' && fin !== 'undefined' && inicio !== 'null') {
                    conditions.push('a.act_fecha BETWEEN ? AND ?');
                    params.push(inicio, fin);
                }

                // Filtro por Tipo
                if (tipo && tipo !== 'TODOS' && tipo.trim() !== '') {
                    conditions.push('a.act_tipo = ?');
                    params.push(tipo);
                }

                // Búsqueda por Cliente / Sector
                const terminoCliente = (cliente || sector || '').trim();
                if (terminoCliente !== '') {
                    conditions.push('a.act_cliente LIKE ?');
                    params.push(`%${terminoCliente}%`);
                }

                // Filtro por Valores Cobrados
                if (cobradas === 'si') {
                    conditions.push('CAST(COALESCE(a.act_valores_cobrados, 0) AS DECIMAL(10,2)) > 0');
                } else if (cobradas === 'no') {
                    conditions.push('CAST(COALESCE(a.act_valores_cobrados, 0) AS DECIMAL(10,2)) = 0');
                }

                const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

                const query = `
                    SELECT a.*, c.cuad_nombre 
                    FROM actividad_detalle a 
                    LEFT JOIN cuadrilla c ON a.cuad_id = c.cuad_id 
                    ${whereClause} 
                    ORDER BY a.act_fecha DESC, a.act_id DESC
                `;

                const [rows] = await connection.execute(query, params);

                return res.status(200).json({
                    status: 'success',
                    actividades: rows
                });
            }

            // --------------------------------------
            // 🟡 POST: CREAR NUEVA ACTIVIDAD
            // --------------------------------------
            case 'POST': {
                // Soporte por si se llama POST con un flag de UPDATE o DELETE
                if (body.action === 'UPDATE' || body._method === 'PUT') {
                    return actualizarActividad(connection, body, res);
                }
                if (body.action === 'DELETE' || body._method === 'DELETE') {
                    return eliminarActividad(connection, req.query.id || body.id || body.act_id, res);
                }

                const {
                    user_id, act_cliente, act_fecha, cuad_id, act_sector,
                    act_tipo, act_forma, act_cantidad, act_valor, act_fibra,
                    act_pred, act_pred_valor, act_ac, act_ac_valor,
                    act_excedente, act_excedente_valor, act_total,
                    act_detalle, act_valores_cobrados
                } = body;

                if (!user_id) {
                    return res.status(400).json({ status: 'error', message: 'Falta ID de usuario' });
                }

                // Obtener cuad_id directamente de la tabla usuarios si no viene en la petición
                const [userRows] = await connection.execute(
                    'SELECT cuad_id FROM usuarios WHERE user_id = ?',
                    [user_id]
                );

                let finalCuadId = null;
                if (userRows.length > 0 && userRows[0].cuad_id !== null) {
                    finalCuadId = userRows[0].cuad_id;
                } else if (cuad_id !== undefined && cuad_id !== null && !isNaN(parseInt(cuad_id))) {
                    finalCuadId = parseInt(cuad_id);
                }

                const queryInsert = `
                    INSERT INTO actividad_detalle (
                        user_id, act_cliente, act_fecha, cuad_id, act_sector,
                        act_tipo, act_forma, act_cantidad, act_valor, act_fibra,
                        act_pred, act_pred_valor, act_ac, act_ac_valor,
                        act_excedente, act_excedente_valor, act_total,
                        act_detalle, act_valores_cobrados
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const values = [
                    user_id, act_cliente || 'NO DEFINIDO', act_fecha, finalCuadId, act_sector || 'NORTE',
                    act_tipo || 'INSTALACION', act_forma || 'NORMAL', act_cantidad || 1, act_valor || 0,
                    act_fibra || 0, act_pred || 0, act_pred_valor || 0, act_ac || 0,
                    act_ac_valor || 0, act_excedente || 0, act_excedente_valor || 0,
                    act_total || 0, act_detalle || '', act_valores_cobrados || 0
                ];

                await connection.execute(queryInsert, values);

                return res.status(200).json({ status: 'success', message: 'Actividad registrada exitosamente.' });
            }

            // --------------------------------------
            // 🟠 PUT: ACTUALIZAR ACTIVIDAD
            // --------------------------------------
            case 'PUT': {
                return await actualizarActividad(connection, body, res);
            }

            // --------------------------------------
            // 🔴 DELETE: ELIMINAR ACTIVIDAD
            // --------------------------------------
            case 'DELETE': {
                const id = req.query.id || body.id || body.act_id;
                return await eliminarActividad(connection, id, res);
            }

            default:
                return res.status(405).json({ status: 'error', message: 'Método no permitido' });
        }

    } catch (err) {
        console.error('Error en API unificada de actividades:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
};

// ==========================================
// FUNCIONES AUXILIARES REUTILIZABLES
// ==========================================

async function actualizarActividad(connection, body, res) {
    const act_id = body.act_id || body.id;

    if (!act_id) {
        return res.status(400).json({ status: 'error', message: 'ID de actividad requerido para actualizar.' });
    }

    const act_fecha = body.act_fecha || body.fecha || null;
    const cuad_id = (body.cuad_id !== undefined && body.cuad_id !== null && body.cuad_id !== '' && body.cuad_id !== 0) 
        ? Number(body.cuad_id) 
        : null;

    const act_cliente = body.act_cliente || body.cliente || 'NO DEFINIDO';
    const act_sector = body.act_sector || body.sector || 'NORTE';
    const act_tipo = body.act_tipo || body.tipo || 'INSTALACION';
    const act_forma = body.act_forma || body.forma || 'NORMAL';

    const act_cantidad = Number(body.act_cantidad ?? body.cantidad ?? 1);
    const act_valor = Number(body.act_valor ?? body.valor ?? 0);
    const act_fibra = Number(body.act_fibra ?? body.fibra ?? 0);
    const act_excedente = Number(body.act_excedente ?? body.excedente ?? 0);
    const act_excedente_valor = Number(body.act_excedente_valor ?? 0);
    const act_pred = Number(body.act_pred ?? body.pt_red ?? 0);
    const act_pred_valor = Number(body.act_pred_valor ?? 0);
    const act_ac = Number(body.act_ac ?? body.ac ?? 0);
    const act_ac_valor = Number(body.act_ac_valor ?? 0);
    const act_total = Number(body.act_total ?? body.total ?? body.total_actividad ?? 0);
    const act_valores_cobrados = Number(body.act_valores_cobrados ?? body.valores_cobrados ?? 0);
    const act_detalle = body.act_detalle || body.detalle || '';

    const queryUpdate = `
        UPDATE actividad_detalle 
        SET 
            act_fecha = ?,
            cuad_id = ?,
            act_cliente = ?,
            act_sector = ?,
            act_tipo = ?,
            act_forma = ?,
            act_cantidad = ?,
            act_valor = ?,
            act_fibra = ?,
            act_excedente = ?,
            act_excedente_valor = ?,
            act_pred = ?,
            act_pred_valor = ?,
            act_ac = ?,
            act_ac_valor = ?,
            act_total = ?,                 
            act_valores_cobrados = ?,
            act_detalle = ?
        WHERE act_id = ?
    `;

    const [result] = await connection.execute(queryUpdate, [
        act_fecha, cuad_id, act_cliente, act_sector, act_tipo, act_forma,
        act_cantidad, act_valor, act_fibra, act_excedente, act_excedente_valor,
        act_pred, act_pred_valor, act_ac, act_ac_valor, act_total,
        act_valores_cobrados, act_detalle, act_id
    ]);

    return res.status(200).json({
        status: 'success',
        message: 'Actividad actualizada exitosamente.',
        affectedRows: result.affectedRows
    });
}

async function eliminarActividad(connection, id, res) {
    if (!id) {
        return res.status(400).json({ status: 'error', message: 'El ID del registro es requerido.' });
    }

    const [result] = await connection.execute(
        'DELETE FROM actividad_detalle WHERE act_id = ?', 
        [id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ status: 'error', message: 'No se encontró la actividad para eliminar.' });
    }

    return res.status(200).json({
        status: 'success',
        message: 'Actividad eliminada correctamente.'
    });
}