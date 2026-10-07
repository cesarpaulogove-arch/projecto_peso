
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

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
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

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
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
   ID DA PESSOA
============================================================ */

function getPersonId(
  payload: SensorData | FingerprintData
): string {
  const value =
    payload.pessoa_id ??
    payload.pessoaId;

  return String(
    value ?? ""
  ).trim();
}

/* ============================================================
   NOME DA PESSOA
============================================================ */

function getPersonName(
  payload: SensorData | FingerprintData
): string {
  return String(
    payload.pessoa_nome ??
      payload.pessoaNome ??
      payload.nome ??
      ""
  ).trim();
}

/* ============================================================
   ID FINGERPRINT
============================================================ */

function getFingerprintId(
  payload: SensorData | FingerprintData
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

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
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

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : undefined;
}

/* ============================================================
   TIMESTAMP
============================================================ */

function getTimestamp(
  payload:
    | SensorData
    | FingerprintData
): string {
  if (
    payload.timestamp !== undefined &&
    payload.timestamp !== null &&
    String(payload.timestamp).trim() !== ""
  ) {
    return String(payload.timestamp);
  }

  if (
    "data_hora" in payload &&
    payload.data_hora
  ) {
    return String(payload.data_hora);
  }

  if (
    "data" in payload &&
    payload.data
  ) {
    return String(payload.data);
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
   STATUS DE RECONHECIMENTO
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
   STATUS NÃO IDENTIFICADO
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
   STATUS DE CADASTRO
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
     BALANÇA 2 - ESTADO ANTERIOR
  ========================================================== */

  const pesoAnteriorBalanca2Ref =
    useRef<number | null>(null);

  const ultimoHistoricoAutomaticoBalanca2Ref =
    useRef<string>("");

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
  ] = useState<number | undefined>(
    undefined
  );

  /* ==========================================================
     PESSOA ATUAL
  ========================================================== */

  const [
    pessoaAtual,
    setPessoaAtual,
  ] = useState<Person | null>(null);

  /* ==========================================================
     PESSOAS CADASTRADAS
  ========================================================== */

  const [
    pessoas,
    setPessoas,
  ] = useState<Person[]>([]);

  const pessoasRef =
    useRef<Person[]>([]);

  useEffect(() => {
    pessoasRef.current = pessoas;
  }, [pessoas]);

  /* ==========================================================
     HISTÓRICO BALANÇA 1
  ========================================================== */

  const [
    historicoSensor1,
    setHistoricoSensor1,
  ] = useState<WeighingSensor1[]>([]);

  /* ==========================================================
     HISTÓRICO BALANÇA 2
  ========================================================== */

  const [
    historicoSensor2,
    setHistoricoSensor2,
  ] = useState<WeighingSensor2[]>([]);

  /* ==========================================================
     HISTÓRICO FINGERPRINT
  ========================================================== */

  const [
    historicoFingerprint,
    setHistoricoFingerprint,
  ] = useState<FingerprintHistory[]>([]);

  const historicoFingerprintRef =
    useRef<FingerprintHistory[]>([]);

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
    produtoRef.current = produto;
  }, [produto]);

  /* ==========================================================
     CARREGAR LOCALSTORAGE
  ========================================================== */

  useEffect(() => {
    try {

      const pessoasSalvas =
        localStorage.getItem(
          "armazem_pessoas"
        );

      const historico1 =
        localStorage.getItem(
          "armazem_historico_sensor1"
        );

      const historico2 =
        localStorage.getItem(
          "armazem_historico_sensor2"
        );

      const historicoFingerprintSalvo =
        localStorage.getItem(
          "armazem_historico_fingerprint"
        );

      if (pessoasSalvas) {

        const dados =
          JSON.parse(
            pessoasSalvas
          );

        if (Array.isArray(dados)) {
          setPessoas(dados);
          pessoasRef.current = dados;
        }
      }

      if (historico1) {

        const dados =
          JSON.parse(
            historico1
          );

        if (Array.isArray(dados)) {
          setHistoricoSensor1(dados);
        }
      }

      if (historico2) {

        const dados =
          JSON.parse(
            historico2
          );

        if (Array.isArray(dados)) {
          setHistoricoSensor2(dados);
        }
      }

      if (historicoFingerprintSalvo) {

        const dados =
          JSON.parse(
            historicoFingerprintSalvo
          );

        if (Array.isArray(dados)) {
          setHistoricoFingerprint(dados);
          historicoFingerprintRef.current =
            dados;
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
    }
  }, []);

  /* ==========================================================
     GUARDAR PESSOAS
  ========================================================== */

  useEffect(() => {

    try {

      localStorage.setItem(
        "armazem_pessoas",
        JSON.stringify(pessoas)
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

    try {

      localStorage.setItem(
        "armazem_historico_sensor1",
        JSON.stringify(
          historicoSensor1
        )
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

    try {

      localStorage.setItem(
        "armazem_historico_sensor2",
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
     GUARDAR HISTÓRICO FINGERPRINT
  ========================================================== */

  useEffect(() => {

    try {

      localStorage.setItem(
        "armazem_historico_fingerprint",
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
     CONEXÃO MQTT
  ========================================================== */

  useEffect(() => {

    let mounted = true;

    console.log(
      "================================"
    );

    console.log(
      "INICIANDO MQTT DO ARMAZÉM"
    );

    console.log(
      "URL MQTT:",
      process.env.NEXT_PUBLIC_MQTT_URL
    );

    console.log(
      "================================"
    );

    const client =
      connectMqtt({

        onStatus: (status) => {

          if (!mounted) {
            return;
          }

          console.log(
            "STATUS MQTT:",
            status
          );

          if (
            status === "Online"
          ) {

            setMqttOnline(true);
            setErro("");

            return;
          }

          if (
            status === "Offline"
          ) {

            setMqttOnline(false);

            pesoAnteriorBalanca2Ref.current =
              null;

            return;
          }
        },

        onConnect: () => {

          if (!mounted) {
            return;
          }

          console.log(
            "MQTT CONECTADO COM SUCESSO"
          );

          setMqttOnline(true);
          setErro("");

          pesoAnteriorBalanca2Ref.current =
            null;
        },

        onDisconnect: () => {

          if (!mounted) {
            return;
          }

          console.log(
            "MQTT DESCONECTADO"
          );

          setMqttOnline(false);

          pesoAnteriorBalanca2Ref.current =
            null;
        },

        onError: (error: Error) => {

          if (!mounted) {
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

          if (!mounted) {
            return;
          }

          if (!isObject(data)) {

            console.warn(
              "Payload MQTT não é objeto:",
              data
            );

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
              !Number.isFinite(
                pesoAtual
              )
            ) {
              return;
            }

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

              const timestamp =
                getTimestamp(
                  payload
                );

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
                  timestamp,
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
                    `auto-balanca2-${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 9)}`,

                  product:
                    produtoAtual,

                  weight:
                    pesoAtual,

                  status:
                    "automatico",

                  timestamp,

                  pesoAnterior:
                    pesoAnterior,

                  diferenca,

                  automatico:
                    true,
                };

                setHistoricoSensor2(
                  prev => [
                    registro,
                    ...prev,
                  ]
                );

                setMensagem(
                  `Balança 2 atualizada automaticamente: ${pesoAtual.toFixed(3)} kg.`
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

            const registro:
              WeighingSensor1 = {

              id:
                String(
                  payload.id ??
                    `${Date.now()}-balanca1-${Math.random()
                      .toString(36)
                      .slice(2, 9)}`
                ),

              product:
                getProduct(
                  payload
                ) ||
                produtoRef.current,

              weight:
                getNumericWeight(
                  payload
                ),

              status:
                String(
                  payload.status ??
                    payload.estado ??
                    "confirmado"
                ),

              timestamp:
                getTimestamp(
                  payload
                ),
            };

            setHistoricoSensor1(
              prev => {

                if (
                  prev.some(
                    item =>
                      item.id ===
                      registro.id
                  )
                ) {
                  return prev;
                }

                return [
                  registro,
                  ...prev,
                ];
              }
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

            const registro:
              WeighingSensor2 = {

              id:
                String(
                  payload.id ??
                    `${Date.now()}-balanca2-${Math.random()
                      .toString(36)
                      .slice(2, 9)}`
                ),

              product:
                getProduct(
                  payload
                ) ||
                produtoRef.current,

              weight:
                getNumericWeightSensor2(
                  payload
                ),

              status:
                String(
                  payload.status ??
                    payload.estado ??
                    "confirmado"
                ),

              timestamp:
                getTimestamp(
                  payload
                ),
            };

            setHistoricoSensor2(
              prev => {

                if (
                  prev.some(
                    item =>
                      item.id ===
                      registro.id
                  )
                ) {
                  return prev;
                }

                return [
                  registro,
                  ...prev,
                ];
              }
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

            const confidence =
              getFingerprintConfidence(
                payload
              );

            console.log(
              "================================"
            );

            console.log(
              "FINGERPRINT RECEBIDA"
            );

            console.log(
              "Status:",
              status
            );

            console.log(
              "Fingerprint ID:",
              id
            );

            console.log(
              "Nome:",
              nome
            );

            console.log(
              "Pessoa ID:",
              pessoaId
            );

            console.log(
              "Confidence:",
              confidence
            );

            console.log(
              "================================"
            );

            if (
              id !== undefined
            ) {

              setFingerprintIdAtual(
                id
              );
            }

            /* =================================================
               CADASTRO EM ANDAMENTO
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
               CADASTRO CONCLUÍDO
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

                pessoasRef.current = [
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
                  `${novaPessoa.nome} foi cadastrada com sucesso.`
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

              /* =================================================
                 NÃO AUTORIZADA
              ================================================= */

              if (
                !pessoaEncontrada
              ) {

                console.warn(
                  "Fingerprint encontrada no ESP32, mas não está cadastrada no localStorage."
                );

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

              /* =================================================
                 AUTORIZADA
              ================================================= */

              const pessoaFinal =
                pessoaEncontrada;

              setPessoaAtual(
                pessoaFinal
              );

              setFingerprintIdAtual(
                id ??
                  pessoaFinal.id
              );

              const registro:
                FingerprintHistory = {

                id:
                  `fingerprint-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 10)}`,

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

                confidence:
                  confidence,

                autorizado:
                  true,

                status:
                  status,

                mensagem:
                  message ||
                  `Uso autorizado por ${pessoaFinal.nome}.`,

                timestamp,

                dispositivo:
                  payload.device ??
                  payload.dispositivo ??
                  "esp32-armazem",
              };

              setHistoricoFingerprint(
                prev => [
                  registro,
                  ...prev,
                ]
              );

              historicoFingerprintRef.current =
                [
                  registro,
                  ...historicoFingerprintRef.current,
                ];

              setFingerprintStatus(
                message ||
                  `Fingerprint autorizada: ${pessoaFinal.nome}`
              );

              setMensagem(
                `Uso autorizado: ${pessoaFinal.nome}.`
              );

              setErro("");

              /*
               * Mantemos pending=true até o dedo
               * ser retirado.
               */
              setFingerprintPending(
                true
              );

              console.log(
                "================================"
              );

              console.log(
                "FINGERPRINT AUTORIZADA"
              );

              console.log(
                "Pessoa:",
                pessoaFinal.nome
              );

              console.log(
                "Pessoa ID:",
                pessoaFinal.id
              );

              console.log(
                "Fingerprint ID:",
                id
              );

              console.log(
                "NOVO USO REGISTADO:"
              );

              console.log(
                registro
              );

              console.log(
                "================================"
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
               NÃO IDENTIFICADA
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
               AUTORIZADA GENÉRICA
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
                'Leitura concluída. Inicie uma Nova Pesagem para realizar outra leitura.'
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

              if (
                cadastroFingerprintRef.current
              ) {

                cadastroFingerprintRef.current =
                  null;
              }

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

    /* ========================================================
       MQTT JÁ CONECTADO
    ======================================================== */

    if (
      client?.connected
    ) {
      setMqttOnline(true);
    }

    /* ========================================================
       LIMPEZA
    ======================================================== */

    return () => {

      mounted = false;

      console.log(
        "Desmontando conexão MQTT do armazém."
      );

      pesoAnteriorBalanca2Ref.current =
        null;

      ultimoHistoricoAutomaticoBalanca2Ref.current =
        "";

      disconnectMqtt();
    };

  }, []);

  /* ==========================================================
     CADASTRAR PESSOA / FINGERPRINT
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
     INICIAR LEITURA
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

        /* ====================================================
           CONSUMIR LEITURA NESTA PESAGEM
        ==================================================== */

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

        console.log(
          "================================"
        );

        console.log(
          "INICIANDO LEITURA FINGERPRINT"
        );

        console.log(
          "Pessoas cadastradas:",
          pessoasRef.current.length
        );

        console.log(
          "LEITURA PERMITIDA: UMA VEZ POR PESAGEM"
        );

        console.log(
          "================================"
        );

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

  /* ==========================================================
     ALIAS
  ========================================================== */

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

        /*
         * Fingerprint permanece independente
         * do produto.
         */
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

        /*
         * Proteção adicional no frontend.
         *
         * Evita enviar duas confirmações
         * da mesma pesagem.
         */
        if (
          sensor1Confirmado
        ) {

          setErro(
            "A Balança 1 já foi confirmada nesta pesagem. Clique em \"Nova Pesagem\" para confirmar novamente."
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

        setSensor1Confirmado(
          true
        );

        setAguardandoConfirmacao(
          false
        );

        setMensagem(
          `Balança 1 confirmada: ${sensor1.toFixed(3)} kg.`
        );

        setErro("");

        return true;
      },
      [
        mqttOnline,
        sensor1,
        sensor1Confirmado,
      ]
    );

  /* ==========================================================
     CONFIRMAR BALANÇA 2
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

        /* ====================================================
           MQTT
        ==================================================== */

        if (
          !mqttOnline
        ) {

          setErro(
            "MQTT não está conectado."
          );

          return false;
        }

        /* ====================================================
           RESET BALANÇA 1 NO ESP32
           
           ESTE É O PONTO PRINCIPAL DA CORREÇÃO.
        ==================================================== */

        const resetEnviado =
          resetSensor1();

        if (
          !resetEnviado
        ) {

          console.error(
            "Não foi possível enviar reset_sensor1 para o ESP32."
          );

          setErro(
            "Não foi possível reiniciar a Balança 1 no ESP32."
          );

          return false;
        }

        /* ====================================================
           RESET LOCAL — BALANÇAS
        ==================================================== */

        setSensor1(0);
        setSensor2(0);

        setSensor1Confirmado(
          false
        );

        setSensor2Confirmado(
          false
        );

        /* ====================================================
           RESET BALANÇA 2
        ==================================================== */

        pesoAnteriorBalanca2Ref.current =
          null;

        ultimoHistoricoAutomaticoBalanca2Ref.current =
          "";

        /* ====================================================
           RESET CONFIRMAÇÃO
        ==================================================== */

        setAguardandoConfirmacao(
          false
        );

        /* ====================================================
           FINGERPRINT
           
           Nova Pesagem é o único momento normal
           que libera novamente o botão.
        ==================================================== */

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

        /* ====================================================
           MENSAGENS
        ==================================================== */

        setMensagem(
          "Nova pesagem iniciada. Balança 1 reiniciada e leitura de fingerprint disponível novamente."
        );

        setErro("");

        /* ====================================================
           INICIAR NOVA PESAGEM
        ==================================================== */

        startWeighing();

        console.log(
          "================================"
        );

        console.log(
          "NOVA PESAGEM"
        );

        console.log(
          "reset_sensor1 enviado"
        );

        console.log(
          "Balança 1 liberada"
        );

        console.log(
          "Fingerprint liberada novamente"
        );

        console.log(
          "================================"
        );

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

    /* ========================================================
       MQTT
    ======================================================== */

    mqttOnline,

    /* ========================================================
       PRODUTO
    ======================================================== */

    produto,

    setProduto,

    /* ========================================================
       BALANÇA 1
    ======================================================== */

    sensor1,

    sensor1Confirmado,

    /* ========================================================
       BALANÇA 2
    ======================================================== */

    sensor2,

    sensor2Confirmado,

    /* ========================================================
       CONFIRMAÇÃO
    ======================================================== */

    aguardandoConfirmacao,

    /* ========================================================
       FINGERPRINT
    ======================================================== */

    fingerprintPending,

    fingerprintLeituraIniciada,

    fingerprintStatus,

    fingerprintIdAtual,

    /* ========================================================
       PESSOA
    ======================================================== */

    pessoaAtual,

    pessoas,

    /* ========================================================
       HISTÓRICOS
    ======================================================== */

    historicoSensor1,

    historicoSensor2,

    historicoFingerprint,

    /* ========================================================
       CADASTRO
    ======================================================== */

    nomeFingerprint,

    setNomeFingerprint,

    idFingerprint,

    setIdFingerprint,

    /* ========================================================
       MENSAGENS
    ======================================================== */

    mensagem,

    erro,

    setErro,

    setMensagem,

    /* ========================================================
       FUNÇÕES
    ======================================================== */

    cadastrarPessoa,

    cadastrarProduto,

    confirmarBalanca1,

    confirmarBalanca2,

    /* ========================================================
       FINGERPRINT
    ======================================================== */

    reconhecerFingerprint,

    iniciarReconhecimentoFingerprint,

    /* ========================================================
       PESAGEM
    ======================================================== */

    novaPesagem,

    /* ========================================================
       RESET
    ======================================================== */

    resetBalanca1,

    resetBalanca2,
  };
}

