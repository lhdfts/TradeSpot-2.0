'use client'

// ============================================================
//  Abertura — vinheta de entrada no estilo das aberturas de streaming.
//
//  O roteiro (≈ 5s): a marca da empresa vira o nome do sistema, e o sistema
//  mergulha na estrela.
//
//    0,0s  tela preta
//    0,3s  as letras de "tradestars" entram uma a uma
//    1,15s 1ª batida: a palavra assenta (pulso curto)
//    1,5s  a troca: a estrela salta do "s" em arco; "trade" fica e só desliza
//          um pouco; "stars" rola para cima e sai enquanto "Crew" sobe
//    2,25s 2ª batida: a estrela pousa no "C" e pisca — "tradeCrew" na tela
//    3,0s  as letras recolhem para dentro da estrela, da mais perto à mais
//          longe, enquanto a "câmera" leva a estrela ao centro
//    3,85s a estrela sozinha brilha
//    4,15s zoom para dentro da estrela até a tela clarear, e volta ao preto
//
//  Os dois logotipos têm tamanhos diferentes (tradestars 688 x 144,
//  TradeCrew 1201 x 170). O SVG usa as medidas do TradeCrew e o tradestars é
//  encaixado nele por ESCALA_TS: mesma altura de letra e mesma linha de base.
//  O "trade" é sempre o minúsculo do tradestars — do TradeCrew só entra o
//  "Crew".
//
//  A estrela é uma peça só, que voa de um logo para o outro. Dentro dela
//  estão as duas versões do desenho (a do tradestars e a do TradeCrew), que
//  trocam no meio do voo.
//
//  Animado com a Web Animations API, e não com @keyframes no CSS, porque cada
//  letra viaja uma distância diferente — e porque assim o tempo da animação e
//  o do som saem da mesma tabela (TEMPOS, em somAbertura.js).
//
//  Quem pediu menos movimento no sistema operacional não vê a vinheta:
//  `aoTerminar` é chamado na hora.
// ============================================================

import { useEffect, useRef } from 'react'
import { tocarSomAbertura, TEMPOS } from '@/src/componentes/somAbertura'

