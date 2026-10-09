// ============================================================
//  Abertura — vinheta de entrada no estilo das aberturas de streaming.
//  Adaptada da vinheta do TradeCrew (pasta vinheta-abertura/) para o TradeSpot.
//
//  O roteiro (≈ 5s): a marca da empresa vira o nome do sistema, e o sistema
//  mergulha na estrela.
//
//    0,0s  tela preta
//    0,3s  as letras de "tradestars" entram uma a uma
//    1,15s 1ª batida: a palavra assenta (pulso curto)
//    1,5s  a troca: a estrela salta do "s" em arco; "trade" fica e só desliza
//          um pouco; "stars" rola para cima e sai enquanto "Spot" sobe
//    2,25s 2ª batida: a estrela pousa no "S" e pisca — "tradeSpot" na tela
//    3,0s  as letras recolhem para dentro da estrela, da mais perto à mais
//          longe, enquanto a "câmera" leva a estrela ao centro
//    3,85s a estrela sozinha brilha
//    4,15s zoom para dentro da estrela até a tela clarear, e volta ao preto
//
//  Os dois logotipos têm tamanhos diferentes (tradestars 688 x 144,
//  TradeSpot 1114 x 208). O SVG usa as medidas do TradeSpot e o tradestars é
//  encaixado nele por ESCALA_TS: mesma altura de letra e mesma linha de base.
//  O "trade" é sempre o minúsculo do tradestars — do TradeSpot só entra o
//  "Spot" (desenhos de components/Logo.tsx).
//
//  A estrela é uma peça só, que voa de um logo para o outro. Dentro dela
//  estão as duas versões do desenho (a do tradestars e a do TradeSpot), que
//  trocam no meio do voo.
//
//  Animado com a Web Animations API porque cada letra viaja uma distância
//  diferente — e porque assim o tempo da animação e o do som saem da mesma
//  tabela (TEMPOS, em somAbertura.ts).
//
//  Quem pediu menos movimento no sistema operacional não vê a vinheta:
//  `aoTerminar` é chamado na hora.
// ============================================================

import { useEffect, useRef } from 'react';
import { tocarSomAbertura, TEMPOS } from './somAbertura';

interface Letra {
  cx: number; // centro horizontal da letra, nas medidas do arquivo original
  d: string[];
}

