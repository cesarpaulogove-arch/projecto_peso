"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  MQTT_TOPICS,
  connectMqtt,
  disconnectMqtt,
  publishMqtt,
  setProduct,
  startWeighing,
  confirmSensor1,
  resetSensor1,
  requestFingerprint,
} from "@/lib/mqtt";

import type {
  SensorData,
  FingerprintData,
  WeighingSensor1,
  WeighingSensor2,
  FingerprintHistory,
  Person,
} from "../types/armazem";

/* ============================================================
   CONSTANTES
============================================================ */

const BALANCA2_DIFERENCA_MINIMA = 1;

const HISTORICO_DUPLICADO_JANELA_MS = 5000;

const STORAGE_PESSOAS =
  "armazem_pessoas";

const STORAGE_HISTORICO_1 =
  "armazem_historico_sensor1";

const STORAGE_HISTORICO_2 =
  "armazem_historico_sensor2";

const STORAGE_HISTORICO_FINGERPRINT =
  "armazem_historico_fingerprint";

/*
 * Muito importante:
 *
 * Enquanto o localStorage ainda não foi carregado,
 * NÃO podemos gravar os estados iniciais [].
 */
const historicoInicializadoRef =
  {
    current: false,
  };

/* ============================================================
   HELPERS
============================================================ */

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/* ============================================================
   ID ÚNICO
============================================================ */

function gerarId(
  prefixo: string
): string {
  return (
    `${prefixo}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`
  );
}

/* ============================================================
   TIMESTAMP
============================================================ */

/*
 * Converte corretamente:
 *
 * Unix segundos:
 *   1760000000
 *
 * Unix milissegundos:
 *   1760000000000
 *
 * ISO:
 *   2026-10-08T12:30:00.000Z
 *
 * Data/hora:
 *   08/10/2026 14:30:00
 */
function normalizarTimestamp(
  value: unknown
): string {

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return new Date().toISOString();
  }

  /*
   * Número real
   */
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {

    /*
     * Unix em segundos
     */
    if (
      value > 100000000 &&
      value < 100000000000
    ) {

      return new Date(
        value * 1000
      ).toISOString();
    }

    /*
     * Unix em milissegundos
     */
    if (
      value >= 100000000000
    ) {

      const data =
        new Date(value);

      if (
        !Number.isNaN(
          data.getTime()
        )
      ) {
        return data.toISOString();
      }
    }
  }

  const texto =
    String(value).trim();

  /*
   * Número enviado como string
   */
  if (
    /^\d+$/.test(texto)
  ) {

    const numero =
      Number(texto);

    if (
      Number.isFinite(numero)
    ) {

      if (
        numero > 100000000 &&
        numero < 100000000000
      ) {

        return new Date(
          numero * 1000
        ).toISOString();
      }

      if (
        numero >= 100000000000
      ) {

        const data =
          new Date(numero);

        if (
          !Number.isNaN(
            data.getTime()
          )
        ) {
          return data.toISOString();
        }
      }
    }
  }

  /*
   * ISO ou outra data reconhecida pelo JS.
   */
  const data =
    new Date(texto);

  if (
    !Number.isNaN(
      data.getTime()
    )
  ) {

    return data.toISOString();
  }

  /*
   * Formato DD/MM/YYYY HH:mm:ss
   */
  const match =
    texto.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );

  if (
    match
  ) {

    const dia =
      Number(match[1]);

    const mes =
      Number(match[2]) - 1;

    const ano =
      Number(match[3]);

    const hora =
      Number(match[4] ?? 0);

    const minuto =
      Number(match[5] ?? 0);

    const segundo =
      Number(match[6] ?? 0);

    /*
     * África/Maputo = UTC+2.
     */
    const timestamp =
      Date.UTC(
        ano,
        mes,
        dia,
        hora - 2,
        minuto,
        segundo
      );

    const dataConvertida =
      new Date(timestamp);

    if (
      !Number.isNaN(
        dataConvertida.getTime()
      )
    ) {

      return dataConvertida.toISOString();
    }
  }

  return new Date().toISOString();
}

/* ============================================================
   DATA/HORA
============================================================ */

function formatDateTime(
  timestamp: string
): string {

  const data =
    new Date(timestamp);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {

    return timestamp;
  }

  return data.toLocaleString(
    "pt-MZ",
    {
      timeZone:
        "Africa/Maputo",

      day: "2-digit",
      month: "2-digit",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",

      hour12: false,
    }
  );
}

/* ============================================================
   CRIAR TIMESTAMP LOCAL
============================================================ */

function createHistoryTimestamp(): {
  timestamp: string;
  dataHora: string;
} {

  const timestamp =
    new Date().toISOString();

  return {
    timestamp,

    dataHora:
      formatDateTime(
        timestamp
      ),
  };
}

/* ============================================================
   PESO
============================================================ */

