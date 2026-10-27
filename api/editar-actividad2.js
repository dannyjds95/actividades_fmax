const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const body = req.body || {};

    // Extraer campos con sanitización estricta (evita valores 'undefined')
    const act_id = body.act_id || body.id;
    const act_fecha = body.act_fecha || body.fecha || null;
    const cuad_id = (body.cuad_id !== undefined && body.cuad_id !== null && body.cuad_id !== '' && body.cuad_id !== 0) 
        ? Number(body.cuad_id) 
        : null;

    const act_cliente = body.act_cliente || body.cliente || 'NO DEFINIDO';
    const act_sector = body.act_sector || body.sector || 'NORTE';
    const act_tipo = body.act_tipo || body.tipo || 'INSTALACION';
    const act_forma = body.act_forma || body.forma || 'NORMAL';

    // Valores calculados
    const act_cantidad = Number(body.act_cantidad ?? body.cantidad ?? 1);
    const act_valor = Number(body.act_valor ?? body.valor ?? 0);
    const act_fibra = Number(body.act_fibra ?? body.fibra ?? 0);
    const act_excedente = Number(body.act_excedente ?? body.excedente ?? 0);
    const act_excedente_valor = Number(body.act_excedente_valor ?? 0);
    const act_pred = Number(body.act_pred ?? body.pt_red ?? 0);
    const act_pred_valor = Number(body.act_pred_valor ?? 0);
    const act_ac = Number(body.act_ac ?? body.ac ?? 0);
    const act_ac_valor = Number(body.act_ac_valor ?? 0);

    // 🎯 TOTAL CALCULADO (Se obtiene desde act_total, total o total_actividad)
    const act_total = Number(body.act_total ?? body.total ?? body.total_actividad ?? 0);

    const act_valores_cobrados = Number(body.act_valores_cobrados ?? body.valores_cobrados ?? 0);
    const act_detalle = body.act_detalle || body.detalle || '';

    if (!act_id) {
        return res.status(400).json({ status: 'error', message: 'ID de actividad requerido para actualizar.' });
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

        const query = `
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

        const [result] = await connection.execute(query, [
            act_fecha,
            cuad_id,
            act_cliente,
            act_sector,
            act_tipo,
            act_forma,
            act_cantidad,
            act_valor,
            act_fibra,
            act_excedente,
            act_excedente_valor,
            act_pred,
            act_pred_valor,
            act_ac,
            act_ac_valor,
            act_total,                       
            act_valores_cobrados,
            act_detalle,
            act_id
        ]);

        return res.status(200).json({
            status: 'success',
            message: 'Actividad actualizada exitosamente.',
            affectedRows: result.affectedRows
        });

    } catch (err) {
        console.error('Error al editar actividad:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
};