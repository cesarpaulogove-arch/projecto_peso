
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

  timestamp?: string;
  data?: string;
  data_hora?: string;

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

  timestamp?: string | null;

  data?: string | null;

  data_hora?: string | null;

  autorizado?: boolean;

  recognized?: boolean;

  encontrado?: boolean;

  printed?: boolean;
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

  status?: string;

  estado?: string;

  confirmado?: boolean;

  printed?: boolean;

  timestamp?: string;

  data?: string;

  data_hora?: string;

  date?: string;

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
}

/* ============================================================
   TÓPICOS MQTT
============================================================ */

export const MQTT_TOPICS = {

  /* ==========================================================
     PESO EM TEMPO REAL
  ========================================================== */

  weight1:
    "armazem/esp32/peso/1",

  weight2:
    "armazem/esp32/peso/2",

  /* ==========================================================
     HISTÓRICO
  ========================================================== */

  history1:
    "armazem/esp32/pesagem/historico/1",

  history2:
    "armazem/esp32/pesagem/historico/2",

  /* ==========================================================
     FINGERPRINT
  ========================================================== */

  fingerprint:
    "armazem/esp32/fingerprint",

  /* ==========================================================
     IMPRESSORA
  ========================================================== */

  printerStatus:
    "armazem/esp32/printer/status",

  /* ==========================================================
     STATUS GERAL
  ========================================================== */

  status:
    "armazem/esp32/status",

  /* ==========================================================
     COMANDOS
  ========================================================== */

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

/*
   Esta variável guarda o último peso que foi considerado
   como estado de referência.

   IMPORTANTE:

   Não alteramos esta variável em pequenas oscilações
   <= 1 kg.

   Só alteramos quando:

      diferença > 1 kg
*/

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
   OBTER PESO DA BALANÇA 2
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

  /*
     Para o tópico weight2 damos prioridade
     aos campos específicos da Balança 2.
  */

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
    data as Record<string, unknown>;

  const result = {
    ...original,
  };

  /* ----------------------------------------------------------
     ID DA FINGERPRINT
     
     IMPORTANTE:
     Não utilizar pessoa_id/pessoaId como fallback.
     O ID da fingerprint e o ID da pessoa são conceitos
     diferentes.
  ---------------------------------------------------------- */

  const rawFingerprintId =
    result.fingerprint_id ??
    result.fingerprintId ??
    result.id;

  if (
    rawFingerprintId !== undefined &&
    rawFingerprintId !== null
  ) {

    const numericId =
      Number(rawFingerprintId);

    if (
      Number.isFinite(numericId)
    ) {

      result.id =
        numericId;

      result.fingerprint_id =
        numericId;

      result.fingerprintId =
        numericId;

    }
  }

  /* ----------------------------------------------------------
     ID DA PESSOA
     
     Mantemos separado do ID da fingerprint.
  ---------------------------------------------------------- */

  const rawPessoaId =
    result.pessoa_id ??
    result.pessoaId;

  if (
    rawPessoaId !== undefined &&
    rawPessoaId !== null
  ) {

    const pessoaId =
      String(rawPessoaId).trim();

    if (pessoaId) {

      result.pessoa_id =
        pessoaId;

      result.pessoaId =
        pessoaId;

    }
  }

  /* ----------------------------------------------------------
     NOME
  ---------------------------------------------------------- */

  const rawNome =
    result.nome ??
    result.pessoa_nome ??
    result.pessoaNome;

  if (
    rawNome !== undefined &&
    rawNome !== null
  ) {

    const nome =
      String(rawNome).trim();

    if (nome) {

      result.nome =
        nome;

      result.pessoa_nome =
        nome;

      result.pessoaNome =
        nome;

    }
  }

  /* ----------------------------------------------------------
     CONFIANÇA
  ---------------------------------------------------------- */

  const rawConfidence =
    result.confidence ??
    result.confianca;

  if (
    rawConfidence !== undefined &&
    rawConfidence !== null
  ) {

    const confidence =
      Number(rawConfidence);

    if (
      Number.isFinite(confidence)
    ) {

      result.confidence =
        confidence;

      result.confianca =
        confidence;

    }
  }

  /* ----------------------------------------------------------
     STATUS
  ---------------------------------------------------------- */

  const rawStatus =
    result.status ??
    result.estado;

  if (
    rawStatus !== undefined &&
    rawStatus !== null
  ) {

    const status =
      String(rawStatus).trim();

    if (status) {

      result.status =
        status;

      result.estado =
        status;

    }
  }

  return result;
}

