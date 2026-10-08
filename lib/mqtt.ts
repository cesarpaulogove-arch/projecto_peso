"use client";

import mqtt, {
  MqttClient,
  IClientOptions,
} from "mqtt";

/* ============================================================
   TIPOS
============================================================ */

export interface MqttHandlers {
  onStatus?: (
    status: string
  ) => void;

  onConnect?: () => void;

  onDisconnect?: () => void;

  onError?: (
    error: Error
  ) => void;

  onMessageError?: (
    message: string
  ) => void;
}

export interface MqttConnectionOptions
  extends MqttHandlers {
  onMessage: (
    topic: string,
    data: unknown
  ) => void;
}

/* ============================================================
   PAYLOAD BALANÇAS
============================================================ */

export interface SensorPayload {
  sensor?: number | string | null;
  sensor_id?: number | string | null;
  balanca?: number | string | null;

  tipo?: string;
  type?: string;
  origem?: string;

  peso?: number | string | null;
  weight?: number | string | null;
  value?: number | string | null;

  peso_sensor_1?: number | string | null;
  peso_sensor_2?: number | string | null;

  pesoSensor1?: number | string | null;
  pesoSensor2?: number | string | null;

  sensor1?: number | string | null;
  sensor2?: number | string | null;

  unidade?: string;

  produto?: string;
  produtoNome?: string;
  produto_nome?: string;
  product?: string;

  timestamp?: number | string | null;

  data?: string | null;

  hora?: string | null;

  data_hora?: string | null;

  dataHora?: string | null;

  stable?: boolean;

  occupied?: boolean;

  confirmado?: boolean;

  estado?: string;

  status?: string;

  printed?: boolean;

  id?: string | number;
}

/* ============================================================
   PAYLOAD FINGERPRINT
============================================================ */

export interface FingerprintPayload {
  status?: string | null;

  estado?: string | null;

  tipo?: string;

  type?: string;

  origem?: string;

  id?: number | string | null;

  fingerprint_id?: number | string | null;

  fingerprintId?: number | string | null;

  nome?: string | null;

  pessoa_nome?: string | null;

  pessoaNome?: string | null;

  pessoa_id?: string | number | null;

  pessoaId?: string | number | null;

  message?: string | null;

  mensagem?: string | null;

  confidence?: number | string | null;

  confianca?: number | string | null;

  timestamp?: number | string | null;

  data?: string | null;

  hora?: string | null;

  data_hora?: string | null;

  dataHora?: string | null;

  autorizado?: boolean;

  recognized?: boolean;

  encontrado?: boolean;

  printed?: boolean;

  device?: string;

  dispositivo?: string;
}

/* ============================================================
   PAYLOAD HISTÓRICO
============================================================ */

export interface WeighingHistoryPayload {
  id?: string | number;

  sensor?: number | string | null;

  sensor_id?: number | string | null;

  balanca?: number | string | null;

  tipo?: string;

  type?: string;

  origem?: string;

  product?: string;

  produto?: string;

  produtoNome?: string;

  produto_nome?: string;

  sensor1?: number | string | null;

  sensor2?: number | string | null;

  peso_sensor_1?: number | string | null;

  peso_sensor_2?: number | string | null;

  pesoSensor1?: number | string | null;

  pesoSensor2?: number | string | null;

  peso?: number | string | null;

  weight?: number | string | null;

  value?: number | string | null;

  peso_total?: number | string | null;

  difference?: number | string | null;

  peso_anterior?: number | string | null;

  peso_atual?: number | string | null;

  automatico?: boolean;

  status?: string;

  estado?: string;

  confirmado?: boolean;

  printed?: boolean;

  timestamp?: number | string | null;

  data?: string | null;

  hora?: string | null;

  data_hora?: string | null;

  dataHora?: string | null;

  date?: string | null;

  pessoa_id?: number | string | null;

  pessoa_nome?: string | null;

  pessoaId?: number | string | null;

  pessoaNome?: string | null;

  fingerprint_id?: number | string | null;

  fingerprintId?: number | string | null;
}

/* ============================================================
   EVENTO AUTOMÁTICO BALANÇA 2
============================================================ */

export interface Balanca2AutomaticHistoryPayload
  extends WeighingHistoryPayload {

  automatico: true;

  balanca: 2;

  peso_anterior: number;

  peso_atual: number;

  difference: number;

  timestamp: number;

  timestampIso: string;

  dataHora: string;
}
/* ============================================================
   TÓPICOS MQTT
============================================================ */

export const MQTT_TOPICS = {
  weight1:
    "armazem/esp32/peso/1",

  weight2:
    "armazem/esp32/peso/2",

  history1:
    "armazem/esp32/pesagem/historico/1",

  history2:
    "armazem/esp32/pesagem/historico/2",

  fingerprint:
    "armazem/esp32/fingerprint",

  printerStatus:
    "armazem/esp32/printer/status",

  status:
    "armazem/esp32/status",

  command:
    "armazem/esp32/comando",

} as const;

/* ============================================================
   CLIENTE MQTT GLOBAL
============================================================ */

let mqttClient:
  | MqttClient
  | null = null;

let mqttConnecting = false;

let mqttManualDisconnect = false;

let mqttSubscriptionsReady = false;

/* ============================================================
   ESTADO ANTERIOR BALANÇA 2
============================================================ */

let pesoAnteriorBalanca2:
  number | null = null;

/* ============================================================
   CALLBACKS
============================================================ */