// Wordmark da TradeStars (logo-tradestars, 688 x 144), separado por letra.
// `cx` é o centro horizontal de cada letra, nas medidas do arquivo original.
const TRADESTARS = [
  { cx: 20, d: ['M10.9826 17.1797H0V42.7433V51.5401V98.4328C0 105.119 1.11377 110.438 3.35541 114.401C5.59705 118.365 8.74098 121.159 12.8154 122.813C16.8898 124.453 21.7115 125.279 27.3085 125.279H40.1239V114.786H25.6308C20.9502 114.786 17.341 113.531 14.8033 111.008C12.2656 108.498 10.9826 104.863 10.9826 100.129V51.5401H40.1239V42.7433H10.9826V17.1797Z'] },
  { cx: 74, d: ['M69.0978 50.3851C65.6719 54.1633 63.3879 59.3245 62.2319 65.8259V42.7431H53.082V124.353H64.5299V79.2992C64.5299 70.4596 66.8138 63.7443 71.3958 59.1677C75.9778 54.5911 82.6322 52.3099 91.3873 52.3099H96.1102V41.8164H93.5161C82.4207 41.8164 74.286 44.6679 69.0978 50.3851Z'] },
  { cx: 131, d: ['M148.57 108.072C146.229 111.408 143.339 113.775 139.871 115.172C136.417 116.569 132.808 117.254 129.044 117.254C122.939 117.254 118.103 115.728 114.55 112.706C110.984 109.669 109.207 105.591 109.207 100.444C109.207 95.4114 110.913 91.3196 114.311 88.1829C117.723 85.0463 122.629 83.478 129.029 83.478H152.362V94.2708C152.179 100.131 150.91 104.736 148.57 108.072ZM148.809 44.9116C143.776 42.8586 137.136 41.832 128.903 41.832C126.562 41.832 124.151 41.8605 121.656 41.9033C119.161 41.9603 116.75 42.0887 114.409 42.2883C112.069 42.5021 109.785 42.7017 107.544 42.9013V53.0811C109.672 52.8815 112.14 52.6962 114.945 52.5394C117.737 52.3825 120.683 52.2542 123.799 52.1544C126.901 52.0546 129.974 51.9976 133.033 51.9976C139.646 51.9976 144.524 53.6229 147.682 56.8594C150.84 60.0958 152.405 64.758 152.405 70.8174V74.6669H129.819C123.108 74.6669 117.384 75.6649 112.661 77.6752C107.938 79.6855 104.315 82.5798 101.834 86.3865C99.3383 90.1932 98.0977 94.8269 98.0977 100.273C98.0977 105.834 99.296 110.553 101.679 114.474C104.075 118.38 107.445 121.36 111.829 123.427C116.2 125.48 121.233 126.521 126.929 126.521C132.526 126.521 137.404 125.495 141.577 123.427C145.75 121.374 149.049 118.309 151.488 114.245C152.63 112.335 153.532 110.182 154.237 107.844V124.354H163.387V71.9009C163.387 64.7009 162.217 58.9267 159.877 54.5497C157.522 50.1726 153.843 46.9647 148.809 44.9116Z'] },
  { cx: 217, d: ['M246.497 86.7145C246.497 92.6884 245.228 97.9494 242.691 102.526C240.153 107.103 236.671 110.624 232.244 113.091C227.817 115.557 222.868 116.798 217.37 116.798C211.477 116.798 206.289 115.386 201.819 112.549C197.336 109.726 193.882 105.791 191.443 100.744C189.004 95.711 187.778 89.9509 187.778 83.4638C187.778 77.1906 188.976 71.5304 191.358 66.4975C193.741 61.4646 197.153 57.4725 201.58 54.5355C206.007 51.6127 211.209 50.1442 217.215 50.1442C222.812 50.1442 227.817 51.3846 232.244 53.8511C236.671 56.3177 240.153 59.7395 242.691 64.1165C245.228 68.4935 246.497 73.5549 246.497 79.3149V86.7145ZM246.046 57.33C242.888 51.7268 238.729 47.4353 233.541 44.4412C228.353 41.4614 222.347 39.9644 215.537 39.9644C209.531 39.9644 204.118 41.1193 199.296 43.429C194.46 45.7387 190.343 48.8753 186.946 52.8389C183.534 56.8024 180.926 61.322 179.093 66.4119C177.26 71.5018 176.344 76.8199 176.344 82.3802V84.5331C176.344 90.2931 177.288 95.7252 179.163 100.815C181.039 105.905 183.745 110.425 187.242 114.388C190.752 118.352 194.925 121.431 199.747 123.641C204.569 125.851 209.94 126.963 215.833 126.963C222.445 126.963 228.423 125.523 233.752 122.643C239.096 119.763 243.41 115.415 246.723 109.612C247.315 108.571 247.837 107.488 248.33 106.361V124.354H257.48V17.1953H246.032V57.33H246.046Z'] },
  { cx: 310, d: ['M285.632 66.4954C287.719 61.5623 290.848 57.5987 295.007 54.6189C299.181 51.6391 304.411 50.1421 310.713 50.1421C316.705 50.1421 321.724 51.4538 325.742 54.0772C329.76 56.7005 332.805 60.3077 334.892 64.87C336.442 68.2918 337.415 72.1128 337.81 76.3615H283.01C283.517 72.8399 284.349 69.5322 285.632 66.4954ZM331.846 45.6795C326.207 41.8728 319.158 39.9766 310.727 39.9766C304.115 39.9766 298.349 41.1884 293.414 43.5979C288.48 46.0217 284.391 49.2296 281.135 53.236C277.878 57.2423 275.467 61.7762 273.888 66.809C272.309 71.8419 271.52 76.9888 271.52 82.2356V84.3884C271.52 89.735 272.309 94.9247 273.888 99.9718C275.467 105.005 277.878 109.567 281.135 113.616C284.391 117.68 288.564 120.916 293.64 123.34C298.729 125.749 304.721 126.961 311.643 126.961C318.044 126.961 323.74 125.878 328.731 123.725C333.707 121.572 337.824 118.506 341.081 114.543C344.338 110.579 346.466 105.874 347.482 100.428H336.795C335.78 104.848 333.087 108.683 328.717 111.92C324.346 115.156 318.65 116.781 311.629 116.781C305.017 116.781 299.561 115.284 295.233 112.304C290.905 109.325 287.704 105.29 285.618 100.2C283.757 95.6661 282.784 90.6902 282.573 85.3152H348.835V79.2985C348.835 72.512 347.411 66.1675 344.563 60.2506C341.743 54.348 337.5 49.4863 331.846 45.6795Z'] },
  // "S": o arquivo traz dois paths sobrepostos para esta letra; os dois ficam.
  { cx: 395, d: [
    'M423.359 81.9791C417.818 77.5593 410.163 74.8361 400.407 73.8096L393.09 73.0397C388.621 72.5264 385.392 71.5569 383.404 70.1026C381.416 68.6627 380.429 66.6096 380.429 63.9292C380.429 61.149 381.656 58.8963 384.095 57.1427C386.534 55.389 389.988 54.5193 394.471 54.5193C399.448 54.5193 403.269 55.5458 405.905 57.5989C408.542 59.652 409.965 62.1185 410.177 64.9985H429.238C428.928 56.2587 425.629 49.629 419.327 45.0951C413.025 40.5755 404.777 38.3086 394.612 38.3086C388.099 38.3086 382.333 39.3066 377.3 41.3169C372.266 43.3272 368.319 46.2785 365.471 50.185C362.623 54.0916 361.199 58.9248 361.199 64.6848C361.199 71.8848 363.695 77.6448 368.671 81.9648C373.648 86.2848 380.768 88.9652 390.03 89.9918L397.347 90.7617C402.832 91.2749 406.723 92.3585 409.021 93.9981C411.305 95.652 412.447 97.8619 412.447 100.628C412.447 103.821 410.938 106.331 407.949 108.184C404.946 110.038 400.9 110.964 395.825 110.964C395.585 110.964 395.374 110.95 395.134 110.95V127.161C395.261 127.161 395.388 127.175 395.515 127.175C402.832 127.175 409.19 126.035 414.59 123.782C419.975 121.515 424.177 118.364 427.165 114.301C430.168 110.237 431.663 105.433 431.663 99.8722C431.677 92.3728 428.9 86.3989 423.359 81.9791Z',
    'M423.358 81.9805C417.818 77.5607 410.162 74.8375 400.406 73.811L393.089 73.0411C388.606 72.5278 385.392 71.5583 383.404 70.104C381.416 68.664 380.429 66.611 380.429 63.9306C380.429 61.1504 381.641 58.8977 384.094 57.144C386.533 55.3904 389.988 54.5207 394.471 54.5207C394.71 54.5207 394.922 54.5492 395.162 54.5634V38.3385C394.978 38.3385 394.809 38.3242 394.626 38.3242C388.112 38.3242 382.346 39.3222 377.313 41.3325C372.28 43.3428 368.332 46.2941 365.485 50.2007C362.637 54.1072 361.213 58.9405 361.213 64.7005C361.213 71.9005 363.708 77.6605 368.685 81.9805C373.662 86.3005 380.781 88.9809 390.044 90.0074L397.361 90.7773C402.845 91.2906 406.736 92.3741 409.034 94.0137C411.318 95.6676 412.46 97.8775 412.46 100.643C412.46 103.837 410.952 106.346 407.963 108.2C404.96 110.053 400.914 110.98 395.838 110.98C389.734 110.98 385.265 109.797 382.417 107.43C379.569 105.063 377.99 102.44 377.694 99.5599H358.633C358.943 108.2 362.327 114.958 368.784 119.848C375.241 124.738 384.165 127.176 395.556 127.176C402.873 127.176 409.232 126.036 414.632 123.783C420.017 121.516 424.218 118.365 427.207 114.302C430.21 110.239 431.705 105.434 431.705 99.8735C431.676 92.3741 428.899 86.4003 423.358 81.9805Z',
  ] },
  { cx: 459, d: ['M456.659 17.1797H436.823L436.668 93.072C436.668 101.199 437.894 107.643 440.334 112.434C442.773 117.21 446.452 120.603 451.387 122.613C456.321 124.624 462.595 125.622 470.222 125.622H482.121V107.272H469.151C465.076 107.272 461.96 106.175 459.775 103.95C457.59 101.74 456.49 98.5753 456.49 94.4692L456.575 53.1512H482.121V37.4252H456.603L456.659 17.1797Z'] },
  { cx: 522, d: ['M529.786 109.826C527.291 110.909 524.57 111.451 521.624 111.451C516.745 111.451 513.009 110.268 510.415 107.901C507.821 105.534 506.524 102.455 506.524 98.6478C506.524 94.8411 507.821 91.733 510.415 89.3092C513.009 86.8854 516.745 85.6878 521.624 85.6878H538.866V93.5579C538.654 98.0775 537.724 101.656 536.046 104.279C534.368 106.889 532.282 108.742 529.786 109.826ZM541.996 42.944C536.356 40.6771 529.251 39.5508 520.721 39.5508C517.972 39.5508 515.054 39.5793 511.952 39.6363C508.85 39.6934 505.819 39.8217 502.873 40.0213C499.926 40.2209 497.276 40.4347 494.949 40.6343V58.8411C497.797 58.6415 501.026 58.4561 504.635 58.2993C508.244 58.1425 511.825 58.0141 515.392 57.9143C518.945 57.8145 522.004 57.7575 524.542 57.7575C529.42 57.7575 533.029 58.9409 535.369 61.3076C537.71 63.6743 538.88 67.2672 538.88 72.1005V72.8704H521.948C514.631 72.8704 508.244 73.8541 502.802 75.8074C497.36 77.7607 493.145 80.6977 490.142 84.6042C487.139 88.5108 485.645 93.5579 485.645 99.7171C485.645 105.377 486.885 110.211 489.381 114.217C491.876 118.223 495.372 121.317 499.898 123.47C504.424 125.623 509.682 126.706 515.688 126.706C521.483 126.706 526.389 125.651 530.407 123.541C534.425 121.431 537.583 118.366 539.867 114.359C540.896 112.563 541.714 110.539 542.39 108.371V124.539H559.167V72.571C559.167 64.7579 557.715 58.4276 554.825 53.5943C551.907 48.7611 547.635 45.211 541.996 42.944Z'] },
  { cx: 589, d: ['M613.829 39.707H610.784C593.936 39.707 580.74 51.8829 580.74 56.0746L581.191 40.7906H564.414V124.553H585.618V80.8967C585.618 73.5969 587.578 68.008 591.497 64.1585C595.402 60.2948 600.929 58.37 608.049 58.37H613.843V39.707H613.829Z'] },
  { cx: 650, d: ['M678.412 81.9805C672.872 77.5607 665.216 74.8375 655.446 73.811L648.129 73.0411C643.646 72.5278 640.431 71.5583 638.444 70.104C636.456 68.664 635.469 66.611 635.469 63.9306C635.469 61.1504 636.681 58.8977 639.12 57.144C641.559 55.3904 645.013 54.5207 649.497 54.5207C649.736 54.5207 649.948 54.5492 650.187 54.5634V38.3385C650.004 38.3385 649.835 38.3242 649.652 38.3242C643.138 38.3242 637.372 39.3222 632.339 41.3325C627.306 43.3428 623.358 46.2941 620.51 50.2007C617.663 54.1072 616.239 58.9405 616.239 64.7005C616.239 71.9005 618.734 77.6605 623.711 81.9805C628.687 86.3005 635.807 88.9809 645.07 90.0074L652.387 90.7773C657.885 91.2906 661.762 92.3741 664.06 94.0137C666.344 95.6676 667.486 97.8775 667.486 100.643C667.486 103.837 665.992 106.346 662.989 108.2C659.986 110.053 655.94 110.98 650.864 110.98C644.76 110.98 640.29 109.797 637.443 107.43C634.595 105.063 633.016 102.44 632.705 99.5599H613.645C613.955 108.2 617.338 114.958 623.795 119.848C630.252 124.738 639.177 127.176 650.568 127.176C657.885 127.176 664.244 126.036 669.629 123.783C675.015 121.516 679.216 118.365 682.219 114.302C685.222 110.239 686.716 105.434 686.716 99.8735C686.73 92.3741 683.953 86.4003 678.412 81.9805Z'] },
]

