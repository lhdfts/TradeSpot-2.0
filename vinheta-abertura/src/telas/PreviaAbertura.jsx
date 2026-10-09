'use client'

// ============================================================
//  Prévia da abertura — /abertura
//
//  Para assistir à vinheta sem precisar fazer login. Fora do grupo `(app)`,
//  como o login. O botão não é enfeite: sem um clique o navegador não libera
//  o som.
// ============================================================

import { useRef, useState } from 'react'
import Abertura from '@/src/componentes/Abertura'
import { prepararSomAbertura } from '@/src/componentes/somAbertura'

export default function PreviaAbertura() {
  const [tocando, setTocando] = useState(false)
  const som = useRef(null)

  function assistir() {
    som.current ??= prepararSomAbertura()
    setTocando(true)
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-dark-900 px-4">
      <button
        type="button"
        onClick={assistir}
        className="flex h-btn-h items-center justify-center rounded-sm border border-text-on-dark px-6 text-body-md-semi text-text-on-dark transition-opacity hover:opacity-80"
      >
        Assistir abertura
      </button>
      {tocando && <Abertura som={som.current} aoTerminar={() => setTocando(false)} />}
    </div>
  )
}
