import mqtt, {
  MqttClient,
  IClientOptions,
} from "mqtt";

// ============================================================
// TIPOS
// ============================================================

export interface MqttHandlers {
  onStatus?: (status: string) => void;

  onConnect?: () => void;

  onDisconnect?: () => void;

  onError?: (error: Error) => void;

  onMessageError?: (message: string) => void;
}

export interface MqttConnectionOptions
  extends MqttHandlers {
  onMessage: (
    topic: string,
    data: unknown
  ) => void;
}

export interface SensorPayload {
  sensor?: number | null;

  sensor_id?: number | string | null;

  balanca?: number | string | null;

  peso?: number | null;

  weight?: number | null;

  value?: number | null;

  unidade?: string;

  produto?: string;

  produtoNome?: string;

  produto_nome?: string;

  product?: string;

  timestamp?: string;

  data_hora?: string;

  stable?: boolean;

  occupied?: boolean;

  confirmado?: boolean;

  pessoa_id?: string | number | null;

  pessoaId?: string | number | null;

  pessoa_nome?: string | null;

  pessoaNome?: string | null;

  fingerprint_id?: number | string | null;

  fingerprintId?: number | string | null;
}

export interface FingerprintPayload {
  status?: string | null;

  estado?: string | null;

  id?: number | string | null;

  fingerprint_id?: number | string | null;

  fingerprintId?: number | string | null;

  nome?: string | null;

  pessoa_nome?: string | null;

  pessoa_id?: string | number | null;

  message?: string | null;

  mensagem?: string | null;

  confidence?: number | string | null;

  timestamp?: string | null;
}

export interface WeighingHistoryPayload {
  id?: string | number;

  sensor?: number | null;

  sensor_id?: number | string | null;

  balanca?: number | string | null;

  product?: string;

  produto?: string;

  produtoNome?: string;

  produto_nome?: string;

  sensor1?: number | null;

  sensor2?: number | null;

  peso_sensor_1?: number | null;

  peso_sensor_2?: number | null;

  pesoSensor1?: number | null;

  pesoSensor2?: number | null;

  peso?: number | null;

  weight?: number | null;

  value?: number | null;

  peso_total?: number | null;

  difference?: number | null;

  status?: string;

  estado?: string;

  printed?: boolean;

  timestamp?: string;

  data_hora?: string;

  date?: string;

  pessoa_id?: number | string | null;

  pessoa_nome?: string | null;

  pessoaId?: number | string | null;

  pessoaNome?: string | null;

  fingerprint_id?: number | string | null;

  fingerprintId?: number | string | null;
}

// ============================================================
// TÓPICOS MQTT
// ============================================================

export const MQTT_TOPICS = {
  weight1:
    "armazem/esp32/peso/1",

  weight2:
    "armazem/esp32/peso/2",

  history:
    "armazem/esp32/pesagem/historico",

  // Alias para compatibilidade
  weighingHistory:
    "armazem/esp32/pesagem/historico",

  fingerprint:
    "armazem/esp32/fingerprint",

  printerStatus:
    "armazem/esp32/printer/status",

  // Alias para compatibilidade
  printer:
    "armazem/esp32/printer/status",

  command:
    "armazem/esp32/comando",
} as const;

// ============================================================
// CLIENTE MQTT GLOBAL
// ============================================================

let mqttClient:
  | MqttClient
  | null = null;

let mqttConnecting = false;

let mqttManualDisconnect = false;

let mqttSubscriptionsReady = false;

// ============================================================
// CALLBACKS
// ============================================================

let currentOnMessage:
  | ((
      topic: string,
      data: unknown
    ) => void)
  | null = null;

let currentHandlers: MqttHandlers = {};

// ============================================================
// CALLBACKS SEGUROS
// ============================================================

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

// ============================================================
// LISTA DE TÓPICOS
// ============================================================

function getMqttTopics(): string[] {
  return [
    MQTT_TOPICS.weight1,
    MQTT_TOPICS.weight2,
    MQTT_TOPICS.history,
    MQTT_TOPICS.fingerprint,
    MQTT_TOPICS.printerStatus,
  ];
}

// ============================================================
// PAYLOAD → STRING
// ============================================================

function payloadToString(
  payload: Buffer
): string {
  try {
    return payload.toString(
      "utf8"
    );
  } catch {
    return String(payload);
  }
}