const ESTRELA =
  'M658.703 47.9773C665.019 49.0894 670.024 54.108 671.166 60.481C671.307 61.2652 671.983 61.8355 672.773 61.8355C672.801 61.8355 672.829 61.8355 672.843 61.8355C673.633 61.8355 674.295 61.2652 674.436 60.481C675.564 54.1792 680.456 49.1891 686.688 48.0058C687.449 47.8632 688.013 47.1789 688.013 46.3947V46.2806C688.013 45.4965 687.463 44.8121 686.688 44.6695C680.471 43.4862 675.564 38.4961 674.436 32.1943C674.295 31.4101 673.633 30.8541 672.843 30.8398H672.773C671.983 30.8398 671.307 31.4101 671.166 32.1943C670.024 38.5674 665.033 43.586 658.703 44.6981C657.927 44.8406 657.363 45.525 657.363 46.3234V46.3662C657.363 47.1503 657.927 47.8347 658.703 47.9773Z'

// "Crew" do TradeCrew (logo-tradecrew, 1201 x 170). No arquivo, "Crew" é um
// path só; aqui ele foi aberto em C, r, e, w (o "e" leva junto o contorno do
// miolo). O "Trade" maiúsculo do arquivo não entra: o "trade" que fica na tela
// é o minúsculo do tradestars.
const CREW = [
  { cx: 689, d: ['M689.64 0C704.16 0 716.993 2.71403 728.14 8.14062C733.837 10.9141 738.939 14.2444 743.448 18.1289C740.776 21.4199 737.412 24.21 733.434 26.082C729.789 27.795 719.701 28.4823 722.478 33.4951L722.467 33.5146C723.135 34.7148 730.029 35.9735 732.306 36.9316C740.932 40.5803 745.653 46.8903 748.713 54.9326C749.475 56.9456 749.057 58.7855 751.219 60.4404H752.566C756.723 58.6595 756.577 53.5102 758.749 49.5615C759.703 47.828 760.852 46.1929 762.168 44.6846C764.502 50.7659 765.994 57.357 766.64 64.46H730.34C729.313 58.0068 726.966 52.5065 723.3 47.96C719.633 43.4135 714.867 39.8937 709 37.4004C703.28 34.9071 696.826 33.6602 689.64 33.6602C682.453 33.6602 676.073 34.9071 670.5 37.4004C664.927 39.8937 660.233 43.4134 656.42 47.96C652.753 52.5066 649.893 57.9336 647.84 64.2402C645.933 70.4002 644.98 77.2942 644.98 84.9209C644.981 92.4007 645.933 99.2941 647.84 105.601C649.893 111.761 652.826 117.188 656.64 121.881C660.6 126.427 665.44 129.947 671.16 132.44C676.88 134.787 683.407 135.96 690.74 135.96C701.887 135.96 711.274 133.247 718.9 127.82C726.673 122.394 731.367 114.914 732.98 105.381H769.06C767.74 117.114 763.78 127.894 757.18 137.721C750.726 147.401 741.853 155.173 730.56 161.04C719.413 166.76 706.14 169.62 690.74 169.62C676.22 169.62 663.753 167.127 653.34 162.141C642.927 157.007 634.42 150.333 627.82 142.12C621.22 133.76 616.307 124.814 613.08 115.28C610 105.6 608.46 96.2134 608.46 87.1201V82.2803C608.46 72.3071 610.073 62.4806 613.3 52.8008C616.526 42.9742 621.44 34.1006 628.04 26.1807C634.787 18.2607 643.22 11.9541 653.34 7.26074C663.606 2.42078 675.706 4.14799e-05 689.64 0Z'] },
  { cx: 828, d: ['M865.377 73.7002H856.577C846.897 73.7002 839.417 76.3401 834.137 81.6201C828.857 86.7534 826.217 94.2339 826.217 104.061V165.44H791.017V44.8809H818.957V84.6719C820.295 73.3127 823.668 64.1552 829.077 57.2002C836.41 47.9604 846.97 43.3409 860.757 43.3408H865.377V73.7002Z'] },
  { cx: 936, d: ['M936.87 40.7002C949.777 40.7002 960.63 43.6336 969.43 49.5C978.376 55.22 985.197 62.7735 989.891 72.1602C994.584 81.4002 996.93 91.5205 996.93 102.521V114.4H908.873C909.38 117.974 910.205 121.274 911.351 124.301C913.404 129.581 916.63 133.687 921.03 136.62C925.43 139.553 931.15 141.021 938.19 141.021C944.644 141.02 949.924 139.774 954.03 137.28C958.137 134.787 960.924 131.707 962.391 128.04H994.73C992.97 136.107 989.524 143.294 984.391 149.601C979.257 155.907 972.804 160.821 965.03 164.341C957.257 167.861 948.31 169.62 938.19 169.62C927.924 169.62 918.83 167.861 910.91 164.341C903.137 160.821 896.61 156.127 891.33 150.261C886.197 144.247 882.237 137.574 879.45 130.24C876.81 122.76 875.49 115.134 875.49 107.36V102.96C875.49 94.8935 876.81 87.1935 879.45 79.8604C882.237 72.3805 886.197 65.7074 891.33 59.8408C896.463 53.9742 902.843 49.3538 910.47 45.9805C918.243 42.4605 927.043 40.7002 936.87 40.7002ZM936.87 69.3008C930.71 69.3008 925.503 70.6938 921.25 73.4805C916.997 76.2671 913.77 80.3742 911.57 85.8008C910.501 88.3665 909.692 91.2265 909.143 94.3809H963.499C962.989 91.0001 962.182 87.9196 961.07 85.1406C959.017 80.0073 955.937 76.1205 951.83 73.4805C947.87 70.6938 942.883 69.3008 936.87 69.3008Z'] },
  { cx: 1103, d: ['M1064.01 136.181H1068.71L1085.19 48.8408H1123.69L1142.8 136.181H1147.36L1167.69 44.8809H1200.03L1170.99 165.44H1121.93L1103.97 86.0752L1087.83 165.44H1038.99L1006.65 44.8809H1041.19L1064.01 136.181Z'] },
]

