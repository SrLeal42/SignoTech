import { Router, type Request, type Response } from 'express';
import type mysql from 'mysql2/promise';

import { WebSocketServer, WebSocket } from 'ws';

import { type Enquete } from '../Interfaces/Enquete.js';
import { type Opcao } from '../Interfaces/Opcao.js';
import { type EnqueteID } from '../Interfaces/EnqueteID.js';


export function createApiRouter(connection: mysql.Connection, wss: WebSocketServer, subscriptions: Map<number, Set<WebSocket>>) {
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
    
    
    router.get('/enquetes/:id', async (req: Request, res: Response) => {
        
        try {
        
            const { id } = req.params;
      
            const [row] = await connection.execute<Enquete[] & mysql.RowDataPacket[]>('SELECT * FROM enquete WHERE id = ?', [id]);
            
            if (row.length === 0) {
                return res.status(404).json({ error: 'Enquete não encontrada.' });
            }
            
            const [rows] = await connection.execute<Opcao[] & mysql.RowDataPacket[]>('SELECT * FROM opcoes WHERE enquete_id = ?', [id]);

            const result = {'enquete': row[0], 'opcoes': rows}

            res.json(result);
        
        } catch (error) {
            console.error('Erro ao buscar enquete:', error);
            res.status(500).send('Erro ao buscar dados');
        }

    });


    router.post('/enquetes', async (req: Request, res: Response) => {

        // console.log(req.body)
        const { titulo, descricao, data_inicio, data_termino, ativo, opcoes } = req.body;
        const ip_address = req.ip;

        if (!titulo || !data_inicio || !data_termino || !ip_address || !opcoes || !Array.isArray(opcoes) || opcoes.length < 3) {
            return res.status(400).json({ error: 'Não há informações suficientes.' });
        }

        await connection.beginTransaction();

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
                    op,
                    0
                ]);
            });

            await connection.commit();

            res.status(201).json({
                message: 'Enquete criada com sucesso!',
                enquete: result,
            });
        
        } catch (error) {
            await connection.rollback();
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
        const { id: enqueteId } = req.params;
        const { titulo, descricao, data_inicio, data_termino, opcoes, idsParaDeletar } = req.body;

        if (!titulo || !data_inicio || !data_termino || !opcoes) {
            return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
        }

        await connection.beginTransaction();

        try {

            const sqlUpdateEnquete = 'UPDATE enquete SET titulo = ?, descricao = ?, data_inicio = ?, data_termino = ? WHERE id = ?';
            await connection.execute(sqlUpdateEnquete, [titulo, descricao, data_inicio, data_termino, enqueteId]);

            if (idsParaDeletar && idsParaDeletar.length > 0) {
                // Cria um placeholder '?' para cada ID no array
                const placeholders = idsParaDeletar.map(() => '?').join(',');
                
                // Monta a query dinamicamente
                const sqlDeleteOpcoes = `DELETE FROM opcoes WHERE id IN (${placeholders}) AND enquete_id = ?`;
                
                // Cria um novo array de valores contendo os IDs e o enqueteId no final
                const deleteValues = [...idsParaDeletar, enqueteId];

                await connection.execute(sqlDeleteOpcoes, deleteValues);
            }

            for (const opcao of opcoes) {
                if (opcao.id) {
                    const sqlUpdateOpcao = 'UPDATE opcoes SET texto = ? WHERE id = ? AND enquete_id = ?';
                    await connection.execute(sqlUpdateOpcao, [opcao.texto, opcao.id, enqueteId]);
                } else {
                    const sqlInsertOpcao = 'INSERT INTO opcoes (enquete_id, texto) VALUES (?, ?)';
                    await connection.execute(sqlInsertOpcao, [enqueteId, opcao.texto]);
                }
            }

            await connection.commit(); 

            res.status(200).json({ message: 'Enquete atualizada com sucesso!' });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao atualizar enquete:', error);
            res.status(500).json({ error: 'Erro interno ao atualizar a enquete.' });
        }
    });


    router.post('/opcoes/:id/votar', async (req: Request, res: Response) => {
        const { id: opcoes_id } = req.params;
        const ip_address = req.ip; // req.body.ip_address;

        await connection.beginTransaction();

        try {

            const [opcoesRows] = await connection.execute<EnqueteID[] & mysql.RowDataPacket[]>(
                'SELECT enquete_id FROM opcoes WHERE id = ?',
                [opcoes_id]
            );

            if (opcoesRows.length === 0) {
                await connection.rollback(); 
                return res.status(404).json({ error: 'Opção não encontrada.' });
            }
            const { enquete_id } = opcoesRows[0]!;

            const [votesRows] = await connection.execute<mysql.RowDataPacket[]>(
                'SELECT id FROM votes WHERE enquete_id = ? AND ip_address = ?',
                [enquete_id, ip_address]
            );

            if (votesRows.length > 0) {
                await connection.rollback(); 
                return res.status(409).json({ error: 'Você já votou nesta enquete.' });
            }

            await connection.execute(
                'INSERT INTO votes (enquete_id, opcoes_id, ip_address) VALUES (?, ?, ?)',
                [enquete_id, opcoes_id, ip_address]
            );

            await connection.execute(
                'UPDATE opcoes SET num_vote = num_vote + 1 WHERE id = ?',
                [opcoes_id]
            );

            await connection.commit();

                        
            const [enqueteRow] = await connection.execute<Enquete[] & mysql.RowDataPacket[]>('SELECT * FROM enquete WHERE id = ?', [enquete_id]);
            const [opcoesEnqueteRow] = await connection.execute<Opcao[] & mysql.RowDataPacket[]>('SELECT * FROM opcoes WHERE enquete_id = ?', [enquete_id]);

            const enqueteCompleta = { enquete: enqueteRow[0], opcoes: opcoesEnqueteRow };
            // console.log(enqueteCompleta);
            
            if (subscriptions.has(enquete_id)) {
                const message = JSON.stringify({ type: 'update', data: enqueteCompleta });
                for (const client of subscriptions.get(enquete_id)!) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                }
            }

            res.status(200).json({ message: 'Voto computado com sucesso!' });

        } catch (error) {
            await connection.rollback();
            console.error('Erro ao registrar voto:', error);
            res.status(500).json({ error: 'Erro interno ao registrar o voto.' });
        }
    });

    router.get('/meu-ip', (req: Request, res: Response) => {
        res.json({ ip: req.ip });
    });

    return router;
}