// ============================================================
// PARSE JSON
// ============================================================

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

// ============================================================
// NORMALIZAR PESO
// ============================================================

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
    result.value;

  if (
    rawWeight !== undefined &&
    rawWeight !== null
  ) {
    const numericWeight =
      Number(rawWeight);

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

// ============================================================
// SUBSCREVER
// ============================================================

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

        notifyError(error);

        return;
      }

      mqttSubscriptionsReady =
        true;

      console.log(
        "MQTT subscrito:",
        topics
      );
    }
  );
}

// ============================================================
// CONECTAR MQTT
//
// ACEITA:
//
// connectMqtt({
//   onMessage,
//   onConnect,
//   onDisconnect,
//   onError
// })
//
// OU:
//
// connectMqtt(
//   onMessage,
//   handlers
// )
// ============================================================

export function connectMqtt(
  options: MqttConnectionOptions
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
  second: MqttHandlers = {}
): MqttClient | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  // ==========================================================
  // NORMALIZAR ARGUMENTOS
  // ==========================================================

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

  // ==========================================================
  // VALIDAR CALLBACK
  // ==========================================================

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

    notifyError(error);

    return null;
  }

  // ==========================================================
  // JÁ CONECTADO
  // ==========================================================

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

  // ==========================================================
  // JÁ CONECTANDO
  // ==========================================================

  if (
    mqttClient &&
    mqttConnecting
  ) {
    return mqttClient;
  }

  // ==========================================================
  // CONFIGURAÇÃO
  // ==========================================================

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

    notifyError(error);

    return null;
  }

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

    notifyError(error);

    return null;
  }

  // ==========================================================
  // ESTADO
  // ==========================================================

  mqttManualDisconnect =
    false;

  mqttConnecting =
    true;

  mqttSubscriptionsReady =
    false;

  // ==========================================================
  // OPÇÕES
  // ==========================================================

  const options:
    IClientOptions = {
    reconnectPeriod: 3000,

    connectTimeout: 10000,

    clean: true,

    keepalive: 60,

    resubscribe: false,

    protocolVersion: 4,

    clientId:
      `nextjs-armazem-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
  };

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

  // ==========================================================
  // CRIAR CONEXÃO
  // ==========================================================

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
            String(error)
          );

    notifyStatus(
      "Offline"
    );

    notifyError(
      normalizedError
    );

    return null;
  }

  // ==========================================================
  // CONNECT
  // ==========================================================

  mqttClient.on(
    "connect",
    () => {
      mqttConnecting =
        false;

      mqttSubscriptionsReady =
        false;

      console.log(
        "MQTT conectado."
      );

      notifyStatus(
        "Online"
      );

      notifyConnect();

      subscribeToTopics();
    }
  );

  // ==========================================================
  // RECONNECT
  // ==========================================================

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

      notifyStatus(
        "Reconectando"
      );
    }
  );

  // ==========================================================
  // OFFLINE
  // ==========================================================

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

      notifyStatus(
        "Offline"
      );
    }
  );

  // ==========================================================
  // ERROR
  // ==========================================================

  mqttClient.on(
    "error",
    error => {
      console.error(
        "MQTT ERROR:",
        error
      );

      notifyError(error);
    }
  );

  // ==========================================================
  // CLOSE
  // ==========================================================

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

  // ==========================================================
  // END
  // ==========================================================

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

  // ==========================================================
  // MESSAGE
  // ==========================================================

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

      data =
        normalizeWeight(
          data
        );

      console.log(
        "MQTT RECEBIDO:",
        topic,
        data
      );

      const handler =
        currentOnMessage;

      /*
       * PROTEÇÃO CONTRA:
       *
       * handler is not a function
       *
       * O callback é validado novamente
       * antes de executar.
       */

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
            : String(error)
        );
      }
    }
  );

  return mqttClient;
}

// ============================================================
// PUBLICAR MQTT
// ============================================================

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

    return false;
  }

  let payload: string;

  try {
    payload =
      JSON.stringify(data);
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

          notifyError(error);
        }
      }
    );

    console.log(
      "MQTT PUBLICADO:",
      {
        topic,
        data,
      }
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

// ============================================================
// PRODUTO
// ============================================================

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

// Alias
export const definirProduto =
  setProduct;

// ============================================================
// INICIAR PESAGEM
// ============================================================

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

// Alias
export const iniciarPesagem =
  startWeighing;

// ============================================================
// CONFIRMAR BALANÇA 1
// ============================================================

export function confirmSensor1(
  data?: {
    produto?: string;
    peso?: number;
  } | number
): boolean {
  const payload: Record<
    string,
    unknown
  > = {
    command:
      "confirm_sensor1",

    comando:
      "confirm_sensor1",

    sensor: 1,
  };

  if (
    typeof data ===
    "number"
  ) {
    payload.peso =
      data;

    payload.peso_sensor_1 =
      data;
  }

  if (
    typeof data ===
    "object" &&
    data !== null
  ) {
    if (
      data.produto !==
      undefined
    ) {
      payload.produto =
        data.produto;
    }

    if (
      data.peso !==
      undefined
    ) {
      payload.peso =
        data.peso;

      payload.peso_sensor_1 =
        data.peso;
    }
  }

  return publishMqtt(
    MQTT_TOPICS.command,
    payload
  );
}

// Alias
export const confirmarSensor1 =
  confirmSensor1;

// ============================================================
// CONFIRMAR BALANÇA 2
// ============================================================

export function confirmSensor2(
  data?: {
    produto?: string;
    peso?: number;
  } | number
): boolean {
  const payload: Record<
    string,
    unknown
  > = {
    command:
      "confirm_sensor2",

    comando:
      "confirm_sensor2",

    sensor: 2,
  };

  if (
    typeof data ===
    "number"
  ) {
    payload.peso =
      data;

    payload.peso_sensor_2 =
      data;
  }

  if (
    typeof data ===
    "object" &&
    data !== null
  ) {
    if (
      data.produto !==
      undefined
    ) {
      payload.produto =
        data.produto;
    }

    if (
      data.peso !==
      undefined
    ) {
      payload.peso =
        data.peso;

      payload.peso_sensor_2 =
        data.peso;
    }
  }

  return publishMqtt(
    MQTT_TOPICS.command,
    payload
  );
}

// Alias
export const confirmarSensor2 =
  confirmSensor2;

// ============================================================
// CADASTRAR FINGERPRINT
//
// IMPORTANTE:
//
// Este comando NÃO depende de:
// - produto
// - balança 1
// - balança 2
// - pesagem
//
// A pessoa pode ser cadastrada a qualquer momento.
// ============================================================

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
    id = data;
    nomePessoa =
      nome ?? "";
  } else {
    id = data.id;
    nomePessoa =
      data.nome;
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

      nome:
        nomePessoa,
    }
  );
}

// Alias
export const cadastrarFingerprint =
  registerFingerprint;

// ============================================================
// SOLICITAR FINGERPRINT
//
// Usado depois da confirmação da Balança 1.
// NÃO é usado para cadastrar pessoas.
// ============================================================

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

// Alias
export const solicitarFingerprint =
  requestFingerprint;

// ============================================================
// IMPRIMIR RECIBO
// ============================================================

export function printReceipt(
  data?: {
    pessoa_id?: string | number;
    pessoa_nome?: string;
    fingerprint_id?: string | number;
    produto?: string;
    peso?: number;
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

// Alias
export const imprimirRecibo =
  printReceipt;

// ============================================================
// RESET BALANÇA 1
// ============================================================

export function resetSensor1(): boolean {
  return publishMqtt(
    MQTT_TOPICS.command,
    {
      command:
        "reset_sensor1",

      comando:
        "reset_sensor1",

      sensor: 1,
    }
  );
}

// ============================================================
// RESET BALANÇA 2
// ============================================================

export function resetSensor2(): boolean {
  return publishMqtt(
    MQTT_TOPICS.command,
    {
      command:
        "reset_sensor2",

      comando:
        "reset_sensor2",

      sensor: 2,
    }
  );
}

// ============================================================
// RESET GERAL
// ============================================================

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

// Alias
export const resetArmazem =
  resetWarehouse;

// ============================================================
// DESCONECTAR
// ============================================================

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

// ============================================================
// ESTADO MQTT
// ============================================================

export function isMqttConnected(): boolean {
  return Boolean(
    mqttClient?.connected
  );
}

export function isMqttReconnecting(): boolean {
  return Boolean(
    mqttClient?.reconnecting
  );
}

export function getMqttClient():
  | MqttClient
  | null {
  return mqttClient;
}