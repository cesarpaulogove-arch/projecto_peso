
// ============================================================
// DADOS DOS SENSORES / MQTT
// ============================================================

export interface SensorData {
  sensor?: number | string;
  sensor_id?: number | string;
  balanca?: number | string;

  // ----------------------------------------------------------
  // Identificação explícita da origem do evento
  // ----------------------------------------------------------

  tipo?: string;
  type?: string;
  origem?: string;

  // ----------------------------------------------------------
  // Peso
  // ----------------------------------------------------------

  peso?: number | string;
  weight?: number | string;
  value?: number | string;

  peso_sensor_1?: number | string;
  peso_sensor_2?: number | string;

  pesoSensor1?: number | string;
  pesoSensor2?: number | string;

  sensor1?: number | string;
  sensor2?: number | string;

  // ----------------------------------------------------------
  // Produto
  // ----------------------------------------------------------

  produto?: string;
  produtoNome?: string;
  product?: string;

  // ----------------------------------------------------------
  // Data / hora
  // ----------------------------------------------------------

  timestamp?: string;
  data?: string;
  data_hora?: string;

  // ----------------------------------------------------------
  // Pessoa
  // ----------------------------------------------------------

  pessoa_id?: string | number;
  pessoaId?: string | number;

  pessoa_nome?: string;
  pessoaNome?: string;

  // ----------------------------------------------------------
  // Fingerprint
  // ----------------------------------------------------------

  fingerprint_id?: number | string;
  fingerprintId?: number | string;

  // ----------------------------------------------------------
  // Estado
  // ----------------------------------------------------------

  status?: string;
  estado?: string;

  confirmado?: boolean;

  // ----------------------------------------------------------
  // Identificador MQTT
  // ----------------------------------------------------------

  id?: string | number;

  // ----------------------------------------------------------
  // Impressão
  // ----------------------------------------------------------

  printed?: boolean;
}

// ============================================================
// FINGERPRINT
// ============================================================

export interface FingerprintData {
  // ----------------------------------------------------------
  // Estado
  // ----------------------------------------------------------

  status?: string;
  estado?: string;

  // ----------------------------------------------------------
  // Origem
  // ----------------------------------------------------------

  tipo?: string;
  type?: string;
  origem?: string;

  // ----------------------------------------------------------
  // IDs
  // ----------------------------------------------------------

  id?: number | string;

  fingerprint_id?: number | string;
  fingerprintId?: number | string;

  pessoa_id?: string | number;
  pessoaId?: string | number;

  // ----------------------------------------------------------
  // Pessoa
  // ----------------------------------------------------------

  nome?: string;
  pessoa_nome?: string;
  pessoaNome?: string;

  // ----------------------------------------------------------
  // Mensagem
  // ----------------------------------------------------------

  message?: string;
  mensagem?: string;

  // ----------------------------------------------------------
  // Confiança do reconhecimento
  // ----------------------------------------------------------

  confidence?: number | string;
  confianca?: number | string;

  // ----------------------------------------------------------
  // Data / hora
  // ----------------------------------------------------------

  timestamp?: string | null;
  data?: string;
  data_hora?: string;

  // ----------------------------------------------------------
  // Resultado da identificação
  // ----------------------------------------------------------

  autorizado?: boolean;
  recognized?: boolean;
  encontrado?: boolean;

  // ----------------------------------------------------------
  // Dispositivo
  // ----------------------------------------------------------

  device?: string;
  dispositivo?: string;
}

// ============================================================
// HISTÓRICO EXCLUSIVO DA BALANÇA 1
// ============================================================

export interface WeighingSensor1 {
  /**
   * Identificador único do registro.
   */
  id: string;

  /**
   * Produto pesado.
   */
  product: string;

  /**
   * Peso registrado.
   */
  weight: number;

  /**
   * Estado do registro.
   */
  status: string;

  /**
   * Data e hora do registro.
   */
  timestamp: string;
}

// ============================================================
// HISTÓRICO EXCLUSIVO DA BALANÇA 2
// ============================================================

export interface WeighingSensor2 {
  /**
   * Identificador único do registro.
   */
  id: string;

  /**
   * Produto que estava sendo pesado.
   */
  product: string;

  /**
   * Peso atual que provocou
   * a criação do registro.
   */
  weight: number;

  /**
   * Estado do registro.
   *
   * Exemplos:
   * "automatico"
   * "confirmado"
   */
  status: string;

  /**
   * Data e hora da alteração.
   */
  timestamp: string;

  /**
   * Peso imediatamente anterior.
   */
  pesoAnterior?: number;

  /**
   * Diferença entre o peso anterior
   * e o peso atual.
   */
  diferenca?: number;

  /**
   * Indica que o registro foi
   * criado automaticamente.
   */
  automatico?: boolean;
}

// ============================================================
// HISTÓRICO EXCLUSIVO DO FINGERPRINT
// ============================================================

export interface FingerprintHistory {
  /**
   * Identificador ÚNICO de cada utilização.
   *
   * IMPORTANTE:
   * Não utilizar o fingerprintId como ID deste registro.
   *
   * A mesma pessoa pode utilizar a fingerprint
   * várias vezes e cada utilização deve criar
   * uma nova linha.
   */
  id: string;

  /**
   * ID cadastrado no sensor biométrico.
   *
   * Exemplo:
   * fingerprintId = 5
   */
  fingerprintId?: number;

  /**
   * ID da pessoa cadastrada no frontend.
   */
  pessoaId?: string;

  /**
   * Nome da pessoa reconhecida.
   */
  pessoaNome?: string;

  /**
   * Percentagem / valor de confiança
   * devolvido pelo sensor.
   */
  confidence?: number;

  /**
   * O histórico de utilização contém
   * somente fingerprints autorizadas.
   *
   * Portanto, para os registros guardados
   * no localStorage, este valor será sempre true.
   */
  autorizado: boolean;

  /**
   * Estado original recebido do ESP32.
   *
   * Exemplos:
   * "identificado"
   * "recognized"
   * "authorized"
   */
  status: string;

  /**
   * Mensagem enviada pelo ESP32.
   */
  mensagem?: string;

  /**
   * Data e hora da utilização.
   */
  timestamp: string;

  /**
   * Dispositivo que realizou
   * o reconhecimento.
   */
  dispositivo?: string;
}

// ============================================================
// PESSOA CADASTRADA
// ============================================================

export interface Person {
  /**
   * ID utilizado para relacionar
   * a pessoa à fingerprint.
   */
  id: number;

  /**
   * Nome da pessoa.
   */
  nome: string;

  /**
   * Estado do cadastro.
   *
   * Exemplo:
   * "cadastrado"
   */
  status: string;

  /**
   * Data e hora do cadastro.
   */
  timestamp: string;
}