const ESTRELA_CREW =
  'M735.276 32.435C735.67 33.193 739.738 33.9876 741.082 34.5928C746.173 36.8972 748.959 40.8827 750.765 45.9623C751.215 47.2338 750.968 48.3952 752.244 49.4404H753.039C755.492 48.3157 755.406 45.0638 756.688 42.5698C758.297 39.4401 760.848 36.8178 763.949 35.1246C766.377 33.8042 768.923 33.6331 771 32.0254V31.2308C770.051 28.8346 767.123 29.0608 764.867 28.0155C760.547 26.0106 757.391 22.0862 755.646 17.7646C754.993 16.1325 755.418 13.5285 753.218 13.4429C750.58 13.3451 751.122 16.1325 750.327 18.0458C748.651 22.0862 745.717 25.7416 741.748 27.7405C739.596 28.8224 733.642 29.2564 735.282 32.4228L735.276 32.435Z'

// --- Geometria ---------------------------------------------------------

const LARGURA = 1201
const ALTURA = 170

// Encaixe do tradestars nas medidas do TradeCrew: 1,48x deixa a altura das
// letras igual; o deslocamento centraliza na largura e alinha a linha de base
// (125 no tradestars, 165 no TradeCrew).
const ESCALA_TS = 1.48
const TS_X = (LARGURA - 688 * ESCALA_TS) / 2
const TS_Y = 165 - 125 * ESCALA_TS
const ENCAIXE_TS = `translate(${TS_X} ${TS_Y}) scale(${ESCALA_TS})`
const xTS = (x) => TS_X + x * ESCALA_TS