let currentOnMessage:
  | ((
      topic: string,
      data: unknown
    ) => void)
  | null = null;

let currentHandlers:
  MqttHandlers = {};

/* ============================================================
   CALLBACK STATUS
============================================================ */

function notifyStatus(
  status: string
): void {
  try {
    currentHandlers.onStatus?.(
      status
    );
  } catch (error) {
    console.error(
      "Erro no handler de status MQTT:",
      error
    );
  }
}

/* ============================================================
   CALLBACK CONNECT
============================================================ */

function notifyConnect(): void {
  try {
    currentHandlers.onConnect?.();
  } catch (error) {
    console.error(
      "Erro no handler onConnect:",
      error
    );
  }
}

/* ============================================================
   CALLBACK DISCONNECT
============================================================ */

function notifyDisconnect(): void {
  try {
    currentHandlers.onDisconnect?.();
  } catch (error) {
    console.error(
      "Erro no handler onDisconnect:",
      error
    );
  }
}

/* ============================================================
   CALLBACK ERROR
============================================================ */

function notifyError(
  error: Error
): void {
  try {
    currentHandlers.onError?.(
      error
    );
  } catch (handlerError) {
    console.error(
      "Erro no handler de erro MQTT:",
      handlerError
    );
  }
}

/* ============================================================
   CALLBACK MESSAGE ERROR
============================================================ */

function notifyMessageError(
  message: string
): void {
  try {
    currentHandlers.onMessageError?.(
      message
    );
  } catch (error) {
    console.error(
      "Erro no handler de mensagem MQTT:",
      error
    );
  }
}

/* ============================================================
   LISTA DE TÓPICOS
============================================================ */

function getMqttTopics(): string[] {
  return [
    MQTT_TOPICS.weight1,
    MQTT_TOPICS.weight2,
    MQTT_TOPICS.history1,
    MQTT_TOPICS.history2,
    MQTT_TOPICS.fingerprint,
    MQTT_TOPICS.printerStatus,
    MQTT_TOPICS.status,
  ];
}

/* ============================================================
   PAYLOAD → STRING
============================================================ */

function payloadToString(
  payload: Buffer
): string {
  try {
    return payload.toString(
      "utf8"
    );
  } catch {
    return String(
      payload
    );
  }
}

/* ============================================================
   PARSE JSON
============================================================ */

function parsePayload(
  texto: string
): unknown {
  const trimmed =
    texto.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(
      trimmed
    );
  } catch {
    return trimmed;
  }
}

/* ============================================================
   FORMATAR DATA/HORA
============================================================ */

