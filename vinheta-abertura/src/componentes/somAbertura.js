// ============================================================
//  Som da abertura — sintetizado na hora com Web Audio.
//
//  NENHUM ARQUIVO DE ÁUDIO. Tudo é gerado por osciladores e ruído, então não
//  há amostra de terceiro e não há o que baixar.
//
//  E DE PROPÓSITO DIFERENTE DO "TUDUM". O da Netflix são duas batidas graves
//  e secas. Aqui o desenho é outro: um sopro que sobe enquanto as letras
//  entram, uma nota de madeira média, um deslize quando a estrela salta de
//  um logo para o outro, um sino brilhante quando ela pousa, o brilho de
//  estrela (arpejo agudo) e uma subida de ar no zoom final.
//  É um motivo ascendente e cintilante — "estrela", não "impacto".
// ============================================================

/**
 * Os momentos da vinheta, em segundos. Abertura.jsx anima a partir desta
 * mesma tabela, então mexer num tempo aqui move a imagem e o som juntos.
 */
export const TEMPOS = {
  letras: 0.3, // "tradestars" começa a entrar
  batida: 1.15, // 1ª batida: a palavra assenta
  troca: 1.5, // a estrela salta; "stars" sai, "Crew" entra
  pouso: 2.25, // 2ª batida: a estrela pousa no "C"
  recolhe: 3.0, // as letras recolhem para a estrela
  sozinha: 3.85, // a estrela sozinha brilha
  mergulho: 4.15, // zoom para dentro da estrela
  fim: 5.05,
}

/**
 * Cria o AudioContext. PRECISA SER CHAMADA DENTRO DO CLIQUE: o navegador só
 * libera som depois de um gesto da pessoa, e um contexto criado fora dele
 * nasce mudo. Devolve null se o navegador não tiver Web Audio.
 */
export function prepararSomAbertura() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    const ctx = new AC()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function bufferDeRuido(ctx, segundos) {
  const tamanho = Math.floor(ctx.sampleRate * segundos)
  const buffer = ctx.createBuffer(1, tamanho, ctx.sampleRate)
  const dados = buffer.getChannelData(0)
  for (let i = 0; i < tamanho; i++) dados[i] = Math.random() * 2 - 1
  return buffer
}

function conectar(no, destinos) {
  destinos.forEach((d) => no.connect(d))
}