// "trade" são as 5 primeiras letras do tradestars; o resto é "stars".
const TRADE = 5

// A palavra final é o "trade" minúsculo do tradestars + o "Crew" do
// TradeCrew, com a mesma folga entre o "e" e o "C" do arquivo do TradeCrew.
// Para a palavra ficar centralizada, o "trade" anda DX_TRADE (para a
// esquerda) na troca e o "Crew" é desenhado DX_CREW antes de onde está no
// arquivo.
const FOLGA = 608 - 584
const LARGURA_TRADE = 348.8 * ESCALA_TS
const INICIO = (LARGURA - (LARGURA_TRADE + FOLGA + (1200 - 608))) / 2
const DX_TRADE = INICIO - TS_X
const DX_CREW = INICIO + LARGURA_TRADE + FOLGA - 608

// Onde a estrela está: no tradestars, e no "C" já deslocado.
const ESTRELA_TS = { x: xTS(672.7), y: TS_Y + 46.4 * ESCALA_TS }
const ESTRELA_TC = { x: 752.9 + DX_CREW, y: 31.4 }

// Quanto a câmera anda para pôr a estrela no centro.
const ATE_O_CENTRO = `translate(${LARGURA / 2 - ESTRELA_TC.x}px, ${ALTURA / 2 - ESTRELA_TC.y}px)`

