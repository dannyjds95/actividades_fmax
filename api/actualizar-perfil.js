const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // 🎯 1. Cabeceras CORS Universales
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST' && req.method !== 'PUT') {
        return res.status(405).json({ status: 'error', message: 'Método no permitido' });
    }

    let connection;
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        const userId = body.user_id || body.id;
        const nombre = body.user_nombre || body.nombre;
        const cedula = body.user_ci || body.cedula;
        const telefono = body.user_telefono || body.telefono;
        const direccion = body.user_direccion || body.direccion;
        const sector = body.user_sector || body.sector;
        const cargo = body.user_cargo || body.cargo;
        const cuadId = body.cuad_id;

        // 🎯 Función de limpieza numérica estricta (previene que NaN se convierta en 0)
        const parseNum = (val) => {
            if (val === undefined || val === null || val === '') return null;
            const strClean = String(val).replace(/[^0-9.-]+/g, '');
            const parsed = parseFloat(strClean);
            return isNaN(parsed) ? null : parsed;
        };

        const valorAct = parseNum(body.valor_act);
        const valorVisita = parseNum(body.valor_visita);
        const valorPred = parseNum(body.valor_pred);
        const valorAc = parseNum(body.valor_ac);
        const valorExc = parseNum(body.valor_exc);

        if (!userId) {
            return res.status(400).json({ status: 'error', message: 'ID de usuario no proporcionado' });
        }

        if (!nombre) {
            return res.status(400).json({ status: 'error', message: 'El nombre es obligatorio' });
        }

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000,
            user: process.env.DB_USER || '2ji5HdpY4sfmZMo.root',
            password: process.env.DB_PASSWORD || 'tQPdtsQdqHSASOp6',
            database: process.env.DB_NAME || 'actividades2',
            ssl: { rejectUnauthorized: false }
        });

        // 🎯 Limpieza de enteros para user_ci y user_telefono (tipos INT en la tabla usuarios)
        const cleanInt = (val) => {
            if (!val) return null;
            const cleanStr = String(val).replace(/\D/g, '');
            const parsed = parseInt(cleanStr, 10);
            return isNaN(parsed) ? null : parsed;
        };

        // 🎯 UPDATE seguro utilizando COALESCE
        await connection.execute(
            `UPDATE usuarios 
             SET user_nombre = ?, 
                 user_ci = ?, 
                 user_telefono = ?, 
                 user_direccion = ?,
                 user_sector = COALESCE(?, user_sector),
                 user_cargo = COALESCE(?, user_cargo),
                 cuad_id = COALESCE(?, cuad_id),
                 valor_act = COALESCE(?, valor_act),
                 valor_visita = COALESCE(?, valor_visita),
                 valor_pred = COALESCE(?, valor_pred),
                 valor_ac = COALESCE(?, valor_ac),
                 valor_exc = COALESCE(?, valor_exc)
             WHERE user_id = ?`,
            [
                nombre.trim(),
                cleanInt(cedula),
                cleanInt(telefono),
                direccion ? direccion.trim() : null,
                sector ? sector.trim() : null,
                cargo ? cargo.trim() : null,
                cuadId ? Number(cuadId) : null,
                valorAct,
                valorVisita,
                valorPred,
                valorAc,
                valorExc,
                Number(userId)
            ]
        );

        return res.status(200).json({ 
            status: 'success', 
            message: 'Perfil actualizado correctamente' 
        });

    } catch (error) {
        console.error('Error DB:', error);
        return res.status(500).json({ status: 'error', message: error.message || 'Error en el servidor' });
    } finally {
        if (connection) await connection.end();
    }
};