// Nota com ataque curto e queda exponencial — o "toque" de uma tecla.
function nota(ctx, destinos, t, freq, dur, vol, tipo = 'sine') {
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = tipo
  osc.frequency.setValueAtTime(freq, t)
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(vol, t + 0.006)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(env)
  conectar(env, destinos)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

// Sino: cada nota ganha um parcial inarmônico (2,76x), que é o que faz um
// sino soar como metal e não como flauta.
function sino(ctx, destinos, t, freqs, dur, vol) {
  freqs.forEach((f) => {
    nota(ctx, destinos, t, f, dur, vol)
    nota(ctx, destinos, t, f * 2.76, dur * 0.45, vol * 0.25)
  })
}

// Ruído filtrado com o filtro varrendo de f0 a f1 — o "sopro" de movimento.
function sopro(ctx, destino, ruido, t, dur, f0, f1, vol) {
  const src = ctx.createBufferSource()
  src.buffer = ruido
  const filtro = ctx.createBiquadFilter()
  filtro.type = 'bandpass'
  filtro.Q.value = 1.2
  filtro.frequency.setValueAtTime(f0, t)
  filtro.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(vol, t + dur * 0.7)
  env.gain.linearRampToValueAtTime(0, t + dur)
  src.connect(filtro).connect(env).connect(destino)
  src.start(t)
  src.stop(t + dur)
}

/**
 * Agenda o som inteiro a partir de agora. Devolve uma função que silencia
 * tudo — usada ao pular a abertura e na desmontagem do componente (no modo
 * estrito do React o efeito roda duas vezes, e sem isso o som tocaria dobrado).
 *
 * @param {AudioContext | null} ctx
 * @returns {() => void}
 */
export function tocarSomAbertura(ctx) {
  if (!ctx) return () => {}
  if (ctx.state === 'suspended') ctx.resume()

  const t0 = ctx.currentTime + 0.05
  const mestre = ctx.createGain()
  mestre.gain.value = 0.55
  const compressor = ctx.createDynamicsCompressor()
  mestre.connect(compressor).connect(ctx.destination)

  // Eco curto com realimentação: dá ar ao sino sem precisar de reverb.
  const eco = ctx.createDelay()
  eco.delayTime.value = 0.18
  const retorno = ctx.createGain()
  retorno.gain.value = 0.3
  const envioEco = ctx.createGain()
  envioEco.gain.value = 0.35
  envioEco.connect(eco)
  eco.connect(retorno)
  retorno.connect(eco)
  retorno.connect(mestre)

  const ruido = bufferDeRuido(ctx, 1.2)
  const comEco = [mestre, envioEco]

  const T = TEMPOS

  // Letras entrando: sopro subindo.
  sopro(ctx, mestre, ruido, t0 + T.letras, 0.8, 500, 3200, 0.1)

  // A palavra assenta: nota média, timbre de madeira.
  nota(ctx, comEco, t0 + T.batida, 392, 0.5, 0.32, 'triangle')
  nota(ctx, [mestre], t0 + T.batida, 196, 0.35, 0.22)

  // A troca: o ar das placas virando e o tom da estrela deslizando no arco.
  const voo = T.pouso - T.troca
  sopro(ctx, mestre, ruido, t0 + T.troca, voo, 1200, 4500, 0.07)
  const deslize = ctx.createOscillator()
  const envDeslize = ctx.createGain()
  deslize.type = 'sine'
  deslize.frequency.setValueAtTime(587.33, t0 + T.troca)
  deslize.frequency.exponentialRampToValueAtTime(1174.66, t0 + T.troca + voo * 0.55)
  deslize.frequency.exponentialRampToValueAtTime(880, t0 + T.pouso)
  envDeslize.gain.setValueAtTime(0, t0 + T.troca)
  envDeslize.gain.linearRampToValueAtTime(0.05, t0 + T.troca + voo * 0.5)
  envDeslize.gain.linearRampToValueAtTime(0, t0 + T.pouso)
  deslize.connect(envDeslize).connect(envioEco)
  deslize.start(t0 + T.troca)
  deslize.stop(t0 + T.pouso + 0.05)

  // A estrela pousa no "C": sino brilhante (ré, lá, fá#).
  sino(ctx, comEco, t0 + T.pouso, [587.33, 880, 1479.98], 1.8, 0.16)

  // Letras recolhendo para a estrela: sopro descendo, mais baixo.
  sopro(ctx, mestre, ruido, t0 + T.recolhe, 0.7, 3000, 700, 0.06)

  // A estrela sozinha: brilho em arpejo agudo.
  ;[1760, 2217.46, 2637.02, 3520].forEach((f, i) =>
    nota(ctx, comEco, t0 + T.sozinha + i * 0.055, f, 0.7, 0.06),
  )

  // Zoom para dentro da estrela: ar e tom subindo juntos.
  const m = t0 + T.mergulho
  sopro(ctx, mestre, ruido, m, 0.6, 800, 7000, 0.12)
  const subida = ctx.createOscillator()
  const envSubida = ctx.createGain()
  subida.type = 'sine'
  subida.frequency.setValueAtTime(220, m)
  subida.frequency.exponentialRampToValueAtTime(880, m + 0.55)
  envSubida.gain.setValueAtTime(0, m)
  envSubida.gain.linearRampToValueAtTime(0.1, m + 0.45)
  envSubida.gain.linearRampToValueAtTime(0, m + 0.65)
  subida.connect(envSubida).connect(mestre)
  subida.start(m)
  subida.stop(m + 0.7)

  return () => {
    const t = ctx.currentTime
    mestre.gain.cancelScheduledValues(t)
    mestre.gain.setValueAtTime(mestre.gain.value, t)
    mestre.gain.linearRampToValueAtTime(0, t + 0.08)
    setTimeout(() => mestre.disconnect(), 150)
  }
}
