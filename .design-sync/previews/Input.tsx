import { Input } from '@tradespot/ui';

export const ComRotulo = () => (
  <div style={{ width: 320 }}>
    <Input label="Nome do lead" placeholder="Ex.: Marina Souza" defaultValue="Marina Souza" />
  </div>
);

export const ComErro = () => (
  <div style={{ width: 320 }}>
    <Input label="Telefone" defaultValue="1199" error="Informe o telefone com DDD." />
  </div>
);
