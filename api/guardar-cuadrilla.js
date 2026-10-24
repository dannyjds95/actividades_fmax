const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Método no permitido' });
    }

    let connection;
    try {
        const { cuad_id, cuad_nombre, cuad_sector } = req.body || {};

        if (!cuad_nombre) {
            return res.status(400).json({ status: 'error', message: 'El nombre de la cuadrilla es requerido' });
        }

        connection = await mysql.createConnection({
            host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
            port: 4000,
            user: '2ji5HdpY4sfmZMo.root',
            password: 'tQPdtsQdqHSASOp6',
            database: 'actividades2',
            ssl: { rejectUnauthorized: false }
        });

        if (cuad_id) {
            // Actualizar cuadrilla existente
            await connection.execute(
                `UPDATE cuadrilla SET cuad_nombre = ?, cuad_sector = ? WHERE cuad_id = ?`,
                [cuad_nombre, cuad_sector || null, cuad_id]
            );
        } else {
            // Crear nueva cuadrilla
            await connection.execute(
                `INSERT INTO cuadrilla (cuad_nombre, cuad_sector, fecha_creacion) VALUES (?, ?, NOW())`,
                [cuad_nombre, cuad_sector || null]
            );
        }

        return res.status(200).json({ status: 'success', message: 'Cuadrilla guardada correctamente' });

    } catch (error) {
        console.error('Error DB:', error);
        return res.status(500).json({ status: 'error', message: error.message || 'Error al procesar en la base de datos' });
    } finally {
        if (connection) await connection.end();
    }
};