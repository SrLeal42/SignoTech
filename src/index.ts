import express, { type Request, type Response } from 'express';
import mysql, { type RowDataPacket } from 'mysql2/promise';

interface Usuario {
    id: number;
    nome: string;
    email: string;
}

const app = express();
const port = 3000;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'signotech'
};

async function main() {
    let connection: mysql.Connection | undefined;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Conectado ao banco de dados MySQL com sucesso!');

        // app.get('/', (req: Request, res: Response) => {
        //     res.send('API com Node.js e TypeScript está funcionando!');
        // });

        // app.get('/usuarios', async (req: Request, res: Response) => {
        //     try {
        //         // O [rows] desestrutura o resultado. A tipagem ajuda a entender o que é retornado.
        //         const [rows] = await connection!.execute<Usuario[] & RowDataPacket[]>('SELECT * FROM usuarios');
        //         res.json(rows);
        //     } catch (error) {
        //         console.error('Erro ao buscar usuários:', error);
        //         res.status(500).send('Erro ao buscar dados');
        //     }
        // });

        app.listen(port, () => {
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

*/