const ms = (s) => s * 1000
const DURACAO = ms(TEMPOS.fim)

/**
 * @param {object} props
 * @param {AudioContext | null} [props.som]  contexto criado no clique (prepararSomAbertura); null = sem som
 * @param {() => void} props.aoTerminar      chamado ao fim da vinheta ou ao pular
 */
export default function Abertura({ som = null, aoTerminar }) {
  const camera = useRef(null)
  const letrasTS = useRef([])
  const letrasTC = useRef([])
  const voo = useRef(null)
  const estrela = useRef(null)
  const desenhoTS = useRef(null)
  const desenhoTC = useRef(null)
  const clarao = useRef(null)
  const terminar = useRef(aoTerminar)
  const pararSom = useRef(() => {})
  terminar.current = aoTerminar

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      terminar.current()
      return
    }

    const anims = []
    const animar = (el, quadros, opcoes) => anims.push(el.animate(quadros, opcoes))
    const p = (t) => ms(t) / DURACAO // offset de um quadro-chave da câmera
    const entrada = 'cubic-bezier(.2,.7,.2,1)'
    const T = TEMPOS

    // --- tradestars entrando, da esquerda para a direita. A estrela entra
    // junto com a última letra.
    ;[...letrasTS.current, estrela.current].forEach((el, i) => {
      animar(
        el,
        [
          { opacity: 0, transform: 'translateY(10px) scale(1.12)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ],
        { duration: 520, delay: ms(T.letras) + i * 45, easing: entrada, fill: 'both' },
      )
    })

    // --- A troca.
    const troca = ms(T.troca)

    // O "trade" fica: só desliza para a esquerda, abrindo espaço para o "Crew",
    // que é mais largo que "stars".
    letrasTS.current.slice(0, TRADE).forEach((el, i) => {
      animar(
        el,
        [{ transform: 'translateX(0)' }, { transform: `translateX(${DX_TRADE / ESCALA_TS}px)` }],
        { duration: 650, delay: troca + 60 + i * 25, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
      )
    })

    // Profundidade de campo: "stars" se afasta para o fundo (encolhe e
    // desfoca) e "Crew" vem da frente, grande e desfocado, até entrar em foco.
    letrasTS.current.slice(TRADE).forEach((el, i) => {
      animar(
        el,
        [
          { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
          { offset: 0.7, opacity: 0 },
          { opacity: 0, transform: 'translateY(-14px) scale(0.45)', filter: 'blur(4px)' },
        ],
        { duration: 380, delay: troca + i * 35, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' },
      )
    })
    letrasTC.current.forEach((el, i) => {
      animar(
        el,
        [
          { opacity: 0, transform: 'translateY(30px) scale(2.2)', filter: 'blur(10px)' },
          { offset: 0.75, opacity: 1, transform: 'translateY(0) scale(0.96)', filter: 'blur(0px)' },
          { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
        ],
        { duration: 560, delay: troca + 240 + i * 60, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
      )
    })

    // A estrela salta em arco do "s" até o "C", dando meia volta (tem 4
    // pontas, então 180° termina igual a como começou). No meio do caminho o
    // desenho do tradestars dá lugar ao do TradeCrew.
    const pos = ({ x, y }) => `translate(${x}px, ${y}px)`
    const topo = { x: (ESTRELA_TS.x + ESTRELA_TC.x) / 2, y: -60 }
    const duracaoVoo = ms(T.pouso - T.troca)
    animar(
      voo.current,
      [
        { transform: `${pos(ESTRELA_TS)} rotate(0deg) scale(1)`, easing: 'cubic-bezier(.3,0,.6,1)' },
        { offset: 0.12, transform: `${pos({ x: ESTRELA_TS.x + 8, y: ESTRELA_TS.y + 6 })} rotate(-12deg) scale(0.9)`, easing: 'cubic-bezier(.2,.6,.4,1)' },
        { offset: 0.55, transform: `${pos(topo)} rotate(100deg) scale(1.7)`, easing: 'cubic-bezier(.6,0,.8,.6)' },
        { transform: `${pos(ESTRELA_TC)} rotate(180deg) scale(1)` },
      ],
      { duration: duracaoVoo, delay: troca, fill: 'both' },
    )
    const meioDoVoo = { duration: 200, delay: troca + duracaoVoo * 0.45, fill: 'forwards' }
    animar(desenhoTS.current, [{ opacity: 1 }, { opacity: 0 }], meioDoVoo)
    animar(desenhoTC.current, [{ opacity: 0 }, { opacity: 1 }], meioDoVoo)

    // 2ª batida: a estrela pousa e pisca. Depois, o brilho de quando fica
    // sozinha.
    const sombra = (r, a) => `drop-shadow(0 0 ${r}px rgba(255,255,255,${a}))`
    animar(
      estrela.current,
      [
        { transform: 'scale(1) rotate(0deg)', filter: sombra(0, 0) },
        { offset: 0.2, transform: 'scale(1.9) rotate(45deg)', filter: sombra(10, 0.9) },
        { transform: 'scale(1) rotate(90deg)', filter: sombra(3, 0.4) },
      ],
      { duration: 650, delay: ms(T.pouso), easing: 'ease-out', fill: 'forwards' },
    )
    animar(
      estrela.current,
      [
        { transform: 'scale(1) rotate(90deg)', filter: sombra(3, 0.4) },
        { offset: 0.4, transform: 'scale(1.25) rotate(135deg)', filter: sombra(8, 1) },
        { transform: 'scale(1) rotate(180deg)', filter: sombra(4, 0.6) },
      ],
      { duration: 500, delay: ms(T.sozinha), easing: 'ease-in-out', fill: 'forwards' },
    )

    // --- tradeCrew recolhendo para a estrela: a letra mais perto vai primeiro.
    // As do "trade" estão dentro do encaixe do tradestars, então o caminho
    // delas é medido nas unidades de lá (÷ ESCALA_TS) e parte do deslize da
    // troca.
    const pecasFinais = [
      ...TRADESTARS.slice(0, TRADE).map((l, i) => ({
        el: letrasTS.current[i],
        cx: xTS(l.cx) + DX_TRADE,
        escala: ESCALA_TS,
        base: DX_TRADE / ESCALA_TS,
      })),
      ...CREW.map((l, i) => ({ el: letrasTC.current[i], cx: l.cx + DX_CREW, escala: 1, base: 0 })),
    ]
    pecasFinais
      .sort((a, b) => Math.abs(ESTRELA_TC.x - a.cx) - Math.abs(ESTRELA_TC.x - b.cx))
      .forEach(({ el, cx, escala, base }, n) => {
        const dx = base + (ESTRELA_TC.x - cx) / escala
        const dy = (ESTRELA_TC.y - 85) / escala
        animar(
          el,
          [
            { opacity: 1, transform: `translate(${base}px, 0px) scale(1)` },
            { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0.15)` },
          ],
          { duration: 520, delay: ms(T.recolhe) + n * 40, easing: 'cubic-bezier(.6,0,.9,.5)', fill: 'forwards' },
        )
      })

    // --- A "câmera": aproxima de leve, pulsa nas duas batidas, leva a estrela
    // ao centro e mergulha nela.
    const parado = 'translate(0px, 0px)'
    animar(
      camera.current,
      [
        { offset: 0, transform: `${parado} scale(0.94)`, opacity: 1, easing: entrada },
        { offset: p(T.batida), transform: `${parado} scale(1)`, easing: 'ease-out' },
        { offset: p(T.batida + 0.08), transform: `${parado} scale(1.03)`, easing: 'ease-in-out' },
        { offset: p(T.batida + 0.27), transform: `${parado} scale(1)` },
        { offset: p(T.pouso), transform: `${parado} scale(1)`, easing: 'ease-out' },
        { offset: p(T.pouso + 0.08), transform: `${parado} scale(1.035)`, easing: 'ease-in-out' },
        { offset: p(T.pouso + 0.3), transform: `${parado} scale(1)` },
        { offset: p(T.recolhe), transform: `${parado} scale(1)`, easing: 'cubic-bezier(.65,0,.35,1)' },
        { offset: p(T.sozinha), transform: `${ATE_O_CENTRO} scale(2.6)`, easing: 'linear' },
        { offset: p(T.mergulho), transform: `${ATE_O_CENTRO} scale(2.8)`, easing: 'cubic-bezier(.7,0,.95,.4)' },
        { offset: p(T.mergulho + 0.55), transform: `${ATE_O_CENTRO} scale(160)`, opacity: 1 },
        { offset: 1, transform: `${ATE_O_CENTRO} scale(160)`, opacity: 0 },
      ],
      { duration: DURACAO, fill: 'both' },
    )

    // O clarão: a tela fica branca no fim do mergulho e volta ao preto.
    animar(
      clarao.current,
      [{ opacity: 0 }, { offset: 0.55, opacity: 1 }, { opacity: 0 }],
      { duration: 650, delay: ms(T.mergulho + 0.25), easing: 'ease-in-out', fill: 'both' },
    )

    pararSom.current = tocarSomAbertura(som)
    const fim = setTimeout(() => terminar.current(), DURACAO)

    // Espaço pula (é o que o aviso na tela diz); Esc também, por costume.
    // `preventDefault` para o espaço não rolar a página nem "clicar" de novo
    // no aviso, que é um botão.
    function teclado(e) {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        pular()
      }
    }
    window.addEventListener('keydown', teclado)

    return () => {
      clearTimeout(fim)
      window.removeEventListener('keydown', teclado)
      anims.forEach((a) => a.cancel())
      pararSom.current()
    }
  }, [som])

  function pular() {
    pararSom.current()
    terminar.current()
  }

  const peca = { transformBox: 'fill-box', transformOrigin: 'center', opacity: 0 }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-dark-900 text-text-on-dark">
      <p className="sr-only" role="status">
        Entrando no TradeCrew
      </p>
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        fill="currentColor"
        aria-hidden="true"
        className="w-[min(80vw,760px)] overflow-visible"
      >
        <g
          ref={camera}
          style={{ transformBox: 'view-box', transformOrigin: `${ESTRELA_TC.x}px ${ESTRELA_TC.y}px` }}
        >
          <g transform={ENCAIXE_TS}>
            {TRADESTARS.map((letra, i) => (
              <g key={letra.cx} ref={(el) => (letrasTS.current[i] = el)} style={peca}>
                {letra.d.map((d) => (
                  <path key={d.slice(0, 24)} d={d} />
                ))}
              </g>
            ))}
          </g>

          <g transform={`translate(${DX_CREW} 0)`}>
            {CREW.map((letra, i) => (
              <g key={letra.cx} ref={(el) => (letrasTC.current[i] = el)} style={peca}>
                {letra.d.map((d) => (
                  <path key={d.slice(0, 24)} d={d} />
                ))}
              </g>
            ))}
          </g>

          {/* A estrela: `voo` leva de um logo ao outro; `estrela` entra, pisca
              e gira no lugar; dentro, os dois desenhos centrados na origem. */}
          <g ref={voo} style={{ transformBox: 'view-box', transformOrigin: '0 0' }}>
            <g ref={estrela} style={peca}>
              <g ref={desenhoTS} transform={`scale(${ESCALA_TS}) translate(-672.7 -46.4)`}>
                <path d={ESTRELA} />
              </g>
              <g ref={desenhoTC} transform="translate(-752.9 -31.4)" style={{ opacity: 0 }}>
                <path d={ESTRELA_CREW} />
              </g>
            </g>
          </g>
        </g>
      </svg>

      <div ref={clarao} className="pointer-events-none absolute inset-0 bg-text-on-dark" style={{ opacity: 0 }} />

      {/* Aviso centralizado no pé da tela. Continua sendo botão: no celular
          não há espaço para apertar, e o toque nele também pula. */}
      <button
        type="button"
        onClick={pular}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-caption text-text-on-dark opacity-60 transition-opacity hover:opacity-100"
      >
        Pressione
        <kbd className="rounded-sm border border-text-on-dark px-2 py-0.5 font-sans">espaço</kbd>
        para pular
      </button>
    </div>
  )
}
