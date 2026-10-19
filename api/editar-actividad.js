const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const {
        act_id,
        act_fecha,
        cuad_id,
        act_cliente,
        act_sector,
        act_tipo,
        act_forma,
        act_fibra,
        act_excedente,
        act_pred,
        act_ac,
        act_valores_cobrados,
        act_detalle
    } = req.body || {};

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
                act_fibra = ?,
                act_excedente = ?,
                act_pred = ?,
                act_ac = ?,
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
            act_fibra,
            act_excedente,
            act_pred,
            act_ac,
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