export interface SensorData {
  sensor?: number | string;
  sensor_id?: number | string;
  balanca?: number | string;
  peso?: number | string;
  weight?: number | string;
  value?: number | string;

  peso_sensor_1?: number | string;
  peso_sensor_2?: number | string;
  pesoSensor1?: number | string;
  pesoSensor2?: number | string;

  sensor1?: number | string;
  sensor2?: number | string;

  produto?: string;
  produtoNome?: string;
  product?: string;

  timestamp?: string;
  data?: string;
  data_hora?: string;

  pessoa_id?: string | number;
  pessoaId?: string | number;

  pessoa_nome?: string;
  pessoaNome?: string;

  fingerprint_id?: number | string;
  fingerprintId?: number | string;

  status?: string;
  estado?: string;

  confirmado?: boolean;
  id?: string | number;
  printed?: boolean;
}

export interface FingerprintData {
  status?: string;
  estado?: string;

  id?: number | string;
  fingerprint_id?: number | string;
  fingerprintId?: number | string;

  nome?: string;
  pessoa_nome?: string;
  pessoaNome?: string;

  pessoa_id?: string | number;
  pessoaId?: string | number;

  message?: string;
  mensagem?: string;

  confidence?: number | string;

  timestamp?: string | null;
}

export interface WeighingSensor1 {
  id: string;
  product: string;
  weight: number;
  status: string;
  timestamp: string;

  pessoaId?: string;
  pessoaNome?: string;
  fingerprintId?: number;
  printed?: boolean;
}

export interface WeighingSensor2 {
  id: string;
  product: string;
  weight: number;
  status: string;
  timestamp: string;

  pessoaId?: string;
  pessoaNome?: string;
  fingerprintId?: number;
}

export interface Person {
  id: number;
  nome: string;
  status: string;
  timestamp: string;
}