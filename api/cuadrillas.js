const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
    // Cabeceras CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

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

        // 1. OBTENER CUADRILLAS (GET)
        if (req.method === 'GET') {
            const [cuadrillas] = await connection.execute(
                `SELECT cuad_id, cuad_nombre, COALESCE(cuad_sector, 'Sin Sector') AS cuad_sector 
                 FROM cuadrilla ORDER BY cuad_id ASC`
            );
            return res.status(200).json({ status: 'success', cuadrillas });
        }

        // 2. GUARDAR / EDITAR CUADRILLA (POST)
        if (req.method === 'POST') {
            const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            const { cuad_id, cuad_nombre, cuad_sector } = bodyData;

            if (!cuad_nombre || !cuad_nombre.trim()) {
                return res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
            }

            if (cuad_id) {
                await connection.execute(
                    `UPDATE cuadrilla SET cuad_nombre = ?, cuad_sector = ? WHERE cuad_id = ?`,
                    [cuad_nombre.trim(), cuad_sector ? cuad_sector.trim() : null, cuad_id]
                );
            } else {
                await connection.execute(
                    `INSERT INTO cuadrilla (cuad_nombre, cuad_sector) VALUES (?, ?)`,
                    [cuad_nombre.trim(), cuad_sector ? cuad_sector.trim() : null]
                );
            }
            return res.status(200).json({ status: 'success', message: 'Cuadrilla guardada correctamente' });
        }

        // 3. ELIMINAR CUADRILLA (DELETE)
        if (req.method === 'DELETE') {
            const id = req.query.id;
            if (!id) {
                return res.status(400).json({ status: 'error', message: 'ID de cuadrilla no especificado' });
            }
            await connection.execute(`DELETE FROM cuadrilla WHERE cuad_id = ?`, [id]);
            return res.status(200).json({ status: 'success', message: 'Cuadrilla eliminada' });
        }

        return res.status(405).json({ status: 'error', message: 'Método no permitido' });

    } catch (error) {
        console.error('Error DB:', error);
        return res.status(500).json({ status: 'error', message: error.message || 'Error en la base de datos' });
    } finally {
        if (connection) await connection.end();
    }
};