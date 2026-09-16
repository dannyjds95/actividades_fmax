const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // Configuración completa de cabeceras CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responder inmediatamente con 200 OK a la verificación PREFLIGHT (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Método no permitido' });
    }

    let connection;
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        
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

        const cuadIdNum = isNaN(parseInt(cuad_id)) ? 0 : parseInt(cuad_id);

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000,
            user: process.env.DB_USER || '2ji5HdpY4sfmZMo.root',
            password: process.env.DB_PASSWORD || 'tQPdtsQdqHSASOp6',
            database: process.env.DB_NAME || 'actividades2',
            ssl: { rejectUnauthorized: false }
        });

        const query = `
            INSERT INTO actividad_detalle (
                user_id, act_cliente, act_fecha, cuad_id, act_sector,
                act_tipo, act_forma, act_cantidad, act_valor, act_fibra,
                act_pred, act_pred_valor, act_ac, act_ac_valor,
                act_excedente, act_excedente_valor, act_total,
                act_detalle, act_valores_cobrados
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            user_id, act_cliente || '', act_fecha, cuadIdNum, act_sector || '',
            act_tipo || '', act_forma || '', act_cantidad || 1, act_valor || 0,
            act_fibra || 0, act_pred || 0, act_pred_valor || 0, act_ac || 0,
            act_ac_valor || 0, act_excedente || 0, act_excedente_valor || 0,
            act_total || 0, act_detalle || '', act_valores_cobrados || 0
        ];

        await connection.execute(query, values);

        return res.status(200).json({ status: 'success', message: 'Actividad registrada' });

    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    } finally {
        if (connection) await connection.end();
    }
};