// Wordmark da TradeStars (logo-tradestars, 688 x 144), separado por letra.
const TRADESTARS: Letra[] = [
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

// "Spot" do TradeSpot (components/Logo.tsx, 1114 x 208). O "S" já vem com o
// recorte onde a estrela pousa. O "Trade" maiúsculo do logo não entra: o
// "trade" que fica na tela é o minúsculo do tradestars.
const SPOT: Letra[] = [
  { cx: 665, d: ['M702.681 78.1224C693.824 74.1129 683.585 71.5977 671.97 70.5766L659.772 69.4809C652.508 68.9019 647.283 66.9283 644.091 63.5725C640.893 60.2168 639.3 56.3505 639.3 51.9737C639.3 48.3316 640.168 45.0132 641.915 42.0185C643.657 39.0301 646.31 36.6954 649.867 35.0207C653.425 33.3459 657.82 32.5054 663.045 32.5054C668.561 32.5054 673.185 32.9537 677.096 34.4603C677.697 34.6907 678.18 34.865 678.626 34.9709C678.323 33.956 678.137 33.2338 677.796 32.2626C676.079 27.3691 673.426 23.5339 668.592 21.3113C667.315 20.726 663.447 19.9603 663.076 19.2318C661.52 16.1812 667.179 15.764 669.224 14.7243C672.999 12.8005 675.317 9.72493 677.158 5.94582C677.635 4.96213 677.938 3.16286 678.248 2.08578C673.228 2.08578 672.546 1.89278 663.045 2.08578C651.262 2.32236 640.824 4.09051 632.116 8.09997C623.402 12.1157 616.615 17.8372 611.749 25.2772C606.884 32.7171 604.454 41.6139 604.454 51.9675C604.454 66.1189 609.171 77.4562 618.611 85.9919C628.05 94.5276 640.682 99.5207 656.512 100.978L668.493 101.855C678.217 102.733 685.265 104.663 689.622 107.652C693.979 110.64 696.155 114.693 696.155 119.792C696.155 123.876 694.989 127.487 692.671 130.625C690.347 133.763 686.932 136.204 682.432 137.953C677.926 139.703 672.342 140.58 665.66 140.58C658.253 140.58 652.229 139.522 647.58 137.411C642.932 135.301 639.479 132.487 637.23 128.988C634.98 125.489 633.852 121.697 633.852 117.613H599C599 127.973 601.578 137.125 606.735 145.069C611.886 153.02 619.404 159.326 629.278 163.996C639.151 168.659 651.274 171 665.654 171C679.159 171 690.775 168.883 700.506 164.656C710.23 160.428 717.749 154.445 723.048 146.713C728.347 138.987 731 130.015 731 119.798C731 109.582 728.496 101.457 723.488 94.5276C718.474 87.5982 711.544 82.1319 702.687 78.1162L702.681 78.1224Z'] },
  { cx: 815.5, d: ['M864.329 60.169C859.543 54.7704 853.834 50.5589 847.195 47.5345C840.556 44.51 833.168 43 825.028 43C815.89 43 807.682 45.0512 800.398 49.1536C793.114 53.2559 787.332 59.3777 783.052 67.5096C781.631 70.2021 780.423 73.1038 779.412 76.201V46.452H752V208H786.48V150.094C790.422 155.783 795.306 160.154 801.151 163.188C808.218 166.858 816.174 168.695 825.032 168.695C833.89 168.695 841.201 167.185 847.84 164.161C854.479 161.137 860.116 156.857 864.757 151.313C869.393 145.773 872.929 139.292 875.36 131.874C877.787 124.461 879 116.506 879 108.01V103.044C879 94.407 877.746 86.4524 875.252 79.18C872.754 71.9122 869.109 65.5722 864.329 60.1736V60.169ZM840.881 123.342C838.45 128.527 835.063 132.556 830.706 135.435C826.349 138.319 821.244 139.756 815.394 139.756C810.537 139.756 805.828 138.605 801.259 136.299C796.686 133.998 792.938 130.651 790.016 126.257C787.089 121.868 785.627 116.574 785.627 110.384V102.393C785.627 96.058 787.021 90.5912 789.804 85.9794C792.586 81.3722 796.262 77.8793 800.835 75.5052C805.404 73.1311 810.257 71.9395 815.399 71.9395C821.253 71.9395 826.354 73.3448 830.71 76.151C835.063 78.9572 838.454 82.8458 840.885 87.8123C843.312 92.7788 844.525 98.6458 844.525 105.413C844.525 112.181 843.312 118.157 840.885 123.337L840.881 123.342Z'] },
  { cx: 958, d: ['M1005.57 60.1708C999.971 54.5437 993.195 50.1104 985.226 46.8662C977.258 43.6221 968.184 42 958 42C947.816 42 939.131 43.6221 931.095 46.8662C923.059 50.1104 916.206 54.5483 910.541 60.1708C904.87 65.798 900.533 72.3227 897.519 79.7542C894.505 87.1856 893 95.0089 893 103.229V108.204C893 116.283 894.432 123.965 897.306 131.246C900.175 138.531 904.408 145.024 910.006 150.72C915.603 156.42 922.416 160.89 930.452 164.134C938.488 167.378 947.671 169 958 169C968.33 169 977.725 167.378 985.766 164.134C993.802 160.89 1000.58 156.42 1006.1 150.72C1011.62 145.024 1015.82 138.531 1018.69 131.246C1021.56 123.965 1023 116.283 1023 108.204V103.229C1023 95.0089 1021.5 87.1856 1018.48 79.7542C1015.47 72.3273 1011.16 65.798 1005.57 60.1708ZM984.905 123.135C982.607 128.33 979.235 132.367 974.788 135.251C970.337 138.14 964.744 139.579 958 139.579C951.256 139.579 946.016 138.14 941.429 135.251C936.833 132.367 933.393 128.325 931.1 123.135C928.802 117.941 927.655 112.173 927.655 105.826C927.655 99.0459 928.838 93.0952 931.204 87.9739C933.57 82.857 937.051 78.8155 941.642 75.8585C946.234 72.9059 951.686 71.4251 958 71.4251C964.314 71.4251 969.943 72.9059 974.466 75.8585C978.985 78.8155 982.43 82.857 984.796 87.9739C987.162 93.0952 988.349 99.0459 988.349 105.826C988.349 112.173 987.198 117.941 984.905 123.135Z'] },
  { cx: 1071.5, d: ['M1114 72.0547V46.7457H1079.39V15H1047.17L1047.1 46.7457H1029V72.0547H1047.05L1046.95 118.386C1046.95 130.257 1048.69 139.657 1052.15 146.59C1055.61 153.528 1061.02 158.497 1068.37 161.497C1075.72 164.5 1085.38 166 1097.35 166H1114V136.829H1096.48C1091 136.829 1086.79 135.365 1083.83 132.429C1080.87 129.502 1079.39 125.243 1079.39 119.669V72.0502H1114V72.0547Z'] },
]

const ESTRELA_SPOT =
  'M676.276 18.9946C676.67 19.7525 680.738 20.5472 682.082 21.1523C687.173 23.4568 689.959 27.4423 691.765 32.5219C692.215 33.7933 691.968 34.9547 693.244 36H694.039C696.492 34.8753 696.406 31.6233 697.688 29.1294C699.297 25.9997 701.848 23.3773 704.949 21.6841C707.377 20.3638 709.923 20.1926 712 18.585V17.7904C711.051 15.3942 708.123 15.6204 705.867 14.5751C701.547 12.5701 698.391 8.64582 696.646 4.32416C695.993 2.69208 696.418 0.0880825 694.218 0.00250512C691.58 -0.0952975 692.122 2.69208 691.327 4.60534C689.651 8.64581 686.717 12.3012 682.748 14.3C680.596 15.382 674.642 15.816 676.282 18.9823L676.276 18.9946Z'

// --- Geometria ---------------------------------------------------------

const LARGURA = 1114;
const ALTURA = 208;

// Linha de base e topo das minúsculas no logo do TradeSpot (o "r" vai de 47 a 164).
const BASE_SPOT = 164;
const MEIO_LETRA = 105;

// Encaixe do tradestars nas medidas do TradeSpot: mesma altura de minúscula
// (117 no TradeSpot, 82,5 no tradestars) e mesma linha de base (125 no tradestars).
const ESCALA_TS = 117 / 82.5;
const TS_X = (LARGURA - 688 * ESCALA_TS) / 2;
const TS_Y = BASE_SPOT - 125 * ESCALA_TS;
const ENCAIXE_TS = `translate(${TS_X} ${TS_Y}) scale(${ESCALA_TS})`;
const xTS = (x: number) => TS_X + x * ESCALA_TS;

// "trade" são as 5 primeiras letras do tradestars; o resto é "stars".
const TRADE = 5;

// A palavra final é o "trade" minúsculo do tradestars + o "Spot" do TradeSpot,
// com a mesma folga entre o "e" e o "S" do logo (584 → 599). Para a palavra
// ficar centralizada, o "trade" anda DX_TRADE na troca e o "Spot" é desenhado
// DX_SPOT antes de onde está no arquivo.
const INICIO_SPOT = 599;
const FOLGA = INICIO_SPOT - 584;
const LARGURA_SPOT = LARGURA - INICIO_SPOT;
const LARGURA_TRADE = 348.8 * ESCALA_TS;
const INICIO = (LARGURA - (LARGURA_TRADE + FOLGA + LARGURA_SPOT)) / 2;
const DX_TRADE = INICIO - TS_X;
const DX_SPOT = INICIO + LARGURA_TRADE + FOLGA - INICIO_SPOT;

// Onde a estrela está: no tradestars, e no "S" já deslocado (centro do
// desenho da estrela no logo: 694, 18).
const ESTRELA_TS = { x: xTS(672.7), y: TS_Y + 46.4 * ESCALA_TS };
const ESTRELA_SP = { x: 694 + DX_SPOT, y: 18 };

// Quanto a câmera anda para pôr a estrela no centro.
const ATE_O_CENTRO = `translate(${LARGURA / 2 - ESTRELA_SP.x}px, ${ALTURA / 2 - ESTRELA_SP.y}px)`;

const ms = (s: number) => s * 1000;
const DURACAO = ms(TEMPOS.fim);

interface AberturaProps {
  /** Contexto criado no clique (prepararSomAbertura); null = sem som. */
  som?: AudioContext | null;
  /** Chamado ao fim da vinheta ou ao pular. */
  aoTerminar: () => void;
}

export default function Abertura({ som = null, aoTerminar }: AberturaProps) {
  const camera = useRef<SVGGElement>(null);
  const letrasTS = useRef<(SVGGElement | null)[]>([]);
  const letrasSP = useRef<(SVGGElement | null)[]>([]);
  const voo = useRef<SVGGElement>(null);
  const estrela = useRef<SVGGElement>(null);
  const desenhoTS = useRef<SVGGElement>(null);
  const desenhoSP = useRef<SVGGElement>(null);
  const clarao = useRef<HTMLDivElement>(null);
  const terminar = useRef(aoTerminar);
  const pararSom = useRef<() => void>(() => {});
  terminar.current = aoTerminar;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      terminar.current();
      return;
    }

    const anims: Animation[] = [];
    const animar = (el: Element | null, quadros: Keyframe[], opcoes: KeyframeAnimationOptions) => {
      if (el) anims.push(el.animate(quadros, opcoes));
    };
    const p = (t: number) => ms(t) / DURACAO; // offset de um quadro-chave da câmera
    const entrada = 'cubic-bezier(.2,.7,.2,1)';
    const T = TEMPOS;

    // --- tradestars entrando, da esquerda para a direita. A estrela entra
    // junto com a última letra.
    [...letrasTS.current, estrela.current].forEach((el, i) => {
      animar(
        el,
        [
          { opacity: 0, transform: 'translateY(10px) scale(1.12)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ],
        { duration: 520, delay: ms(T.letras) + i * 45, easing: entrada, fill: 'both' },
      );
    });

    // --- A troca.
    const troca = ms(T.troca);

    // O "trade" fica: só desliza, abrindo espaço para o "Spot".
    letrasTS.current.slice(0, TRADE).forEach((el, i) => {
      animar(
        el,
        [{ transform: 'translateX(0)' }, { transform: `translateX(${DX_TRADE / ESCALA_TS}px)` }],
        { duration: 650, delay: troca + 60 + i * 25, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
      );
    });

    // Profundidade de campo: "stars" se afasta para o fundo (encolhe e
    // desfoca) e "Spot" vem da frente, grande e desfocado, até entrar em foco.
    letrasTS.current.slice(TRADE).forEach((el, i) => {
      animar(
        el,
        [
          { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
          { offset: 0.7, opacity: 0 },
          { opacity: 0, transform: 'translateY(-14px) scale(0.45)', filter: 'blur(4px)' },
        ],
        { duration: 380, delay: troca + i * 35, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' },
      );
    });
    letrasSP.current.forEach((el, i) => {
      animar(
        el,
        [
          { opacity: 0, transform: 'translateY(30px) scale(2.2)', filter: 'blur(10px)' },
          { offset: 0.75, opacity: 1, transform: 'translateY(0) scale(0.96)', filter: 'blur(0px)' },
          { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
        ],
        { duration: 560, delay: troca + 240 + i * 60, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
      );
    });

    // A estrela salta em arco do "s" até o "S", dando meia volta (tem 4
    // pontas, então 180° termina igual a como começou). No meio do caminho o
    // desenho do tradestars dá lugar ao do TradeSpot.
    const pos = ({ x, y }: { x: number; y: number }) => `translate(${x}px, ${y}px)`;
    const topo = { x: (ESTRELA_TS.x + ESTRELA_SP.x) / 2, y: -60 };
    const duracaoVoo = ms(T.pouso - T.troca);
    animar(
      voo.current,
      [
        { transform: `${pos(ESTRELA_TS)} rotate(0deg) scale(1)`, easing: 'cubic-bezier(.3,0,.6,1)' },
        { offset: 0.12, transform: `${pos({ x: ESTRELA_TS.x + 8, y: ESTRELA_TS.y + 6 })} rotate(-12deg) scale(0.9)`, easing: 'cubic-bezier(.2,.6,.4,1)' },
        { offset: 0.55, transform: `${pos(topo)} rotate(100deg) scale(1.7)`, easing: 'cubic-bezier(.6,0,.8,.6)' },
        { transform: `${pos(ESTRELA_SP)} rotate(180deg) scale(1)` },
      ],
      { duration: duracaoVoo, delay: troca, fill: 'both' },
    );
    const meioDoVoo: KeyframeAnimationOptions = { duration: 200, delay: troca + duracaoVoo * 0.45, fill: 'forwards' };
    animar(desenhoTS.current, [{ opacity: 1 }, { opacity: 0 }], meioDoVoo);
    animar(desenhoSP.current, [{ opacity: 0 }, { opacity: 1 }], meioDoVoo);

    // 2ª batida: a estrela pousa e pisca. Depois, o brilho de quando fica sozinha.
    const sombra = (r: number, a: number) => `drop-shadow(0 0 ${r}px rgba(255,255,255,${a}))`;
    animar(
      estrela.current,
      [
        { transform: 'scale(1) rotate(0deg)', filter: sombra(0, 0) },
        { offset: 0.2, transform: 'scale(1.9) rotate(45deg)', filter: sombra(10, 0.9) },
        { transform: 'scale(1) rotate(90deg)', filter: sombra(3, 0.4) },
      ],
      { duration: 650, delay: ms(T.pouso), easing: 'ease-out', fill: 'forwards' },
    );
    animar(
      estrela.current,
      [
        { transform: 'scale(1) rotate(90deg)', filter: sombra(3, 0.4) },
        { offset: 0.4, transform: 'scale(1.25) rotate(135deg)', filter: sombra(8, 1) },
        { transform: 'scale(1) rotate(180deg)', filter: sombra(4, 0.6) },
      ],
      { duration: 500, delay: ms(T.sozinha), easing: 'ease-in-out', fill: 'forwards' },
    );

    // --- tradeSpot recolhendo para a estrela: a letra mais perto vai primeiro.
    // As do "trade" estão dentro do encaixe do tradestars, então o caminho
    // delas é medido nas unidades de lá (÷ ESCALA_TS) e parte do deslize da troca.
    const pecasFinais = [
      ...TRADESTARS.slice(0, TRADE).map((l, i) => ({
        el: letrasTS.current[i],
        cx: xTS(l.cx) + DX_TRADE,
        escala: ESCALA_TS,
        base: DX_TRADE / ESCALA_TS,
      })),
      ...SPOT.map((l, i) => ({ el: letrasSP.current[i], cx: l.cx + DX_SPOT, escala: 1, base: 0 })),
    ];
    pecasFinais
      .sort((a, b) => Math.abs(ESTRELA_SP.x - a.cx) - Math.abs(ESTRELA_SP.x - b.cx))
      .forEach(({ el, cx, escala, base }, n) => {
        const dx = base + (ESTRELA_SP.x - cx) / escala;
        const dy = (ESTRELA_SP.y - MEIO_LETRA) / escala;
        animar(
          el,
          [
            { opacity: 1, transform: `translate(${base}px, 0px) scale(1)` },
            { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0.15)` },
          ],
          { duration: 520, delay: ms(T.recolhe) + n * 40, easing: 'cubic-bezier(.6,0,.9,.5)', fill: 'forwards' },
        );
      });

    // --- A "câmera": aproxima de leve, pulsa nas duas batidas, leva a estrela
    // ao centro e mergulha nela.
    const parado = 'translate(0px, 0px)';
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
    );

    // O clarão: a tela fica branca no fim do mergulho e volta ao preto.
    animar(
      clarao.current,
      [{ opacity: 0 }, { offset: 0.55, opacity: 1 }, { opacity: 0 }],
      { duration: 650, delay: ms(T.mergulho + 0.25), easing: 'ease-in-out', fill: 'both' },
    );

    pararSom.current = tocarSomAbertura(som);
    const fim = setTimeout(() => terminar.current(), DURACAO);

    // Espaço pula (é o que o aviso na tela diz); Esc também, por costume.
    function teclado(e: KeyboardEvent) {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        pular();
      }
    }
    window.addEventListener('keydown', teclado);

    return () => {
      clearTimeout(fim);
      window.removeEventListener('keydown', teclado);
      anims.forEach((a) => a.cancel());
      pararSom.current();
    };
  }, [som]);

  function pular() {
    pararSom.current();
    terminar.current();
  }

  const peca: React.CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center', opacity: 0 };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#070707] text-white">
      <p className="sr-only" role="status">
        Entrando no TradeSpot
      </p>
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        fill="currentColor"
        aria-hidden="true"
        className="w-[min(80vw,760px)] overflow-visible"
      >
        <g
          ref={camera}
          style={{ transformBox: 'view-box', transformOrigin: `${ESTRELA_SP.x}px ${ESTRELA_SP.y}px` }}
        >
          <g transform={ENCAIXE_TS}>
            {TRADESTARS.map((letra, i) => (
              <g key={letra.cx} ref={(el) => { letrasTS.current[i] = el; }} style={peca}>
                {letra.d.map((d) => (
                  <path key={d.slice(0, 24)} d={d} />
                ))}
              </g>
            ))}
          </g>

          <g transform={`translate(${DX_SPOT} 0)`}>
            {SPOT.map((letra, i) => (
              <g key={letra.cx} ref={(el) => { letrasSP.current[i] = el; }} style={peca}>
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
              <g ref={desenhoSP} transform="translate(-694 -18)" style={{ opacity: 0 }}>
                <path d={ESTRELA_SPOT} />
              </g>
            </g>
          </g>
        </g>
      </svg>

      <div ref={clarao} className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: 0 }} />

      {/* Aviso centralizado no pé da tela. Continua sendo botão: no celular
          não há espaço para apertar, e o toque nele também pula. */}
      <button
        type="button"
        onClick={pular}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-sm text-white opacity-60 transition-opacity hover:opacity-100"
      >
        Pressione
        <kbd className="rounded-sm border border-white px-2 py-0.5 font-sans">espaço</kbd>
        para pular
      </button>
    </div>
  );
}
