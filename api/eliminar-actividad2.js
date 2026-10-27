const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // Cabeceras CORS y Content-Type
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Obtener ID desde Query Params o Body
    const id = req.query.id || (req.body && req.body.id);

    if (!id) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'El ID del registro es requerido.' 
        });
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

        // Eliminar registro por act_id
        const [result] = await connection.execute(
            'DELETE FROM actividad_detalle WHERE act_id = ?', 
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'No se encontró la actividad para eliminar.' 
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Actividad eliminada correctamente.'
        });

    } catch (err) {
        console.error('Error al eliminar actividad:', err.message);
        return res.status(500).json({ status: 'error', message: err.message });
    } finally {
        if (connection) {
            try { await connection.end(); } catch (e) {}
        }
    }
};