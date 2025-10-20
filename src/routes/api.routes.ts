import { Router, type Request, type Response } from 'express';
import type mysql from 'mysql2/promise';

import { type Enquete } from '../Interfaces/Enquete.js';

// Esta função cria e configura o roteador
export function createApiRouter(connection: mysql.Connection) {
    const router = Router();

    router.get('/enquetes', async (req: Request, res: Response) => {
        try {
            const [rows] = await connection.execute<Enquete[] & mysql.RowDataPacket[]>('SELECT * FROM enquete');
            res.json(rows);
        } catch (error) {
            console.error('Erro ao buscar enquetes:', error);
            res.status(500).send('Erro ao buscar dados');
        }
    });

    router.post('/enquetes', async (req: Request, res: Response) => {

        // console.log(req.body)
        const { titulo, descricao, data_inicio, data_termino, ativo, ip_address, opcoes } = req.body;

        if (!titulo || !data_inicio || !data_termino || !ip_address || !opcoes || !Array.isArray(opcoes) || opcoes.length < 3) {
            return res.status(400).json({ error: 'Não há informações suficientes.' });
        }

        try {

            const sqlEnqueteQuery = 'INSERT INTO enquete (titulo,descricao,data_inicio,data_termino,ativo,ip_address) VALUES (?, ?, ?, ?, ?, ?)';

            const [result] = await connection.execute<mysql.ResultSetHeader>(sqlEnqueteQuery, [
                titulo,
                descricao,
                data_inicio,
                data_termino,
                ativo != undefined ? ativo : false,
                ip_address
            ]);
            
            const sqlOptionsQuery = 'INSERT INTO opcoes (enquete_id, texto, num_vote) VALUES (?, ?, ?)';

            opcoes.forEach( async (op : any) => {
                await connection.execute<mysql.ResultSetHeader>(sqlOptionsQuery, [
                    result.insertId,
                    op.texto,
                    0
                ]);
            });

            res.status(201).json({
                message: 'Enquete criada com sucesso!',
                enquete: result,
            });
        
        } catch (error) {
            console.error('Erro ao criar enquete:', error);
            res.status(500).json({ error: 'Erro interno ao criar a enquete.' });
        }
    })

    
    router.delete('/enquetes/:id', async (req: Request, res: Response) => {
        
        const { id } = req.params;

        try {

            const sql = 'DELETE FROM enquete WHERE id = ?';
            const [result] = await connection.execute<mysql.ResultSetHeader>(sql, [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Enquete não encontrada.' });
            }

            res.status(200).json({ message: 'Enquete deletada com sucesso!' });
        
        } catch (error) {
            console.error('Erro ao deletar enquete:', error);
            res.status(500).json({ error: 'Erro interno ao deletar a enquete.' });
        }
    });


    router.patch('/enquetes/:id', async (req: Request, res: Response) => {

        const { id } = req.params;
        const { titulo, descricao, data_inicio, data_termino, ativo } = req.body;

        const setClauses = [];
        const values = [];

        if (titulo !== undefined) {
            setClauses.push('titulo = ?');
            values.push(titulo);
        }
        if (descricao !== undefined) {
            setClauses.push('descricao = ?');
            values.push(descricao);
        }
        if (data_inicio !== undefined) {
            setClauses.push('data_inicio = ?');
            values.push(data_inicio);
        }
        if (data_termino !== undefined) {
            setClauses.push('data_termino = ?');
            values.push(data_termino);
        }
        if (ativo !== undefined) {
            setClauses.push('ativo = ?');
            values.push(ativo);
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo fornecido para atualização.' });
        }

        values.push(id);

        const sql = `UPDATE enquete SET ${setClauses.join(', ')} WHERE id = ?`;

        try {
            const [result] = await connection.execute<mysql.ResultSetHeader>(sql, values);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Enquete não encontrada.' });
            }

            const [rows] = await connection.execute<Enquete[] & mysql.RowDataPacket[]>('SELECT * FROM enquete WHERE id = ?', [id]);

            res.status(200).json({
                message: 'Enquete atualizada com sucesso!',
                enquete: rows[0]
            });

        } catch (error) {
            console.error('Erro ao atualizar enquete:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar a enquete.' });
        }
    });



    return router;
}
