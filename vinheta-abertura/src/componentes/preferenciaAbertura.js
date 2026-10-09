// ============================================================
//  Preferência da vinheta de abertura — tocar ou não depois do login.
//
//  GUARDADA NO NAVEGADOR, como o tema e a barra fixada: é de quem está
//  olhando a tela, não da pessoa no banco. Ligada por padrão; quem desliga em
//  Configurações → Aparência entra direto no sistema.
//
//  Tudo em try/catch: em janela anônima ou com dados de site bloqueados o
//  acessador LANÇA, e aí vale o padrão (vinheta ligada).
// ============================================================

const CHAVE = 'tradecrew:abertura'

/** A vinheta deve tocar no próximo login? */
export function aberturaLigada() {
  try {
    return window.localStorage.getItem(CHAVE) !== 'desligada'
  } catch {
    return true
  }
}

/** @param {boolean} ligada */
export function salvarAberturaLigada(ligada) {
  try {
    window.localStorage.setItem(CHAVE, ligada ? 'ligada' : 'desligada')
  } catch {
    /* sem persistência: vale só para esta sessão */
  }
}