function getNumericWeight(
  payload: SensorData
): number {

  const value =
    payload.peso ??
    payload.weight ??
    payload.value ??
    payload.peso_sensor_1 ??
    payload.pesoSensor1 ??
    payload.sensor1 ??
    payload.peso_sensor_2 ??
    payload.pesoSensor2 ??
    payload.sensor2 ??
    0;

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

/* ============================================================
   PESO BALANÇA 2
============================================================ */

function getNumericWeightSensor2(
  payload: SensorData
): number {

  const value =
    payload.peso_sensor_2 ??
    payload.pesoSensor2 ??
    payload.sensor2 ??
    payload.peso ??
    payload.weight ??
    payload.value ??
    0;

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

/* ============================================================
   PRODUTO
============================================================ */

function getProduct(
  payload: SensorData
): string {

  return String(
    payload.produto ??
      payload.produtoNome ??
      payload.product ??
      ""
  ).trim();
}

/* ============================================================
   PESSOA ID
============================================================ */

function getPersonId(
  payload:
    | SensorData
    | FingerprintData
): string {

  const value =
    payload.pessoa_id ??
    payload.pessoaId;

  return String(
    value ?? ""
  ).trim();
}

/* ============================================================
   PESSOA NOME
============================================================ */
function getPersonName(
  payload:
    | SensorData
    | FingerprintData
): string {

  const nome =
    "nome" in payload
      ? payload.nome
      : undefined;

  return String(
    payload.pessoa_nome ??
      payload.pessoaNome ??
      nome ??
      ""
  ).trim();
}
/* ============================================================
   FINGERPRINT ID
============================================================ */

function getFingerprintId(
  payload:
    | SensorData
    | FingerprintData
): number | undefined {

  const value =
    payload.fingerprint_id ??
    payload.fingerprintId ??
    payload.id;

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    return undefined;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : undefined;
}

/* ============================================================
   CONFIANÇA
============================================================ */

function getFingerprintConfidence(
  payload: FingerprintData
): number | undefined {

  const value =
    payload.confidence ??
    payload.confianca;

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    return undefined;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : undefined;
}

/* ============================================================
   TIMESTAMP DO PAYLOAD
============================================================ */

function getTimestamp(
  payload:
    | SensorData
    | FingerprintData
): string {

  const timestamp =
    payload.timestamp;

  if (
    timestamp !== undefined &&
    timestamp !== null &&
    String(timestamp).trim() !== ""
  ) {

    return normalizarTimestamp(
      timestamp
    );
  }

  const dataHora =
    "data_hora" in payload
      ? payload.data_hora
      : undefined;

  if (
    dataHora !== undefined &&
    dataHora !== null &&
    String(dataHora).trim() !== ""
  ) {

    return normalizarTimestamp(
      dataHora
    );
  }

  const dataHoraCamel =
    "dataHora" in payload
      ? payload.dataHora
      : undefined;

  if (
    dataHoraCamel !== undefined &&
    dataHoraCamel !== null &&
    String(dataHoraCamel).trim() !== ""
  ) {

    return normalizarTimestamp(
      dataHoraCamel
    );
  }

  const data =
    "data" in payload
      ? payload.data
      : undefined;

  const hora =
    "hora" in payload
      ? payload.hora
      : undefined;

  if (
    data &&
    hora
  ) {

    return normalizarTimestamp(
      `${data} ${hora}`
    );
  }

  if (
    data
  ) {

    return normalizarTimestamp(
      data
    );
  }

  return new Date().toISOString();
}

/* ============================================================
   STATUS
============================================================ */

function getStatus(
  payload:
    | SensorData
    | FingerprintData
): string {

  return String(
    payload.status ??
      payload.estado ??
      ""
  )
    .trim()
    .toLowerCase();
}

/* ============================================================
   MENSAGEM
============================================================ */

function getMessage(
  payload: FingerprintData
): string {

  return String(
    payload.message ??
      payload.mensagem ??
      ""
  ).trim();
}

/* ============================================================
   STATUS RECONHECIDO
============================================================ */

function isRecognizedStatus(
  status: string
): boolean {

  return [
    "recognized",
    "recognised",
    "reconhecido",
    "reconhecida",
    "identificado",
    "identificada",
    "encontrado",
    "encontrada",
    "found",
    "fingerprint_found",
    "fingerprint_found_success",
    "recognized_fingerprint",
    "fingerprint_recognized",
    "success_recognition",
  ].includes(status);
}

/* ============================================================
   STATUS NEGADO
============================================================ */

function isDeniedStatus(
  status: string
): boolean {

  return [
    "denied",
    "negado",
    "negada",
    "nao_autorizado",
    "não_autorizado",
    "not_found",
    "nao_encontrado",
    "não_encontrado",
    "nao_identificado",
    "não_identificado",
    "nao_identificada",
    "não_identificada",
    "unknown",
    "desconhecido",
    "fingerprint_not_found",
  ].includes(status);
}

/* ============================================================
   STATUS CADASTRO
============================================================ */

function isEnrollmentStatus(
  status: string
): boolean {

  return [
    "enrolling",
    "enroll",
    "registering",
    "cadastrando",
    "cadastro",
    "aguardando_primeiro_dedo",
    "aguardando_segundo_dedo",
    "waiting_first_finger",
    "waiting_second_finger",
  ].includes(status);
}

/* ============================================================
   STATUS RETIRAR DEDO
============================================================ */

function isRemoveFingerStatus(
  status: string
): boolean {

  return [
    "remove",
    "removed",
    "removido",
    "retire",
    "retirar",
    "remove_finger",
    "retire_finger",
    "retire_o_dedo",
    "identificado_retirar_dedo",
    "nao_identificado_retirar_dedo",
    "não_identificado_retirar_dedo",
    "nao_identificada_retirar_dedo",
    "não_identificada_retirar_dedo",
    "cadastro_concluido_retirar_dedo",
  ].includes(status);
}

/* ============================================================
   STATUS CADASTRADO
============================================================ */

function isRegisteredStatus(
  status: string
): boolean {

  return [
    "registered",
    "registado",
    "registrado",
    "cadastrado",
    "cadastro_sucesso",
    "enrolled",
    "enroll_success",
  ].includes(status);
}

/* ============================================================
   STATUS ERRO
============================================================ */

function isErrorStatus(
  status: string
): boolean {

  return [
    "error",
    "erro",
    "failed",
    "falhou",
    "sensor_error",
    "fingerprint_error",
    "erro_captura",
    "erro_busca",
    "timeout",
  ].includes(status);
}

/* ============================================================
   NORMALIZAR HISTÓRICO 1
============================================================ */

function normalizarHistorico1(
  dados: unknown
): WeighingSensor1[] {

  if (
    !Array.isArray(dados)
  ) {

    return [];
  }

  return dados
    .filter(isObject)
    .map(
      (
        item
      ) => {

        const timestamp =
          normalizarTimestamp(
            item.timestamp ??
              item.dataHora ??
              item.data_hora ??
              item.date ??
              item.createdAt
          );

        return {
          ...item,

          id:
            String(
              item.id ??
                gerarId(
                  "balanca1"
                )
            ),

          product:
            String(
              item.product ??
                item.produto ??
                ""
            ),

          weight:
            Number(
              item.weight ??
                item.peso ??
                0
            ),

          status:
            String(
              item.status ??
                "confirmado"
            ),

          timestamp,

          dataHora:
            formatDateTime(
              timestamp
            ),
        } as WeighingSensor1;
      }
    );
}

/* ============================================================
   NORMALIZAR HISTÓRICO 2
============================================================ */

function normalizarHistorico2(
  dados: unknown
): WeighingSensor2[] {

  if (
    !Array.isArray(dados)
  ) {

    return [];
  }

  return dados
    .filter(isObject)
    .map(
      (
        item
      ) => {

        const timestamp =
          normalizarTimestamp(
            item.timestamp ??
              item.dataHora ??
              item.data_hora ??
              item.date ??
              item.createdAt
          );

        return {
          ...item,

          id:
            String(
              item.id ??
                gerarId(
                  "balanca2"
                )
            ),

          product:
            String(
              item.product ??
                item.produto ??
                ""
            ),

          weight:
            Number(
              item.weight ??
                item.peso ??
                0
            ),

          status:
            String(
              item.status ??
                "confirmado"
            ),

          timestamp,

          dataHora:
            formatDateTime(
              timestamp
            ),
        } as WeighingSensor2;
      }
    );
}

/* ============================================================
   HOOK
============================================================ */

export function useArmazemMqtt() {

  /* ==========================================================
     MQTT
  ========================================================== */

  const [
    mqttOnline,
    setMqttOnline,
  ] = useState(false);

  /* ==========================================================
     PRODUTO
  ========================================================== */

  const [
    produto,
    setProduto,
  ] = useState("");

  const produtoRef =
    useRef("");

  /* ==========================================================
     BALANÇA 1
  ========================================================== */

  const [
    sensor1,
    setSensor1,
  ] = useState(0);

  const [
    sensor1Confirmado,
    setSensor1Confirmado,
  ] = useState(false);

  /* ==========================================================
     BALANÇA 2
  ========================================================== */

  const [
    sensor2,
    setSensor2,
  ] = useState(0);

  const [
    sensor2Confirmado,
    setSensor2Confirmado,
  ] = useState(false);

  /* ==========================================================
     BALANÇA 2
  ========================================================== */

  const pesoAnteriorBalanca2Ref =
    useRef<number | null>(null);

  const ultimoHistoricoAutomaticoBalanca2Ref =
    useRef("");

  /* ==========================================================
     CONFIRMAÇÃO
  ========================================================== */

  const [
    aguardandoConfirmacao,
    setAguardandoConfirmacao,
  ] = useState(false);

  /* ==========================================================
     FINGERPRINT
  ========================================================== */

  const [
    fingerprintPending,
    setFingerprintPending,
  ] = useState(false);

  const [
    fingerprintLeituraIniciada,
    setFingerprintLeituraIniciada,
  ] = useState(false);

  const [
    fingerprintStatus,
    setFingerprintStatus,
  ] = useState("");

  const [
    fingerprintIdAtual,
    setFingerprintIdAtual,
  ] = useState<number | undefined>();

  /* ==========================================================
     PESSOA
  ========================================================== */

  const [
    pessoaAtual,
    setPessoaAtual,
  ] = useState<Person | null>(null);

  const [
    pessoas,
    setPessoas,
  ] = useState<Person[]>([]);

  const pessoasRef =
    useRef<Person[]>([]);

  useEffect(() => {
    pessoasRef.current =
      pessoas;
  }, [pessoas]);

  /* ==========================================================
     HISTÓRICO 1
  ========================================================== */

  const [
    historicoSensor1,
    setHistoricoSensor1,
  ] = useState<WeighingSensor1[]>([]);

  const historicoSensor1Ref =
    useRef<WeighingSensor1[]>([]);

  /* ==========================================================
     HISTÓRICO 2
  ========================================================== */

  const [
    historicoSensor2,
    setHistoricoSensor2,
  ] = useState<WeighingSensor2[]>([]);

  const historicoSensor2Ref =
    useRef<WeighingSensor2[]>([]);

  /* ==========================================================
     HISTÓRICO FINGERPRINT
  ========================================================== */

  const [
    historicoFingerprint,
    setHistoricoFingerprint,
  ] = useState<FingerprintHistory[]>([]);

  const historicoFingerprintRef =
    useRef<FingerprintHistory[]>([]);

  /* ==========================================================
     ATUALIZAR REFS
  ========================================================== */

  useEffect(() => {
    historicoSensor1Ref.current =
      historicoSensor1;
  }, [historicoSensor1]);

  useEffect(() => {
    historicoSensor2Ref.current =
      historicoSensor2;
  }, [historicoSensor2]);

  useEffect(() => {
    historicoFingerprintRef.current =
      historicoFingerprint;
  }, [historicoFingerprint]);

  /* ==========================================================
     CADASTRO
  ========================================================== */

  const [
    nomeFingerprint,
    setNomeFingerprint,
  ] = useState("");

  const [
    idFingerprint,
    setIdFingerprint,
  ] = useState("");

  const cadastroFingerprintRef =
    useRef<{
      id: number;
      nome: string;
    } | null>(null);

  /* ==========================================================
     MENSAGENS
  ========================================================== */

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  const [
    erro,
    setErro,
  ] = useState("");

  /* ==========================================================
     PRODUTO REF
  ========================================================== */

  useEffect(() => {

    produtoRef.current =
      produto;

  }, [produto]);

  /* ==========================================================
     CARREGAR LOCALSTORAGE
  ========================================================== */

  useEffect(() => {

    /*
     * IMPORTANTE:
     *
     * Este effect roda antes dos effects de gravação.
     *
     * Depois de carregar tudo:
     *
     * historicoInicializadoRef.current = true
     *
     * Só então permitimos salvar.
     */

    try {

      const pessoasSalvas =
        localStorage.getItem(
          STORAGE_PESSOAS
        );

      const historico1Salvo =
        localStorage.getItem(
          STORAGE_HISTORICO_1
        );

      const historico2Salvo =
        localStorage.getItem(
          STORAGE_HISTORICO_2
        );

      const fingerprintSalvo =
        localStorage.getItem(
          STORAGE_HISTORICO_FINGERPRINT
        );

      /* ======================================================
         PESSOAS
      ====================================================== */

      if (
        pessoasSalvas
      ) {

        try {

          const dados =
            JSON.parse(
              pessoasSalvas
            );

          if (
            Array.isArray(dados)
          ) {

            setPessoas(
              dados
            );

            pessoasRef.current =
              dados;
          }

        } catch (error) {

          console.error(
            "Erro ao carregar pessoas:",
            error
          );
        }
      }

      /* ======================================================
         HISTÓRICO BALANÇA 1
      ====================================================== */

      if (
        historico1Salvo
      ) {

        try {

          const dados =
            JSON.parse(
              historico1Salvo
            );

          const normalizados =
            normalizarHistorico1(
              dados
            );

          setHistoricoSensor1(
            normalizados
          );

          historicoSensor1Ref.current =
            normalizados;

          console.log(
            `Histórico Balança 1 carregado: ${normalizados.length} registros.`
          );

        } catch (error) {

          console.error(
            "Erro ao carregar histórico da Balança 1:",
            error
          );
        }
      }

      /* ======================================================
         HISTÓRICO BALANÇA 2
      ====================================================== */

      if (
        historico2Salvo
      ) {

        try {

          const dados =
            JSON.parse(
              historico2Salvo
            );

          const normalizados =
            normalizarHistorico2(
              dados
            );

          setHistoricoSensor2(
            normalizados
          );

          historicoSensor2Ref.current =
            normalizados;

        } catch (error) {

          console.error(
            "Erro ao carregar histórico da Balança 2:",
            error
          );
        }
      }

      /* ======================================================
         FINGERPRINT
      ====================================================== */

      if (
        fingerprintSalvo
      ) {

        try {

          const dados =
            JSON.parse(
              fingerprintSalvo
            );

          if (
            Array.isArray(dados)
          ) {

            const normalizados =
              dados.map(
                (
                  item: FingerprintHistory
                ) => {

                  const timestamp =
                    normalizarTimestamp(
                      item.timestamp
                    );

                  return {
                    ...item,

                    id:
                      String(
                        item.id ??
                          gerarId(
                            "fingerprint"
                          )
                      ),

                    timestamp,

                    dataHora:
                      formatDateTime(
                        timestamp
                      ),
                  };
                }
              );

            setHistoricoFingerprint(
              normalizados
            );

            historicoFingerprintRef.current =
              normalizados;
          }

        } catch (error) {

          console.error(
            "Erro ao carregar histórico fingerprint:",
            error
          );
        }
      }

    } catch (error) {

      console.error(
        "Erro ao carregar dados locais:",
        error
      );

      setErro(
        "Erro ao carregar dados locais."
      );

    } finally {

      /*
       * SOMENTE AGORA permitimos gravação.
       */
      historicoInicializadoRef.current =
        true;
    }

  }, []);

  /* ==========================================================
     GUARDAR PESSOAS
  ========================================================== */

  useEffect(() => {

    if (
      !historicoInicializadoRef.current
    ) {
      return;
    }

    try {

      localStorage.setItem(
        STORAGE_PESSOAS,
        JSON.stringify(
          pessoas
        )
      );

    } catch (error) {

      console.error(
        "Erro ao guardar pessoas:",
        error
      );
    }

  }, [pessoas]);

  /* ==========================================================
     GUARDAR HISTÓRICO BALANÇA 1
  ========================================================== */

  useEffect(() => {

    if (
      !historicoInicializadoRef.current
    ) {

      return;
    }

    try {

      localStorage.setItem(
        STORAGE_HISTORICO_1,
        JSON.stringify(
          historicoSensor1
        )
      );

      console.log(
        `Histórico Balança 1 guardado: ${historicoSensor1.length} registros.`
      );

    } catch (error) {

      console.error(
        "Erro ao guardar histórico 1:",
        error
      );
    }

  }, [historicoSensor1]);

  /* ==========================================================
     GUARDAR HISTÓRICO BALANÇA 2
  ========================================================== */

  useEffect(() => {

    if (
      !historicoInicializadoRef.current
    ) {

      return;
    }

    try {

      localStorage.setItem(
        STORAGE_HISTORICO_2,
        JSON.stringify(
          historicoSensor2
        )
      );

    } catch (error) {

      console.error(
        "Erro ao guardar histórico 2:",
        error
      );
    }

  }, [historicoSensor2]);

  /* ==========================================================
     GUARDAR FINGERPRINT
  ========================================================== */

  useEffect(() => {

    if (
      !historicoInicializadoRef.current
    ) {

      return;
    }

    try {

      localStorage.setItem(
        STORAGE_HISTORICO_FINGERPRINT,
        JSON.stringify(
          historicoFingerprint
        )
      );

    } catch (error) {

      console.error(
        "Erro ao guardar histórico fingerprint:",
        error
      );
    }

  }, [historicoFingerprint]);

  /* ==========================================================
     MQTT
  ========================================================== */

  useEffect(() => {

    let mounted = true;

    const client =
      connectMqtt({

        onStatus: (
          status
        ) => {

          if (
            !mounted
          ) {
            return;
          }

          if (
            status === "Online"
          ) {

            setMqttOnline(
              true
            );

            setErro("");

            return;
          }

          if (
            status === "Offline"
          ) {

            setMqttOnline(
              false
            );

            pesoAnteriorBalanca2Ref.current =
              null;
          }
        },

        onConnect: () => {

          if (
            !mounted
          ) {
            return;
          }

          setMqttOnline(
            true
          );

          setErro("");

          pesoAnteriorBalanca2Ref.current =
            null;
        },

        onDisconnect: () => {

          if (
            !mounted
          ) {
            return;
          }

          setMqttOnline(
            false
          );

          pesoAnteriorBalanca2Ref.current =
            null;
        },

        onError: (
          error: Error
        ) => {

          if (
            !mounted
          ) {
            return;
          }

          console.error(
            "ERRO MQTT:",
            error
          );

          setErro(
            error.message ||
              "Erro MQTT."
          );
        },

        onMessage: (
          topic,
          data
        ) => {

          if (
            !mounted
          ) {
            return;
          }

          if (
            !isObject(data)
          ) {

            return;
          }

          /* ==================================================
             BALANÇA 1
          ================================================== */

          if (
            topic ===
            MQTT_TOPICS.weight1
          ) {

            const payload =
              data as SensorData;

            setSensor1(
              getNumericWeight(
                payload
              )
            );

            return;
          }

          /* ==================================================
             BALANÇA 2
          ================================================== */

          if (
            topic ===
            MQTT_TOPICS.weight2
          ) {

            const payload =
              data as SensorData;

            const pesoAtual =
              getNumericWeightSensor2(
                payload
              );

            setSensor2(
              pesoAtual
            );

            if (
              pesoAtual <= 0
            ) {

              pesoAnteriorBalanca2Ref.current =
                pesoAtual;

              return;
            }

            const pesoAnterior =
              pesoAnteriorBalanca2Ref.current;

            if (
              pesoAnterior === null
            ) {

              pesoAnteriorBalanca2Ref.current =
                pesoAtual;

              return;
            }

            const diferenca =
              Math.abs(
                pesoAtual -
                  pesoAnterior
              );

            if (
              diferenca >
              BALANCA2_DIFERENCA_MINIMA
            ) {

              const {
                timestamp,
                dataHora,
              } =
                createHistoryTimestamp();

              const produtoAtual =
                getProduct(
                  payload
                ) ||
                produtoRef.current ||
                "Sem produto";

              const assinatura =
                [
                  produtoAtual,
                  pesoAnterior.toFixed(3),
                  pesoAtual.toFixed(3),
                ].join("|");

              if (
                assinatura !==
                ultimoHistoricoAutomaticoBalanca2Ref.current
              ) {

                ultimoHistoricoAutomaticoBalanca2Ref.current =
                  assinatura;

                const registro:
                  WeighingSensor2 = {

                  id:
                    gerarId(
                      "auto-balanca2"
                    ),

                  product:
                    produtoAtual,

                  weight:
                    pesoAtual,

                  status:
                    "automatico",

                  timestamp,

                  dataHora,

                  pesoAnterior,

                  diferenca,

                  automatico:
                    true,
                };

                const novoHistorico =
                  [
                    registro,
                    ...historicoSensor2Ref.current,
                  ];

                historicoSensor2Ref.current =
                  novoHistorico;

                setHistoricoSensor2(
                  novoHistorico
                );

                setMensagem(
                  `Balança 2 atualizada automaticamente: ${pesoAtual.toFixed(3)} kg em ${dataHora}.`
                );

                setErro("");
              }
            }

            pesoAnteriorBalanca2Ref.current =
              pesoAtual;

            return;
          }

          /* ==================================================
             HISTÓRICO BALANÇA 1
          ================================================== */

          if (
            topic ===
            MQTT_TOPICS.history1
          ) {

            const payload =
              data as SensorData;

            const peso =
              getNumericWeight(
                payload
              );

            const produtoHistorico =
              getProduct(
                payload
              ) ||
              produtoRef.current ||
              "Sem produto";

            const timestamp =
              getTimestamp(
                payload
              );

            const dataHora =
              formatDateTime(
                timestamp
              );

            const idRecebido =
              payload.id;

            /*
             * Primeiro verifica pelo ID.
             */
            if (
              idRecebido !== undefined &&
              idRecebido !== null
            ) {

              const existePorId =
                historicoSensor1Ref.current.some(
                  item =>
                    String(
                      item.id
                    ) ===
                    String(
                      idRecebido
                    )
                );

              if (
                existePorId
              ) {

                console.log(
                  "Histórico Balança 1 já existe pelo ID."
                );

                return;
              }
            }

            /*
             * Depois verifica duplicação por:
             *
             * produto + peso + janela de tempo.
             */
            const agora =
              Date.now();

            const duplicado =
              historicoSensor1Ref.current.some(
                item => {

                  const itemTime =
                    new Date(
                      item.timestamp
                    ).getTime();

                  if (
                    Number.isNaN(
                      itemTime
                    )
                  ) {

                    return false;
                  }

                  return (
                    item.product ===
                      produtoHistorico &&
                    Math.abs(
                      Number(
                        item.weight
                      ) -
                        peso
                    ) < 0.001 &&
                    Math.abs(
                      agora -
                        itemTime
                    ) <=
                      HISTORICO_DUPLICADO_JANELA_MS
                  );
                }
              );

            if (
              duplicado
            ) {

              console.log(
                "Histórico Balança 1 duplicado ignorado."
              );

              return;
            }

            const registro:
              WeighingSensor1 = {

              id:
                String(
                  idRecebido ??
                    gerarId(
                      "balanca1"
                    )
                ),

              product:
                produtoHistorico,

              weight:
                peso,

              status:
                String(
                  payload.status ??
                    payload.estado ??
                    "confirmado"
                ),

              timestamp,

              dataHora,
            };

            const novoHistorico =
              [
                registro,
                ...historicoSensor1Ref.current,
              ];

            historicoSensor1Ref.current =
              novoHistorico;

            setHistoricoSensor1(
              novoHistorico
            );

            console.log(
              "Novo histórico Balança 1:",
              registro
            );

            return;
          }

          /* ==================================================
             HISTÓRICO BALANÇA 2
          ================================================== */

          if (
            topic ===
            MQTT_TOPICS.history2
          ) {

            const payload =
              data as SensorData;

            const peso =
              getNumericWeightSensor2(
                payload
              );

            const timestamp =
              getTimestamp(
                payload
              );

            const dataHora =
              formatDateTime(
                timestamp
              );

            const registro:
              WeighingSensor2 = {

              id:
                String(
                  payload.id ??
                    gerarId(
                      "balanca2"
                    )
                ),

              product:
                getProduct(
                  payload
                ) ||
                produtoRef.current,

              weight:
                peso,

              status:
                String(
                  payload.status ??
                    payload.estado ??
                    "confirmado"
                ),

              timestamp,

              dataHora,
            };

            const existe =
              historicoSensor2Ref.current.some(
                item =>
                  String(
                    item.id
                  ) ===
                  String(
                    registro.id
                  )
              );

            if (
              existe
            ) {

              return;
            }

            const novoHistorico =
              [
                registro,
                ...historicoSensor2Ref.current,
              ];

            historicoSensor2Ref.current =
              novoHistorico;

            setHistoricoSensor2(
              novoHistorico
            );

            return;
          }

          /* ==================================================
             FINGERPRINT
          ================================================== */

          if (
            topic ===
            MQTT_TOPICS.fingerprint
          ) {

            const payload =
              data as FingerprintData;

            const status =
              getStatus(
                payload
              );

            const id =
              getFingerprintId(
                payload
              );

            const nome =
              getPersonName(
                payload
              );

            const pessoaId =
              getPersonId(
                payload
              );

            const message =
              getMessage(
                payload
              );

            const timestamp =
              getTimestamp(
                payload
              );

            const dataHora =
              formatDateTime(
                timestamp
              );

            const confidence =
              getFingerprintConfidence(
                payload
              );

            if (
              id !== undefined
            ) {

              setFingerprintIdAtual(
                id
              );
            }

            /* =================================================
               CADASTRO
            ================================================= */

            if (
              isEnrollmentStatus(
                status
              )
            ) {

              setFingerprintPending(
                true
              );

              setFingerprintStatus(
                message ||
                  "Cadastro de fingerprint em andamento."
              );

              setErro("");

              return;
            }

            /* =================================================
               CADASTRADO
            ================================================= */

            if (
              isRegisteredStatus(
                status
              )
            ) {

              const cadastro =
                cadastroFingerprintRef.current;

              if (
                cadastro
              ) {

                const novaPessoa:
                  Person = {

                  id:
                    cadastro.id,

                  nome:
                    cadastro.nome,

                  status:
                    "Cadastrado",

                  timestamp,
                };

                setPessoas(
                  prev => {

                    const existente =
                      prev.find(
                        pessoa =>
                          pessoa.id ===
                          novaPessoa.id
                      );

                    if (
                      existente
                    ) {

                      return prev.map(
                        pessoa =>
                          pessoa.id ===
                          novaPessoa.id
                            ? novaPessoa
                            : pessoa
                      );
                    }

                    return [
                      ...prev,
                      novaPessoa,
                    ];
                  }
                );

                pessoasRef.current =
                  [
                    ...pessoasRef.current.filter(
                      pessoa =>
                        pessoa.id !==
                        novaPessoa.id
                    ),
                    novaPessoa,
                  ];

                setPessoaAtual(
                  novaPessoa
                );

                setFingerprintIdAtual(
                  cadastro.id
                );

                cadastroFingerprintRef.current =
                  null;

                setFingerprintStatus(
                  message ||
                    "Fingerprint cadastrada com sucesso."
                );

                setMensagem(
                  `${novaPessoa.nome} foi cadastrada com sucesso em ${dataHora}.`
                );

                setErro("");

                setFingerprintPending(
                  false
                );

                return;
              }

              setFingerprintPending(
                false
              );

              setFingerprintStatus(
                message ||
                  "Fingerprint cadastrada no sensor."
              );

              return;
            }

            /* =================================================
               RECONHECIMENTO
            ================================================= */

            if (
              isRecognizedStatus(
                status
              )
            ) {

              const pessoaEncontrada =
                id !== undefined
                  ? pessoasRef.current.find(
                      pessoa =>
                        Number(
                          pessoa.id
                        ) ===
                        Number(id)
                    )
                  : undefined;

              if (
                !pessoaEncontrada
              ) {

                setPessoaAtual(
                  null
                );

                setFingerprintStatus(
                  "Fingerprint encontrada, mas não cadastrada/autorizada."
                );

                setErro(
                  "Esta fingerprint não pertence a nenhuma pessoa cadastrada."
                );

                setMensagem("");

                setFingerprintPending(
                  true
                );

                return;
              }

              const pessoaFinal =
                pessoaEncontrada;

              setPessoaAtual(
                pessoaFinal
              );

              setFingerprintIdAtual(
                id ??
                  pessoaFinal.id
              );

              const reconhecimentoDuplicado =
                historicoFingerprintRef.current.some(
                  item => {

                    if (
                      Number(
                        item.fingerprintId
                      ) !==
                      Number(
                        id ??
                          pessoaFinal.id
                      )
                    ) {

                      return false;
                    }

                    const itemTime =
                      new Date(
                        item.timestamp
                      ).getTime();

                    const atualTime =
                      new Date(
                        timestamp
                      ).getTime();

                    if (
                      Number.isNaN(
                        itemTime
                      ) ||
                      Number.isNaN(
                        atualTime
                      )
                    ) {

                      return false;
                    }

                    return (
                      Math.abs(
                        atualTime -
                          itemTime
                      ) <
                      HISTORICO_DUPLICADO_JANELA_MS
                    );
                  }
                );

              if (
                !reconhecimentoDuplicado
              ) {

                const registro:
                  FingerprintHistory = {

                  id:
                    gerarId(
                      "fingerprint"
                    ),

                  fingerprintId:
                    id ??
                    Number(
                      pessoaFinal.id
                    ),

                  pessoaId:
                    String(
                      pessoaFinal.id
                    ),

                  pessoaNome:
                    pessoaFinal.nome,

                  confidence,

                  autorizado:
                    true,

                  status,

                  mensagem:
                    message ||
                    `Uso autorizado por ${pessoaFinal.nome}.`,

                  timestamp,

                  dataHora,

                  dispositivo:
                    payload.device ??
                    payload.dispositivo ??
                    "esp32-armazem",
                };

                const novoHistorico =
                  [
                    registro,
                    ...historicoFingerprintRef.current,
                  ];

                historicoFingerprintRef.current =
                  novoHistorico;

                setHistoricoFingerprint(
                  novoHistorico
                );
              }

              setFingerprintStatus(
                message ||
                  `Fingerprint autorizada: ${pessoaFinal.nome}`
              );

              setMensagem(
                `Uso autorizado: ${pessoaFinal.nome} em ${dataHora}.`
              );

              setErro("");

              setFingerprintPending(
                true
              );

              return;
            }

            /* =================================================
               RETIRAR DEDO
            ================================================= */

            if (
              isRemoveFingerStatus(
                status
              )
            ) {

              setFingerprintStatus(
                message ||
                  "Retire o dedo do sensor."
              );

              setFingerprintPending(
                true
              );

              return;
            }

            /* =================================================
               NEGADO
            ================================================= */

            if (
              isDeniedStatus(
                status
              )
            ) {

              setPessoaAtual(
                null
              );

              setFingerprintStatus(
                message ||
                  "Fingerprint não identificada. Retire o dedo do sensor."
              );

              setErro(
                message ||
                  "Fingerprint não cadastrada. Acesso não autorizado."
              );

              setMensagem("");

              setFingerprintPending(
                true
              );

              return;
            }

            /* =================================================
               AUTORIZADO
            ================================================= */

            if (
              [
                "authorized",
                "autorizado",
                "autorizada",
              ].includes(status)
            ) {

              setFingerprintStatus(
                message ||
                  "Fingerprint autorizada."
              );

              setErro("");

              return;
            }

            /* =================================================
               IMPRESSÃO
            ================================================= */

            if (
              [
                "printed",
                "impresso",
                "impressao",
                "confirmado_impresso",
              ].includes(status)
            ) {

              setFingerprintStatus(
                message ||
                  "Recibo impresso."
              );

              return;
            }

            /* =================================================
               PRONTO
            ================================================= */

            if (
              [
                "pronto",
                "ready",
                "livre",
                "sensor_livre",
              ].includes(status)
            ) {

              setFingerprintPending(
                false
              );

              setFingerprintStatus(
                "Leitura concluída. Inicie uma Nova Pesagem para realizar outra leitura."
              );

              return;
            }

            /* =================================================
               ERRO
            ================================================= */

            if (
              isErrorStatus(
                status
              )
            ) {

              cadastroFingerprintRef.current =
                null;

              setFingerprintPending(
                false
              );

              setFingerprintStatus(
                message ||
                  "Erro no sensor fingerprint."
              );

              setErro(
                message ||
                  "Erro no sensor fingerprint."
              );

              return;
            }

            return;
          }

          /* ==================================================
             IMPRESSORA
          ================================================== */

          if (
            topic ===
            MQTT_TOPICS.printerStatus
          ) {

            const payload =
              data as SensorData;

            const status =
              getStatus(
                payload
              );

            if (
              [
                "printed",
                "impresso",
                "impressao",
                "confirmado_impresso",
              ].includes(status)
            ) {

              setMensagem(
                "Recibo impresso com sucesso."
              );

              return;
            }

            if (
              [
                "error",
                "erro",
                "failed",
                "falhou",
              ].includes(status)
            ) {

              setErro(
                "Erro na impressora térmica."
              );

              return;
            }
          }
        },
      });

    if (
      client?.connected
    ) {

      setMqttOnline(
        true
      );
    }

    return () => {

      mounted = false;

      pesoAnteriorBalanca2Ref.current =
        null;

      ultimoHistoricoAutomaticoBalanca2Ref.current =
        "";

      disconnectMqtt();
    };

  }, []);

  /* ==========================================================
     CADASTRAR PESSOA
  ========================================================== */

  const cadastrarPessoa =
    useCallback(
      (
        id: number,
        nome: string
      ) => {

        if (
          !mqttOnline
        ) {

          setErro(
            "MQTT não está conectado."
          );

          return false;
        }

        if (
          !Number.isInteger(id) ||
          id < 1 ||
          id > 127
        ) {

          setErro(
            "O ID da fingerprint deve estar entre 1 e 127."
          );

          return false;
        }

        const nomeNormalizado =
          nome.trim();

        if (
          !nomeNormalizado
        ) {

          setErro(
            "Informe o nome da pessoa."
          );

          return false;
        }

        const existente =
          pessoasRef.current.some(
            pessoa =>
              Number(
                pessoa.id
              ) === id
          );

        if (
          existente
        ) {

          setErro(
            `O ID ${id} já está cadastrado.`
          );

          return false;
        }

        cadastroFingerprintRef.current = {
          id,
          nome:
            nomeNormalizado,
        };

        setPessoaAtual(
          null
        );

        setFingerprintIdAtual(
          id
        );

        setErro("");

        setMensagem(
          `Cadastro de fingerprint iniciado para ${nomeNormalizado}.`
        );

        const enviado =
          publishMqtt(
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

              pessoa_id:
                String(id),

              pessoaId:
                String(id),

              nome:
                nomeNormalizado,

              pessoa_nome:
                nomeNormalizado,

              pessoaNome:
                nomeNormalizado,
            }
          );

        if (
          !enviado
        ) {

          cadastroFingerprintRef.current =
            null;

          setFingerprintPending(
            false
          );

          setFingerprintStatus("");

          setErro(
            "Não foi possível enviar o comando de cadastro."
          );

          return false;
        }

        setFingerprintPending(
          true
        );

        setFingerprintStatus(
          `Coloque o dedo no sensor para cadastrar ${nomeNormalizado}.`
        );

        return true;
      },
      [
        mqttOnline,
      ]
    );

  /* ==========================================================
     RECONHECIMENTO FINGERPRINT
  ========================================================== */

  const iniciarReconhecimentoFingerprint =
    useCallback(
      () => {

        if (
          fingerprintLeituraIniciada
        ) {

          setFingerprintStatus(
            'A leitura de fingerprint já foi utilizada nesta operação. Clique em "Nova Pesagem" para liberar uma nova leitura.'
          );

          return false;
        }

        if (
          !mqttOnline
        ) {

          setErro(
            "MQTT não está conectado."
          );

          return false;
        }

        if (
          fingerprintPending
        ) {

          setFingerprintStatus(
            "A leitura de fingerprint já está em andamento. Aguarde a conclusão."
          );

          return false;
        }

        if (
          pessoasRef.current.length === 0
        ) {

          setPessoaAtual(
            null
          );

          setFingerprintIdAtual(
            undefined
          );

          setFingerprintStatus(
            "Nenhuma pessoa cadastrada."
          );

          setErro(
            "Cadastre primeiro uma pessoa e a sua fingerprint."
          );

          setMensagem("");

          return false;
        }

        setFingerprintLeituraIniciada(
          true
        );

        setFingerprintPending(
          true
        );

        setPessoaAtual(
          null
        );

        setFingerprintIdAtual(
          undefined
        );

        setFingerprintStatus(
          "Coloque o dedo cadastrado no sensor..."
        );

        setMensagem(
          "Leitura de fingerprint iniciada."
        );

        setErro("");

        const enviado =
          requestFingerprint();

        if (
          !enviado
        ) {

          setFingerprintPending(
            false
          );

          setFingerprintStatus(
            "Não foi possível enviar o comando de leitura."
          );

          setErro(
            'Falha ao iniciar a leitura. Clique em "Nova Pesagem" para tentar novamente.'
          );

          return false;
        }

        return true;
      },
      [
        mqttOnline,
        fingerprintPending,
        fingerprintLeituraIniciada,
      ]
    );

  const reconhecerFingerprint =
    iniciarReconhecimentoFingerprint;

  /* ==========================================================
     CADASTRAR PRODUTO
  ========================================================== */

  const cadastrarProduto =
    useCallback(
      (
        nome: string
      ) => {

        const produtoNome =
          nome.trim();

        if (
          !produtoNome
        ) {

          setErro(
            "Informe o produto."
          );

          return false;
        }

        if (
          !mqttOnline
        ) {

          setErro(
            "MQTT não está conectado."
          );

          return false;
        }

        setProduto(
          produtoNome
        );

        produtoRef.current =
          produtoNome;

        setSensor1(0);
        setSensor2(0);

        setSensor1Confirmado(
          false
        );

        setSensor2Confirmado(
          false
        );

        pesoAnteriorBalanca2Ref.current =
          null;

        ultimoHistoricoAutomaticoBalanca2Ref.current =
          "";

        setAguardandoConfirmacao(
          false
        );

        setFingerprintPending(
          false
        );

        setFingerprintStatus("");

        setPessoaAtual(
          null
        );

        setFingerprintIdAtual(
          undefined
        );

        setMensagem(
          `Produto "${produtoNome}" registado.`
        );

        setErro("");

        setProduct(
          produtoNome
        );

        startWeighing();

        return true;
      },
      [
        mqttOnline,
      ]
    );

  /* ==========================================================
     CONFIRMAR BALANÇA 1
  ========================================================== */

  const confirmarBalanca1 =
    useCallback(
      () => {

        if (
          !mqttOnline
        ) {

          setErro(
            "MQTT não está conectado."
          );

          return false;
        }

        if (
          !produtoRef.current
        ) {

          setErro(
            "Registe primeiro o produto."
          );

          return false;
        }

        if (
          !Number.isFinite(
            sensor1
          ) ||
          sensor1 <= 0
        ) {

          setErro(
            "A balança 1 ainda não possui um peso válido."
          );

          return false;
        }

        if (
          sensor1Confirmado
        ) {

          setErro(
            'A Balança 1 já foi confirmada nesta pesagem. Clique em "Nova Pesagem" para confirmar novamente.'
          );

          return false;
        }

        const enviado =
          confirmSensor1({
            peso:
              sensor1,

            produto:
              produtoRef.current,
          });

        if (
          !enviado
        ) {

          setErro(
            "Não foi possível confirmar a Balança 1."
          );

          return false;
        }

        /*
         * Criamos o registro imediatamente.
         */
        const {
          timestamp,
          dataHora,
        } =
          createHistoryTimestamp();

        const registro:
          WeighingSensor1 = {

          id:
            gerarId(
              "balanca1"
            ),

          product:
            produtoRef.current,

          weight:
            sensor1,

          status:
            "confirmado",

          timestamp,

          dataHora,
        };

        /*
         * Atualiza REF antes de setState.
         *
         * Isso é importante porque history1 pode
         * chegar quase imediatamente pelo MQTT.
         */
        const novoHistorico =
          [
            registro,
            ...historicoSensor1Ref.current,
          ];

        historicoSensor1Ref.current =
          novoHistorico;

        setHistoricoSensor1(
          novoHistorico
        );

        setSensor1Confirmado(
          true
        );

        setAguardandoConfirmacao(
          false
        );

        setMensagem(
          `Balança 1 confirmada: ${sensor1.toFixed(3)} kg em ${dataHora}.`
        );

        setErro("");

        console.log(
          "BALANÇA 1 CONFIRMADA:",
          registro
        );

        return true;
      },
      [
        mqttOnline,
        sensor1,
        sensor1Confirmado,
      ]
    );

  /* ==========================================================
     BALANÇA 2
  ========================================================== */

  const confirmarBalanca2 =
    useCallback(
      () => {

        setErro(
          "A Balança 2 funciona automaticamente. Não é necessário confirmar."
        );

        return false;
      },
      []
    );

  /* ==========================================================
     NOVA PESAGEM
  ========================================================== */

  const novaPesagem =
    useCallback(
      () => {

        if (
          !mqttOnline
        ) {

          setErro(
            "MQTT não está conectado."
          );

          return false;
        }

        const resetEnviado =
          resetSensor1();

        if (
          !resetEnviado
        ) {

          setErro(
            "Não foi possível reiniciar a Balança 1 no ESP32."
          );

          return false;
        }

        setSensor1(0);
        setSensor2(0);

        setSensor1Confirmado(
          false
        );

        setSensor2Confirmado(
          false
        );

        pesoAnteriorBalanca2Ref.current =
          null;

        ultimoHistoricoAutomaticoBalanca2Ref.current =
          "";

        setAguardandoConfirmacao(
          false
        );

        setFingerprintLeituraIniciada(
          false
        );

        setFingerprintPending(
          false
        );

        setFingerprintStatus("");

        setPessoaAtual(
          null
        );

        setFingerprintIdAtual(
          undefined
        );

        setMensagem(
          "Nova pesagem iniciada. Balança 1 reiniciada e leitura de fingerprint disponível novamente."
        );

        setErro("");

        startWeighing();

        return true;
      },
      [
        mqttOnline,
      ]
    );

  /* ==========================================================
     RESET BALANÇA 1
  ========================================================== */

  const resetBalanca1 =
    useCallback(
      () => {

        const enviado =
          resetSensor1();

        if (
          !enviado
        ) {

          setErro(
            "Não foi possível resetar a Balança 1 no ESP32."
          );

          return false;
        }

        setSensor1(0);

        setSensor1Confirmado(
          false
        );

        setAguardandoConfirmacao(
          false
        );

        setMensagem(
          "Balança 1 reiniciada. Pode realizar uma nova confirmação."
        );

        setErro("");

        return true;
      },
      []
    );

  /* ==========================================================
     RESET BALANÇA 2
  ========================================================== */

  const resetBalanca2 =
    useCallback(
      () => {

        setSensor2(0);

        setSensor2Confirmado(
          false
        );

        pesoAnteriorBalanca2Ref.current =
          null;

        ultimoHistoricoAutomaticoBalanca2Ref.current =
          "";
      },
      []
    );

  /* ==========================================================
     RETORNO
  ========================================================== */

  return {

    mqttOnline,

    produto,
    setProduto,

    sensor1,
    sensor1Confirmado,

    sensor2,
    sensor2Confirmado,

    aguardandoConfirmacao,

    fingerprintPending,
    fingerprintLeituraIniciada,
    fingerprintStatus,
    fingerprintIdAtual,

    pessoaAtual,
    pessoas,

    historicoSensor1,
    historicoSensor2,
    historicoFingerprint,

    nomeFingerprint,
    setNomeFingerprint,

    idFingerprint,
    setIdFingerprint,

    mensagem,
    erro,

    setErro,
    setMensagem,

    cadastrarPessoa,
    cadastrarProduto,

    confirmarBalanca1,
    confirmarBalanca2,

    reconhecerFingerprint,
    iniciarReconhecimentoFingerprint,

    novaPesagem,

    resetBalanca1,
    resetBalanca2,
  };
}