function formatDateTime(
  timestamp: number
): string {

  const date =
    new Date(
      timestamp
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  /*
   * pt-MZ = formato:
   *
   * DD/MM/AAAA HH:mm:ss
   *
   * Mantemos a hora local do navegador.
   */
  return date.toLocaleString(
    "pt-MZ",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

/* ============================================================
   ISO
============================================================ */

function timestampToIso(
  timestamp: number
): string {

  const date =
    new Date(
      timestamp
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

/* ============================================================
   NORMALIZAR TIMESTAMP
============================================================ */

/*
   Aceita:

   Unix segundos:
   1791430938

   Unix milissegundos:
   1791430938000

   String numérica:
   "1791430938"

   ISO:
   "2026-10-08T12:30:00.000Z"

   Data:
   "2026-10-08 12:30:00"

   Retorna SEMPRE milissegundos.
*/

function normalizeTimestamp(
  value: unknown
): number | undefined {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  /* ==========================================================
     DATE
  ========================================================== */

  if (
    value instanceof Date
  ) {

    const time =
      value.getTime();

    return Number.isFinite(
      time
    )
      ? time
      : undefined;
  }

  /* ==========================================================
     NUMBER
  ========================================================== */

  if (
    typeof value ===
    "number"
  ) {

    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {
      return undefined;
    }

    /*
     * Unix em segundos.
     */
    if (
      value <
      100000000000
    ) {

      return Math.round(
        value * 1000
      );
    }

    /*
     * Unix em milissegundos.
     */
    return Math.round(
      value
    );
  }

  /* ==========================================================
     STRING
  ========================================================== */

  const texto =
    String(
      value
    ).trim();

  if (!texto) {
    return undefined;
  }

  /*
   * String numérica.
   */
  if (
    /^-?\d+(\.\d+)?$/.test(
      texto
    )
  ) {

    const numero =
      Number(
        texto
      );

    if (
      !Number.isFinite(
        numero
      ) ||
      numero <= 0
    ) {
      return undefined;
    }

    if (
      numero <
      100000000000
    ) {

      return Math.round(
        numero * 1000
      );
    }

    return Math.round(
      numero
    );
  }

  /*
   * ISO / data normal.
   */
  const parsed =
    new Date(
      texto
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return undefined;
  }

  return parsed.getTime();
}

/* ============================================================
   EXTRAIR TIMESTAMP DO PAYLOAD
============================================================ */

function getPayloadTimestamp(
  payload: Record<
    string,
    unknown
  >
): number {

  /*
   * 1. timestamp
   */
  const timestamp =
    normalizeTimestamp(
      payload.timestamp
    );

  if (
    timestamp !== undefined
  ) {
    return timestamp;
  }

  /*
   * 2. dataHora
   */
  const dataHora =
    payload.dataHora;

  if (
    dataHora !== undefined &&
    dataHora !== null &&
    String(
      dataHora
    ).trim()
  ) {

    const parsed =
      normalizeTimestamp(
        dataHora
      );

    if (
      parsed !== undefined
    ) {
      return parsed;
    }
  }

  /*
   * 3. data_hora
   */
  const dataHoraSnake =
    payload.data_hora;

  if (
    dataHoraSnake !== undefined &&
    dataHoraSnake !== null &&
    String(
      dataHoraSnake
    ).trim()
  ) {

    const parsed =
      normalizeTimestamp(
        dataHoraSnake
      );

    if (
      parsed !== undefined
    ) {
      return parsed;
    }
  }

  /*
   * 4. data + hora
   */
  const data =
    payload.data;

  const hora =
    payload.hora;

  if (
    data !== undefined &&
    data !== null
  ) {

    const textoData =
      String(
        data
      ).trim();

    const textoHora =
      hora !== undefined &&
      hora !== null
        ? String(
            hora
          ).trim()
        : "";

    const combinado =
      textoHora
        ? `${textoData} ${textoHora}`
        : textoData;

    const parsed =
      normalizeTimestamp(
        combinado
      );

    if (
      parsed !== undefined
    ) {
      return parsed;
    }
  }

  /*
   * 5. Se o ESP32 não mandou data,
   * usamos o momento em que o MQTT
   * recebeu o evento.
   */
  return Date.now();
}

/* ============================================================
   NORMALIZAR DATA DO HISTÓRICO
============================================================ */

function normalizeHistoryDate(
  data: unknown
): unknown {

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return data;
  }

  const original =
    data as Record<
      string,
      unknown
    >;

  const result = {
    ...original,
  };

  /*
   * IMPORTANTE:
   *
   * Sempre cria uma data/hora.
   */
  const timestamp =
    getPayloadTimestamp(
      result
    );

  /*
   * Timestamp interno:
   * milissegundos.
   */
  result.timestamp =
    timestamp;

  /*
   * Timestamp ISO.
   *
   * Campo adicional para facilitar
   * persistência e ordenação.
   */
  result.timestampIso =
    timestampToIso(
      timestamp
    );

  /*
   * Data/hora pronta para a tabela.
   */
  result.dataHora =
    formatDateTime(
      timestamp
    );

  /*
   * Também mantemos data_hora
   * para compatibilidade com o ESP32.
   */
  result.data_hora =
    formatDateTime(
      timestamp
    );

  /*
   * Data separada.
   */
  const date =
    new Date(
      timestamp
    );

  result.data =
    date.toLocaleDateString(
      "pt-MZ",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );

  /*
   * Hora separada.
   */
  result.hora =
    date.toLocaleTimeString(
      "pt-MZ",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );

  return result;
}

/* ============================================================
   NORMALIZAR PESO
============================================================ */

function normalizeWeight(
  data: unknown
): unknown {

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return data;
  }

  const original =
    data as Record<
      string,
      unknown
    >;

  const result = {
    ...original,
  };

  const rawWeight =
    result.peso ??
    result.weight ??
    result.value ??
    result.peso_sensor_1 ??
    result.pesoSensor1 ??
    result.sensor1 ??
    result.peso_sensor_2 ??
    result.pesoSensor2 ??
    result.sensor2;

  if (
    rawWeight !== undefined &&
    rawWeight !== null
  ) {

    const numericWeight =
      Number(
        rawWeight
      );

    if (
      Number.isFinite(
        numericWeight
      )
    ) {

      result.peso =
        numericWeight;

      result.weight =
        numericWeight;

      result.value =
        numericWeight;

    }
  }

  return result;
}

/* ============================================================
   NORMALIZAR FINGERPRINT
============================================================ */

function normalizeFingerprint(
  data: unknown
): unknown {

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return data;
  }

  const original =
    data as Record<
      string,
      unknown
    >;

  const result = {
    ...original,
  };

  /* ==========================================================
     ID FINGERPRINT
  ========================================================== */

  const rawFingerprintId =
    result.fingerprint_id ??
    result.fingerprintId ??
    result.id;

  if (
    rawFingerprintId !== undefined &&
    rawFingerprintId !== null
  ) {

    const numericId =
      Number(
        rawFingerprintId
      );

    if (
      Number.isFinite(
        numericId
      )
    ) {

      result.id =
        numericId;

      result.fingerprint_id =
        numericId;

      result.fingerprintId =
        numericId;
    }
  }

  /* ==========================================================
     ID PESSOA
  ========================================================== */

  const rawPessoaId =
    result.pessoa_id ??
    result.pessoaId;

  if (
    rawPessoaId !== undefined &&
    rawPessoaId !== null
  ) {

    const pessoaId =
      String(
        rawPessoaId
      ).trim();

    if (pessoaId) {

      result.pessoa_id =
        pessoaId;

      result.pessoaId =
        pessoaId;
    }
  }

  /* ==========================================================
     NOME
  ========================================================== */

  const rawNome =
    result.nome ??
    result.pessoa_nome ??
    result.pessoaNome;

  if (
    rawNome !== undefined &&
    rawNome !== null
  ) {

    const nome =
      String(
        rawNome
      ).trim();

    if (nome) {

      result.nome =
        nome;

      result.pessoa_nome =
        nome;

      result.pessoaNome =
        nome;
    }
  }

  /* ==========================================================
     CONFIANÇA
  ========================================================== */

  const rawConfidence =
    result.confidence ??
    result.confianca;

  if (
    rawConfidence !== undefined &&
    rawConfidence !== null
  ) {

    const confidence =
      Number(
        rawConfidence
      );

    if (
      Number.isFinite(
        confidence
      )
    ) {

      result.confidence =
        confidence;

      result.confianca =
        confidence;
    }
  }

  /* ==========================================================
     STATUS
  ========================================================== */

  const rawStatus =
    result.status ??
    result.estado;

  if (
    rawStatus !== undefined &&
    rawStatus !== null
  ) {

    const status =
      String(
        rawStatus
      ).trim();

    if (status) {

      result.status =
        status;

      result.estado =
        status;
    }
  }

  /* ==========================================================
     TIMESTAMP FINGERPRINT
  ========================================================== */

  const timestamp =
    getPayloadTimestamp(
      result
    );

  result.timestamp =
    timestamp;

  result.timestampIso =
    timestampToIso(
      timestamp
    );

  result.dataHora =
    formatDateTime(
      timestamp
    );

  result.data_hora =
    formatDateTime(
      timestamp
    );

  const date =
    new Date(
      timestamp
    );

  result.data =
    date.toLocaleDateString(
      "pt-MZ",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );

  result.hora =
    date.toLocaleTimeString(
      "pt-MZ",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );

  return result;
}

/* ============================================================
   NORMALIZAR MENSAGEM
============================================================ */

function normalizeMessage(
  topic: string,
  data: unknown
): unknown {

  /* ==========================================================
     HISTÓRICO
  ========================================================== */

  if (
    topic ===
      MQTT_TOPICS.history1 ||
    topic ===
      MQTT_TOPICS.history2
  ) {

    return normalizeHistoryDate(
      data
    );
  }

  /* ==========================================================
     FINGERPRINT
  ========================================================== */

  if (
    topic ===
    MQTT_TOPICS.fingerprint
  ) {

    return normalizeFingerprint(
      data
    );
  }

  /* ==========================================================
     PESO
  ========================================================== */

  if (
    topic ===
      MQTT_TOPICS.weight1 ||
    topic ===
      MQTT_TOPICS.weight2
  ) {

    return normalizeWeight(
      data
    );
  }

  return data;
}

/* ============================================================
   OBTER PESO BALANÇA 2
============================================================ */

export function getBalanca2Weight(
  data: unknown
): number | null {

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return null;
  }

  const payload =
    data as Record<
      string,
      unknown
    >;

  const rawWeight =
    payload.peso_sensor_2 ??
    payload.pesoSensor2 ??
    payload.sensor2 ??
    payload.peso ??
    payload.weight ??
    payload.value;

  if (
    rawWeight === undefined ||
    rawWeight === null
  ) {
    return null;
  }

  const peso =
    Number(
      rawWeight
    );

  if (
    !Number.isFinite(
      peso
    )
  ) {
    return null;
  }

  return peso;
}

/* ============================================================
   DETECTAR ALTERAÇÃO BALANÇA 2
============================================================ */

function detectAutomaticBalanca2History(
  data: unknown
): Balanca2AutomaticHistoryPayload | null {

  const pesoAtual =
    getBalanca2Weight(
      data
    );

  if (
    pesoAtual === null
  ) {

    console.warn(
      "BALANÇA 2: peso inválido."
    );

    return null;
  }

  /* ==========================================================
     PRIMEIRA LEITURA
  ========================================================== */

  if (
    pesoAnteriorBalanca2 === null
  ) {

    pesoAnteriorBalanca2 =
      pesoAtual;

    console.log(
      "BALANÇA 2: primeira leitura recebida."
    );

    console.log(
      "Peso inicial:",
      pesoAtual
    );

    return null;
  }

  /* ==========================================================
     DIFERENÇA
  ========================================================== */

  const diferenca =
    Math.abs(
      pesoAtual -
      pesoAnteriorBalanca2
    );

  console.log(
    "--------------------------------------"
  );

  console.log(
    "BALANÇA 2 - DETECÇÃO AUTOMÁTICA"
  );

  console.log(
    "Peso anterior:",
    pesoAnteriorBalanca2
  );

  console.log(
    "Peso atual:",
    pesoAtual
  );

  console.log(
    "Diferença:",
    diferenca
  );

  /* ==========================================================
     DIFERENÇA <= 1
  ========================================================== */

  if (
    diferenca <= 1
  ) {

    console.log(
      "BALANÇA 2: diferença <= 1 kg."
    );

    console.log(
      "BALANÇA 2: histórico NÃO atualizado."
    );

    console.log(
      "--------------------------------------"
    );

    return null;
  }

  /* ==========================================================
     NOVA PESAGEM
  ========================================================== */

  const pesoAnterior =
    pesoAnteriorBalanca2;

  pesoAnteriorBalanca2 =
    pesoAtual;

  const original =
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
      ? data as Record<
          string,
          unknown
        >
      : {};

  /* ==========================================================
     PRODUTO
  ========================================================== */

  const produto =
    original.produto ??
    original.produtoNome ??
    original.produto_nome ??
    original.product;

  /* ==========================================================
     DATA/HORA
  ========================================================== */

  const timestamp =
    getPayloadTimestamp(
      original
    );

  const dataHora =
    formatDateTime(
      timestamp
    );

  /* ==========================================================
     EVENTO
  ========================================================== */

  const evento:
    Balanca2AutomaticHistoryPayload = {

    ...original,

    automatico:
      true,

    balanca:
      2,

    sensor:
      2,

    sensor_id:
      2,

    peso_anterior:
      pesoAnterior,

    peso_atual:
      pesoAtual,

    peso:
      pesoAtual,

    weight:
      pesoAtual,

    value:
      pesoAtual,

    peso_sensor_2:
      pesoAtual,

    pesoSensor2:
      pesoAtual,

    difference:
      diferenca,

    confirmado:
      true,

    status:
      "automatico",

    estado:
      "automatico",

    timestamp,

    dataHora,

    data_hora:
      dataHora,

    timestampIso:
      timestampToIso(
        timestamp
      ),

    ...(produto !== undefined
      ? {
          produto:
            String(
              produto
            ),

          produtoNome:
            String(
              produto
            ),

          produto_nome:
            String(
              produto
            ),

          product:
            String(
              produto
            ),
        }
      : {}),
  };

  console.log(
    "BALANÇA 2: EVENTO AUTOMÁTICO CRIADO"
  );

  console.log(
    evento
  );

  console.log(
    "Data/Hora:",
    dataHora
  );

  console.log(
    "--------------------------------------"
  );

  return evento;
}

/* ============================================================
   SUBSCREVER
============================================================ */

function subscribeToTopics(): void {

  if (!mqttClient) {
    return;
  }

  if (
    !mqttClient.connected
  ) {
    return;
  }

  if (
    mqttSubscriptionsReady
  ) {
    return;
  }

  const topics =
    getMqttTopics();

  mqttClient.subscribe(
    topics,
    {
      qos: 1,
    },
    error => {

      if (error) {

        mqttSubscriptionsReady =
          false;

        console.error(
          "Erro ao subscrever MQTT:",
          error
        );

        notifyError(
          error
        );

        return;
      }

      mqttSubscriptionsReady =
        true;

      console.log(
        "======================================"
      );

      console.log(
        "MQTT SUBSCRITO COM SUCESSO"
      );

      topics.forEach(
        topic => {
          console.log(
            "  ✓",
            topic
          );
        }
      );

      console.log(
        "======================================"
      );
    }
  );
}

/* ============================================================
   CONECTAR MQTT
============================================================ */

export function connectMqtt(
  options:
    MqttConnectionOptions
): MqttClient | null;

export function connectMqtt(
  onMessage: (
    topic: string,
    data: unknown
  ) => void,
  handlers?: MqttHandlers
): MqttClient | null;

export function connectMqtt(
  first:
    | MqttConnectionOptions
    | ((
        topic: string,
        data: unknown
      ) => void),

  second:
    MqttHandlers = {}
): MqttClient | null {

  /* ==========================================================
     SOMENTE BROWSER
  ========================================================== */

  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  /* ==========================================================
     ARGUMENTOS
  ========================================================== */

  if (
    typeof first ===
    "function"
  ) {

    currentOnMessage =
      first;

    currentHandlers =
      second;

  } else {

    currentOnMessage =
      first.onMessage;

    currentHandlers = {

      onStatus:
        first.onStatus,

      onConnect:
        first.onConnect,

      onDisconnect:
        first.onDisconnect,

      onError:
        first.onError,

      onMessageError:
        first.onMessageError,
    };
  }

  /* ==========================================================
     CALLBACK
  ========================================================== */

  if (
    typeof currentOnMessage !==
    "function"
  ) {

    const error =
      new Error(
        "MQTT: onMessage não é uma função válida."
      );

    console.error(
      error.message
    );

    notifyError(
      error
    );

    return null;
  }

  /* ==========================================================
     JÁ CONECTADO
  ========================================================== */

  if (
    mqttClient &&
    mqttClient.connected
  ) {

    mqttConnecting =
      false;

    subscribeToTopics();

    notifyStatus(
      "Online"
    );

    notifyConnect();

    return mqttClient;
  }

  /* ==========================================================
     JÁ CONECTANDO
  ========================================================== */

  if (
    mqttClient &&
    mqttConnecting
  ) {

    return mqttClient;
  }

  /* ==========================================================
     URL
  ========================================================== */

  const mqttUrl =
    process.env
      .NEXT_PUBLIC_MQTT_URL;

  const mqttUsername =
    process.env
      .NEXT_PUBLIC_MQTT_USERNAME;

  const mqttPassword =
    process.env
      .NEXT_PUBLIC_MQTT_PASSWORD;

  if (!mqttUrl) {

    const error =
      new Error(
        "NEXT_PUBLIC_MQTT_URL não está configurada."
      );

    notifyStatus(
      "Offline"
    );

    notifyError(
      error
    );

    return null;
  }

  /* ==========================================================
     VALIDAR URL
  ========================================================== */

  if (
    !mqttUrl.startsWith(
      "ws://"
    ) &&
    !mqttUrl.startsWith(
      "wss://"
    )
  ) {

    const error =
      new Error(
        "NEXT_PUBLIC_MQTT_URL deve começar com ws:// ou wss://."
      );

    notifyStatus(
      "Offline"
    );

    notifyError(
      error
    );

    return null;
  }

  /* ==========================================================
     ESTADO
  ========================================================== */

  mqttManualDisconnect =
    false;

  mqttConnecting =
    true;

  mqttSubscriptionsReady =
    false;

  pesoAnteriorBalanca2 =
    null;

  notifyStatus(
    "Conectando"
  );

  /* ==========================================================
     OPÇÕES
  ========================================================== */

  const options:
    IClientOptions = {

    reconnectPeriod:
      3000,

    connectTimeout:
      10000,

    clean:
      true,

    keepalive:
      60,

    resubscribe:
      false,

    protocolVersion:
      4,

    clientId:
      `nextjs-armazem-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
  };

  /* ==========================================================
     AUTENTICAÇÃO
  ========================================================== */

  if (
    mqttUsername
  ) {
    options.username =
      mqttUsername;
  }

  if (
    mqttPassword
  ) {
    options.password =
      mqttPassword;
  }

  /* ==========================================================
     CRIAR CONEXÃO
  ========================================================== */

  try {

    mqttClient =
      mqtt.connect(
        mqttUrl,
        options
      );

  } catch (error) {

    mqttClient =
      null;

    mqttConnecting =
      false;

    const normalizedError =
      error instanceof Error
        ? error
        : new Error(
            String(
              error
            )
          );

    notifyStatus(
      "Offline"
    );

    notifyError(
      normalizedError
    );

    return null;
  }

  /* ==========================================================
     CONNECT
  ========================================================== */

  mqttClient.on(
    "connect",
    () => {

      mqttConnecting =
        false;

      mqttSubscriptionsReady =
        false;

      console.log(
        "======================================"
      );

      console.log(
        "MQTT CONECTADO"
      );

      console.log(
        "Broker:",
        mqttUrl
      );

      console.log(
        "======================================"
      );

      notifyStatus(
        "Online"
      );

      notifyConnect();

      subscribeToTopics();
    }
  );

  /* ==========================================================
     RECONNECT
  ========================================================== */

  mqttClient.on(
    "reconnect",
    () => {

      if (
        mqttManualDisconnect
      ) {
        return;
      }

      mqttConnecting =
        true;

      mqttSubscriptionsReady =
        false;

      console.log(
        "MQTT reconectando..."
      );

      notifyStatus(
        "Reconectando"
      );
    }
  );

  /* ==========================================================
     OFFLINE
  ========================================================== */

  mqttClient.on(
    "offline",
    () => {

      if (
        mqttManualDisconnect
      ) {
        return;
      }

      mqttSubscriptionsReady =
        false;

      console.warn(
        "MQTT offline."
      );

      notifyStatus(
        "Offline"
      );
    }
  );

  /* ==========================================================
     ERROR
  ========================================================== */

  mqttClient.on(
    "error",
    error => {

      console.error(
        "MQTT ERROR:",
        error
      );

      notifyError(
        error
      );
    }
  );

  /* ==========================================================
     CLOSE
  ========================================================== */

  mqttClient.on(
    "close",
    () => {

      mqttConnecting =
        false;

      mqttSubscriptionsReady =
        false;

      notifyDisconnect();

      if (
        mqttManualDisconnect
      ) {

        notifyStatus(
          "Offline"
        );

      } else {

        notifyStatus(
          "Reconectando"
        );
      }
    }
  );

  /* ==========================================================
     END
  ========================================================== */

  mqttClient.on(
    "end",
    () => {

      mqttConnecting =
        false;

      mqttSubscriptionsReady =
        false;

      notifyDisconnect();

      notifyStatus(
        "Offline"
      );
    }
  );

  /* ==========================================================
     MESSAGE
  ========================================================== */

  mqttClient.on(
    "message",
    (
      topic,
      payload
    ) => {

      const texto =
        payloadToString(
          payload
        ).trim();

      if (!texto) {
        return;
      }

      let data =
        parsePayload(
          texto
        );

      /*
       * AQUI está a parte principal:
       *
       * Antes de enviar para o hook,
       * normalizamos data/hora.
       */
      data =
        normalizeMessage(
          topic,
          data
        );

      /* ======================================================
         DEBUG
      ====================================================== */

      console.log(
        "======================================"
      );

      console.log(
        "MQTT RECEBIDO"
      );

      console.log(
        "TOPICO:",
        topic
      );

      console.log(
        "DADOS:",
        data
      );

      /* ======================================================
         DEBUG HISTÓRICO
      ====================================================== */

      if (
        topic ===
          MQTT_TOPICS.history1 ||
        topic ===
          MQTT_TOPICS.history2
      ) {

        if (
          data &&
          typeof data ===
            "object" &&
          !Array.isArray(data)
        ) {

          const history =
            data as Record<
              string,
              unknown
            >;

          console.log(
            "--------------------------------------"
          );

          console.log(
            "HISTÓRICO RECEBIDO"
          );

          console.log(
            "Produto:",
            history.produto ??
            history.produtoNome ??
            history.product
          );

          console.log(
            "Peso:",
            history.peso ??
            history.weight
          );

          console.log(
            "Data:",
            history.data
          );

          console.log(
            "Hora:",
            history.hora
          );

          console.log(
            "Data/Hora:",
            history.data_hora ??
            history.dataHora
          );

          console.log(
            "Timestamp:",
            history.timestamp
          );

          console.log(
            "Timestamp ISO:",
            history.timestampIso
          );

          console.log(
            "--------------------------------------"
          );
        }
      }

      console.log(
        "======================================"
      );

      /* ======================================================
         STATUS GERAL
      ====================================================== */

      if (
        topic ===
        MQTT_TOPICS.status
      ) {

        if (
          data &&
          typeof data ===
            "object" &&
          !Array.isArray(data)
        ) {

          const statusData =
            data as Record<
              string,
              unknown
            >;

          const status =
            String(
              statusData.status ??
              statusData.estado ??
              ""
            ).toLowerCase();

          if (
            status ===
              "online" ||
            status ===
              "conectado"
          ) {

            notifyStatus(
              "Online"
            );
          }
        }
      }

      /* ======================================================
         FINGERPRINT
      ====================================================== */

      if (
        topic ===
        MQTT_TOPICS.fingerprint
      ) {

        console.log(
          "FINGERPRINT RECEBIDA:"
        );

        console.log(
          data
        );

        if (
          data &&
          typeof data ===
            "object" &&
          !Array.isArray(data)
        ) {

          const fp =
            data as FingerprintPayload;

          console.log(
            "Status:",
            fp.status
          );

          console.log(
            "ID:",
            fp.id ??
            fp.fingerprint_id ??
            fp.fingerprintId
          );

          console.log(
            "Nome:",
            fp.nome ??
            fp.pessoa_nome ??
            fp.pessoaNome
          );

          console.log(
            "Confiança:",
            fp.confidence ??
            fp.confianca
          );

          console.log(
            "Data/Hora:",
            fp.dataHora
          );
        }
      }

      /* ======================================================
         BALANÇA 2
         HISTÓRICO AUTOMÁTICO
      ====================================================== */

      if (
        topic ===
        MQTT_TOPICS.weight2
      ) {

        const automaticHistory =
          detectAutomaticBalanca2History(
            data
          );

        if (
          automaticHistory !== null
        ) {

          const automaticHandler =
            currentOnMessage;

          if (
            typeof automaticHandler ===
            "function"
          ) {

            try {

              automaticHandler(
                MQTT_TOPICS.history2,
                automaticHistory
              );

            } catch (error) {

              console.error(
                "Erro ao processar histórico automático Balança 2:",
                error
              );

              notifyMessageError(
                error instanceof Error
                  ? error.message
                  : String(
                      error
                    )
              );
            }
          }
        }
      }

      /* ======================================================
         CALLBACK PRINCIPAL
      ====================================================== */

      const handler =
        currentOnMessage;

      if (
        typeof handler !==
        "function"
      ) {

        console.warn(
          "MQTT recebeu mensagem, mas não existe onMessage válido."
        );

        return;
      }

      try {

        handler(
          topic,
          data
        );

      } catch (error) {

        console.error(
          "Erro no callback MQTT:",
          error
        );

        notifyMessageError(
          error instanceof Error
            ? error.message
            : String(
                error
              )
        );
      }
    }
  );

  return mqttClient;
}

/* ============================================================
   PUBLICAR MQTT
============================================================ */

export function publishMqtt(
  topic: string,
  data: unknown
): boolean {

  if (!mqttClient) {

    console.error(
      "Cliente MQTT inexistente."
    );

    return false;
  }

  if (
    !mqttClient.connected
  ) {

    console.error(
      "MQTT não está conectado."
    );

    notifyStatus(
      "Offline"
    );

    return false;
  }

  let payload: string;

  try {

    payload =
      JSON.stringify(
        data
      );

  } catch (error) {

    console.error(
      "Erro ao serializar MQTT:",
      error
    );

    return false;
  }

  try {

    mqttClient.publish(
      topic,
      payload,
      {
        qos: 1,
        retain: false,
      },
      error => {

        if (error) {

          console.error(
            "Erro ao publicar MQTT:",
            error
          );

          notifyError(
            error
          );
        }
      }
    );

    console.log(
      "======================================"
    );

    console.log(
      "MQTT PUBLICADO"
    );

    console.log(
      "TOPICO:",
      topic
    );

    console.log(
      "DADOS:",
      data
    );

    console.log(
      "======================================"
    );

    return true;

  } catch (error) {

    console.error(
      "Erro ao publicar MQTT:",
      error
    );

    return false;
  }
}

/* ============================================================
   PRODUTO
============================================================ */

export function setProduct(
  produto: string
): boolean {

  return publishMqtt(
    MQTT_TOPICS.command,
    {
      command:
        "set_product",

      comando:
        "set_product",

      produto,

      produtoNome:
        produto,
    }
  );
}

export const definirProduto =
  setProduct;

/* ============================================================
   INICIAR PESAGEM
============================================================ */

export function startWeighing(): boolean {

  return publishMqtt(
    MQTT_TOPICS.command,
    {
      command:
        "start_weighing",

      comando:
        "start_weighing",
    }
  );
}

export const iniciarPesagem =
  startWeighing;

/* ============================================================
   CONFIRMAR BALANÇA 1
============================================================ */

export function confirmSensor1(
  data?:
    | {
        produto?: string;
        peso?: number;
      }
    | number
): boolean {

  const payload:
    Record<
      string,
      unknown
    > = {

    command:
      "confirm_sensor1",

    comando:
      "confirm_sensor1",

    sensor:
      1,
  };

  /* ==========================================================
     PESO DIRETO
  ========================================================== */

  if (
    typeof data ===
    "number"
  ) {

    payload.peso =
      data;

    payload.weight =
      data;

    payload.value =
      data;

    payload.peso_sensor_1 =
      data;

    payload.pesoSensor1 =
      data;
  }

  /* ==========================================================
     OBJETO
  ========================================================== */

  if (
    typeof data ===
      "object" &&
    data !== null
  ) {

    if (
      data.produto !==
      undefined
    ) {

      const produto =
        String(
          data.produto
        ).trim();

      if (produto) {

        payload.produto =
          produto;

        payload.produtoNome =
          produto;

        payload.produto_nome =
          produto;

        payload.product =
          produto;
      }
    }

    if (
      data.peso !==
      undefined
    ) {

      payload.peso =
        data.peso;

      payload.weight =
        data.peso;

      payload.value =
        data.peso;

      payload.peso_sensor_1 =
        data.peso;

      payload.pesoSensor1 =
        data.peso;
    }
  }

  console.log(
    "======================================"
  );

  console.log(
    "CONFIRMAR BALANÇA 1"
  );

  console.log(
    "Payload:",
    payload
  );

  console.log(
    "======================================"
  );

  return publishMqtt(
    MQTT_TOPICS.command,
    payload
  );
}

export const confirmarSensor1 =
  confirmSensor1;

/* ============================================================
   CADASTRAR FINGERPRINT
============================================================ */

export function registerFingerprint(
  data:
    | {
        id: number;
        nome: string;
      }
    | number,

  nome?: string
): boolean {

  let id: number;

  let nomePessoa: string;

  if (
    typeof data ===
    "number"
  ) {

    id =
      data;

    nomePessoa =
      nome ??
      "";

  } else {

    id =
      data.id;

    nomePessoa =
      data.nome;
  }

  nomePessoa =
    nomePessoa.trim();

  if (
    !Number.isFinite(
      id
    ) ||
    id <= 0
  ) {

    console.error(
      "ID de fingerprint inválido:",
      id
    );

    return false;
  }

  if (!nomePessoa) {

    console.error(
      "Nome da fingerprint vazio."
    );

    return false;
  }

  return publishMqtt(
    MQTT_TOPICS.command,
    {

      command:
        "enroll_fingerprint",

      comando:
        "enroll_fingerprint",

      id,

      fingerprint_id:
        id,

      fingerprintId:
        id,

      nome:
        nomePessoa,

      pessoa_nome:
        nomePessoa,

      pessoaNome:
        nomePessoa,

      pessoa_id:
        String(id),

      pessoaId:
        String(id),
    }
  );
}

export const cadastrarFingerprint =
  registerFingerprint;

/* ============================================================
   SOLICITAR FINGERPRINT
============================================================ */

export function requestFingerprint(): boolean {

  return publishMqtt(
    MQTT_TOPICS.command,
    {

      command:
        "request_fingerprint",

      comando:
        "request_fingerprint",
    }
  );
}

export const solicitarFingerprint =
  requestFingerprint;

/* ============================================================
   IMPRIMIR RECIBO
============================================================ */

export function printReceipt(
  data?: {

    pessoa_id?:
      string | number;

    pessoa_nome?:
      string;

    fingerprint_id?:
      string | number;

    produto?:
      string;

    peso?:
      number;
  }
): boolean {

  return publishMqtt(
    MQTT_TOPICS.command,
    {

      command:
        "print_receipt",

      comando:
        "print_receipt",

      ...(data ?? {}),
    }
  );
}

export const imprimirRecibo =
  printReceipt;

/* ============================================================
   RESET BALANÇA 1
============================================================ */

export function resetSensor1(): boolean {

  return publishMqtt(
    MQTT_TOPICS.command,
    {

      command:
        "reset_sensor1",

      comando:
        "reset_sensor1",

      sensor:
        1,
    }
  );
}

/* ============================================================
   RESET FINGERPRINT
============================================================ */

export function resetFingerprint(): boolean {

  return publishMqtt(
    MQTT_TOPICS.command,
    {

      command:
        "reset_fingerprint",

      comando:
        "reset_fingerprint",
    }
  );
}

/* ============================================================
   RESET GERAL
============================================================ */

export function resetWarehouse(): boolean {

  return publishMqtt(
    MQTT_TOPICS.command,
    {

      command:
        "reset",

      comando:
        "reset",
    }
  );
}

export const resetArmazem =
  resetWarehouse;

/* ============================================================
   DESCONECTAR
============================================================ */

export function disconnectMqtt(): void {

  if (!mqttClient) {
    return;
  }

  mqttManualDisconnect =
    true;

  mqttConnecting =
    false;

  mqttSubscriptionsReady =
    false;

  pesoAnteriorBalanca2 =
    null;

  try {

    mqttClient.end(
      true,
      {},
      () => {

        console.log(
          "MQTT desconectado."
        );
      }
    );

  } catch (error) {

    console.error(
      "Erro ao desconectar MQTT:",
      error
    );
  }

  mqttClient =
    null;

  currentOnMessage =
    null;

  currentHandlers =
    {};
}

/* ============================================================
   RESET ESTADO BALANÇA 2
============================================================ */

export function resetAutomaticBalanca2State(): void {

  pesoAnteriorBalanca2 =
    null;
}

/* ============================================================
   OBTER PESO ANTERIOR BALANÇA 2
============================================================ */

export function getPesoAnteriorBalanca2():
  number | null {

  return pesoAnteriorBalanca2;
}

/* ============================================================
   ESTADO MQTT
============================================================ */

export function isMqttConnected(): boolean {

  return Boolean(
    mqttClient?.connected
  );
}

/* ============================================================
   ESTADO RECONEXÃO
============================================================ */

export function isMqttReconnecting(): boolean {

  return Boolean(
    mqttClient?.reconnecting
  );
}

/* ============================================================
   OBTER CLIENTE
============================================================ */

export function getMqttClient():
  | MqttClient
  | null {

  return mqttClient;
}