/* ============================================================
   NORMALIZAR MENSAGEM
============================================================ */

function normalizeMessage(
  topic: string,
  data: unknown
): unknown {

  if (
    topic ===
    MQTT_TOPICS.fingerprint
  ) {

    return normalizeFingerprint(
      data
    );

  }

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
   DETECTAR ALTERAÇÃO BALANÇA 2
============================================================ */

/*
   REGRA:

      primeira leitura
          ↓
      guardar peso
          ↓
      não criar histórico


      leitura seguinte
          ↓
      calcular:

      |pesoAtual - pesoAnterior|


      diferença <= 1
          ↓
      ignorar


      diferença > 1
          ↓
      gerar evento automático
          ↓
      atualizar peso anterior
*/

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

  /* ----------------------------------------------------------
     PRIMEIRA LEITURA
  ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     DIFERENÇA
  ---------------------------------------------------------- */

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

  console.log(
    "Regra: diferença > 1 kg"
  );

  /* ----------------------------------------------------------
     DIFERENÇA NÃO SUFICIENTE
  ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     NOVA PESAGEM
  ---------------------------------------------------------- */

  console.log(
    "BALANÇA 2: diferença > 1 kg."
  );

  console.log(
    "BALANÇA 2: NOVA PESAGEM DETECTADA."
  );

  /*
     Guardamos o peso atual ANTES de retornar.

     Isso evita que a mesma alteração seja
     registrada várias vezes.
  */

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

  const produto =
    original.produto ??
    original.produtoNome ??
    original.produto_nome ??
    original.product;

  const timestamp =
    original.timestamp ??
    original.data_hora ??
    original.data;

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

    ...(produto !== undefined
      ? {
          produto:
            String(produto),

          produtoNome:
            String(produto),

          produto_nome:
            String(produto),

          product:
            String(produto),
        }
      : {}),

    ...(timestamp !== undefined
      ? {
          timestamp:
            String(timestamp),
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

      console.log(
        "Tópicos:"
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
     NORMALIZAR ARGUMENTOS
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
     VALIDAR CALLBACK
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

  /*
     Nova conexão começa uma nova sequência
     de comparação da Balança 2.
  */

  pesoAnteriorBalanca2 =
    null;

  notifyStatus(
    "Conectando"
  );

  /* ==========================================================
     OPÇÕES MQTT
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
     AUTENTICAÇÃO OPCIONAL
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

      data =
        normalizeMessage(
          topic,
          data
        );

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

      console.log(
        "======================================"
      );

      /* ------------------------------------------------------
         STATUS GERAL DO ESP32
      ------------------------------------------------------ */

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

      /* ------------------------------------------------------
         FINGERPRINT
      ------------------------------------------------------ */

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

        }

      }

      /* ------------------------------------------------------
         BALANÇA 2 — HISTÓRICO AUTOMÁTICO
      ------------------------------------------------------ */

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

          /*
             IMPORTANTE:

             O evento automático é entregue
             ao mesmo onMessage usado pelo
             componente React.

             O componente deverá reconhecer:

                 automatico === true
                 balanca === 2

             e então atualizar a tabela.
          */

          console.log(
            "BALANÇA 2: enviando evento automático para onMessage."
          );

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
                  : String(error)
              );

            }

          }

        }

      }

      /* ------------------------------------------------------
         CALLBACK PRINCIPAL
      ------------------------------------------------------ */

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
            : String(error)

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

  const payload: Record<string, unknown> = {

    command:
      "confirm_sensor1",

    comando:
      "confirm_sensor1",

    sensor:
      1,

  };

  // ==========================================================
  // PESO DIRETO
  // ==========================================================

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

  // ==========================================================
  // OBJETO
  // ==========================================================

  if (
    typeof data ===
      "object" &&
    data !== null
  ) {

    // --------------------------------------------------------
    // PRODUTO
    // --------------------------------------------------------

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

      }

    }

    // --------------------------------------------------------
    // PESO
    // --------------------------------------------------------

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
    !Number.isFinite(id) ||
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
    pessoa_id?: string | number;

    pessoa_nome?: string;

    fingerprint_id?:
      string | number;

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

  /*
     Limpa o estado da comparação.

     Na próxima conexão a primeira leitura
     será novamente usada como referência.
  */

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
   RESET DO ESTADO AUTOMÁTICO DA BALANÇA 2
============================================================ */

/*
   Esta função NÃO envia MQTT.

   Apenas permite que o componente React reinicie
   a referência de comparação quando necessário.
*/

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

