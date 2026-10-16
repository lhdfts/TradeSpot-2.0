// ============================================================
//  Quando tocar a vinheta de abertura.
//
//  Ela toca UMA vez, logo depois de um login feito agora — nunca ao reabrir o
//  sistema com a sessão já salva. Por isso o clique em "Entrar" marca a vinheta
//  como pendente, e o App toca quando o autenticador devolve o usuário.
//
//  A marca fica no sessionStorage para sobreviver ao login por
//  redirecionamento (a página recarrega na volta do Google). O som não
//  sobrevive: o AudioContext só pode nascer dentro do clique, então no acesso
//  alternativo a vinheta toca muda.
//
//  Preferência (tocar ou não): localStorage, ligada por padrão. É de quem está
//  olhando a tela, não da pessoa no banco. Tudo em try/catch: em janela
//  anônima ou com dados de site bloqueados o acessador LANÇA.
// ============================================================

import { prepararSomAbertura } from './somAbertura';

const CHAVE_PREFERENCIA = 'tradespot:abertura';
const CHAVE_PENDENTE = 'tradespot:abertura-pendente';

let somDoClique: AudioContext | null = null;

/** A vinheta deve tocar no próximo login? */
export function aberturaLigada(): boolean {
    try {
        return window.localStorage.getItem(CHAVE_PREFERENCIA) !== 'desligada';
    } catch {
        return true;
    }
}

export function salvarAberturaLigada(ligada: boolean) {
    try {
        window.localStorage.setItem(CHAVE_PREFERENCIA, ligada ? 'ligada' : 'desligada');
    } catch {
        /* sem persistência: vale só para esta sessão */
    }
}

/**
 * Chamar no clique de login, ANTES do primeiro await: o navegador só libera
 * áudio dentro do gesto da pessoa.
 */
export function marcarAberturaPendente() {
    if (!aberturaLigada()) return;
    somDoClique ??= prepararSomAbertura();
    try {
        window.sessionStorage.setItem(CHAVE_PENDENTE, '1');
    } catch {
        /* sem sessionStorage a vinheta ainda toca no login por janela */
    }
}

export function aberturaPendente(): boolean {
    try {
        return window.sessionStorage.getItem(CHAVE_PENDENTE) === '1';
    } catch {
        return somDoClique !== null;
    }
}

/** Login cancelado, com erro, ou vinheta já tocada. */
export function limparAberturaPendente() {
    try {
        window.sessionStorage.removeItem(CHAVE_PENDENTE);
    } catch {
        /* nada a limpar */
    }
}

/** O som criado no clique, se houver. Entregue uma vez só. */
export function pegarSomDoClique(): AudioContext | null {
    const som = somDoClique;
    somDoClique = null;
    return som;
}
