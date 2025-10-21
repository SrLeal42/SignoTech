import express, { type Request, type Response } from 'express';
import mysql, { type RowDataPacket } from 'mysql2/promise';

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import { createApiRouter } from './routes/api.routes.js';
import { createMainRouter } from './routes/main.routes.js';

const app = express();
const port = 3000;

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

const subscriptions = new Map<number, Set<WebSocket>>();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'signotech'
};


wss.on('connection', (ws: WebSocket) => {
    // console.log('Cliente WebSocket conectado.');

    ws.on('message', (message: string) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'subscribe' && data.enqueteId) {
                const enqueteId = Number(data.enqueteId);
                if (!subscriptions.has(enqueteId)) {
                    subscriptions.set(enqueteId, new Set());
                }
                subscriptions.get(enqueteId)!.add(ws);
                // @ts-ignore
                ws.enqueteId = enqueteId; 
                // console.log(`Cliente inscrito na enquete ${enqueteId}`);
            }
        } catch (error) {
            console.error('Erro ao processar mensagem WebSocket:', error);
        }
    });

    ws.on('close', () => {
        // console.log('Cliente WebSocket desconectado.');
        // @ts-ignore
        const enqueteId = ws.enqueteId;
        if (enqueteId && subscriptions.has(enqueteId)) {
            subscriptions.get(enqueteId)!.delete(ws);
        }
    });
});


async function main() {
    let connection: mysql.Connection | undefined;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Conectado ao banco de dados MySQL com sucesso!');

        app.use(express.static('public/src'));
        app.use(express.json());

        const mainRouter = createMainRouter(connection);
        const apiRouter = createApiRouter(connection, wss, subscriptions);

        app.use('/', mainRouter);
        app.use('/api', apiRouter);

        server.listen(port, () => {
            console.log(`Servidor rodando em http://localhost:${port}`);
        });

    } catch (error) {
        console.error('Não foi possível conectar ao banco de dados:', error);
        process.exit(1);
    }
}

main();


/*

CREATE TABLE enquete ( id INT AUTO_INCREMENT PRIMARY KEY, titulo VARCHAR(255) NOT NULL, descricao TEXT, data_inicio DATETIME DEFAULT CURRENT_TIMESTAMP, data_termino DATETIME, ativo BOOLEAN DEFAULT TRUE );

CREATE TABLE opcoes (id INT AUTO_INCREMENT PRIMARY KEY, enquete_id INT NOT NULL, texto VARCHAR(255) NOT NULL, num_vote INT DEFAULT 0, FOREIGN KEY (enquete_id) REFERENCES enquete(id) ON DELETE CASCADE );

CREATE TABLE votes ( id INT AUTO_INCREMENT PRIMARY KEY, enquete_id INT NOT NULL, opcoes_id INT NOT NULL, ip_address VARCHAR(45), data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (enquete_id) REFERENCES enquete(id) ON DELETE CASCADE, FOREIGN KEY (opcoes_id) REFERENCES opcoes(id) ON DELETE CASCADE );

*/