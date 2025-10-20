import { Router, type Request, type Response } from 'express';
import type mysql from 'mysql2/promise';
import path from 'path'; // 1. Importe o módulo 'path'

import { fileURLToPath } from 'url';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createMainRouter(connection: mysql.Connection) {
    const router = Router();

    router.get('/', (req: Request, res: Response) => {
        // res.send('Main está funcionando!');
        const htmlPath = path.join(__dirname, '..', '..', 'public/src/pages/main', 'index.html');
        res.sendFile(htmlPath);
    });

    return router;
}