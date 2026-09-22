import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Autenticação para integrações máquina-a-máquina (n8n).
 *
 * Duas barreiras, ambas obrigatórias:
 *   1. X-API-Key          -> segredo compartilhado (INTEGRATION_API_KEY)
 *   2. X-N8N-Workflow-Id  -> id do workflow autorizado (N8N_PARTNERS_WORKFLOW_ID)
 *
 * O id do workflow sozinho não é segredo — ele amarra a chamada à automação
 * específica, mas quem protege de fato é o token.
 *
 * Falha fechada: sem as variáveis de ambiente configuradas o endpoint recusa
 * todas as requisições, em vez de ficar aberto.
 */

const timingSafeEquals = (a: string, b: string): boolean => {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    // timingSafeEqual exige buffers do mesmo tamanho; comparar o tamanho antes
    // vaza apenas o comprimento, não o conteúdo.
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
};

const firstHeader = (value: string | string[] | undefined): string => {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
};

export const integrationAuth = (req: Request, res: Response, next: NextFunction) => {
    const expectedKey = process.env.INTEGRATION_API_KEY;
    const expectedWorkflow = process.env.N8N_PARTNERS_WORKFLOW_ID;

    if (!expectedKey || !expectedWorkflow) {
        console.error('[INTEGRATION AUTH] INTEGRATION_API_KEY e/ou N8N_PARTNERS_WORKFLOW_ID não configurados — endpoint recusando todas as requisições.');
        return res.status(503).json({ error: 'Integração não configurada neste ambiente.' });
    }

    const providedKey = firstHeader(req.headers['x-api-key']);
    const providedWorkflow = firstHeader(req.headers['x-n8n-workflow-id']);

    const keyOk = providedKey.length > 0 && timingSafeEquals(providedKey, expectedKey);
    const workflowOk = providedWorkflow.length > 0 && timingSafeEquals(providedWorkflow, expectedWorkflow);

    if (!keyOk || !workflowOk) {
        // Log sem revelar o valor recebido nem qual das duas barreiras falhou.
        console.warn(`[INTEGRATION AUTH] Acesso negado em ${req.originalUrl} (ip=${req.ip})`);
        return res.status(401).json({ error: 'Não autorizado.' });
    }

    next();
};
