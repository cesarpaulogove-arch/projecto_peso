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
  confirmSensor2,
} from "@/lib/mqtt";

import type {
  SensorData,
  FingerprintData,
  WeighingSensor1,
  WeighingSensor2,
  Person,
} from "../types/armazem";

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

function getPersonId(
  payload: SensorData | FingerprintData
): string {
  return String(
    payload.pessoa_id ??
      payload.pessoaId ??
      ""
  ).trim();
}

function getPersonName(
  payload: SensorData | FingerprintData
): string {
  let nome: string | null | undefined;

  if ("nome" in payload) {
    nome = payload.nome;
  }

  return String(
    payload.pessoa_nome ??
      payload.pessoaNome ??
      nome ??
      ""
  ).trim();
}

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

function getTimestamp(
  payload: SensorData
): string {
  return (
    payload.timestamp ??
    payload.data_hora ??
    payload.data ??
    new Date().toISOString()
  );
}

function getStatus(
  payload: SensorData | FingerprintData
): string {
  return String(
    payload.status ??
      payload.estado ??
      ""
  )
    .trim()
    .toLowerCase();
}

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
   HOOK
============================================================ */

export function useArmazemMqtt() {
  /* ==========================================================
     MQTT
  ========================================================== */

  const [mqttOnline, setMqttOnline] =
    useState(false);

  /* ==========================================================
     PRODUTO
  ========================================================== */

  const [produto, setProduto] =
    useState("");

  const produtoRef =
    useRef("");

  /* ==========================================================
     BALANÇA 1
  ========================================================== */

  const [sensor1, setSensor1] =
    useState(0);

  const [
    sensor1Confirmado,
    setSensor1Confirmado,
  ] = useState(false);

  /* ==========================================================
     BALANÇA 2
  ========================================================== */

  const [sensor2, setSensor2] =
    useState(0);

  const [
    sensor2Confirmado,
    setSensor2Confirmado,
  ] = useState(false);

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

  /* ==========================================================
     HISTÓRICO
  ========================================================== */

  const [
    historicoSensor1,
    setHistoricoSensor1,
  ] = useState<WeighingSensor1[]>([]);

  const [
    historicoSensor2,
    setHistoricoSensor2,
  ] = useState<WeighingSensor2[]>([]);

  /* ==========================================================
     CADASTRO FINGERPRINT
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

  const [mensagem, setMensagem] =
    useState("");

  const [erro, setErro] =
    useState("");

  /* ==========================================================
     PRODUTO REF
  ========================================================== */

  useEffect(() => {
    produtoRef.current = produto;
  }, [produto]);

  /* ==========================================================
     DADOS LOCAIS
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

      if (pessoasSalvas) {
        const dados =
          JSON.parse(pessoasSalvas);

        if (Array.isArray(dados)) {
          setPessoas(dados);
        }
      }

      if (historico1) {
        const dados =
          JSON.parse(historico1);

        if (Array.isArray(dados)) {
          setHistoricoSensor1(dados);
        }
      }

      if (historico2) {
        const dados =
          JSON.parse(historico2);

        if (Array.isArray(dados)) {
          setHistoricoSensor2(dados);
        }
      }
    } catch (error) {
      console.error(
        "Erro ao carregar dados locais:",
        error
      );
    }
  }, []);

  /* ==========================================================
     GUARDAR PESSOAS
  ========================================================== */

  useEffect(() => {
    localStorage.setItem(
      "armazem_pessoas",
      JSON.stringify(pessoas)
    );
  }, [pessoas]);

  /* ==========================================================
     GUARDAR HISTÓRICO 1
  ========================================================== */

  useEffect(() => {
    localStorage.setItem(
      "armazem_historico_sensor1",
      JSON.stringify(
        historicoSensor1
      )
    );
  }, [historicoSensor1]);

  /* ==========================================================
     GUARDAR HISTÓRICO 2
  ========================================================== */

  useEffect(() => {
    localStorage.setItem(
      "armazem_historico_sensor2",
      JSON.stringify(
        historicoSensor2
      )
    );
  }, [historicoSensor2]);

  /* ==========================================================
     MQTT
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const client = connectMqtt({
      onConnect: () => {
        if (!mounted) {
          return;
        }

        setMqttOnline(true);
        setErro("");

        console.log(
          "MQTT conectado"
        );
      },

      onDisconnect: () => {
        if (!mounted) {
          return;
        }

        setMqttOnline(false);

        console.log(
          "MQTT desconectado"
        );
      },

      onError: (error: Error) => {
        if (!mounted) {
          return;
        }

        console.error(
          "MQTT error:",
          error
        );

        setMqttOnline(false);

        setErro(
          error.message ||
            "Erro na conexão MQTT."
        );
      },

      onMessage: (
        topic: string,
        data: unknown
      ) => {
        if (!mounted) {
          return;
        }

        /*
         * O lib/mqtt.ts já fez o JSON.parse().
         *
         * Portanto NÃO fazemos:
         *
         * JSON.parse(rawPayload)
         *
         * aqui.
         */

        if (!isObject(data)) {
          console.warn(
            "Payload MQTT não é um objeto:",
            data
          );

          return;
        }

        /* ====================================================
           BALANÇA 1
        ==================================================== */

        if (
          topic ===
          MQTT_TOPICS.weight1
        ) {
          const payload =
            data as SensorData;

          const peso =
            getNumericWeight(
              payload
            );

          const status =
            getStatus(payload);

          setSensor1(peso);

          if (
            payload.confirmado ===
              true ||
            status ===
              "confirmado"
          ) {
            setSensor1Confirmado(
              true
            );

            setAguardandoConfirmacao(
              false
            );

            /*
             * O ESP32 deve iniciar
             * o reconhecimento da
             * fingerprint.
             */
            setFingerprintPending(
              true
            );

            setFingerprintStatus(
              "Balança 1 confirmada. Aproxime o dedo cadastrado."
            );
          }

          return;
        }

        /* ====================================================
           BALANÇA 2
        ==================================================== */

        if (
          topic ===
          MQTT_TOPICS.weight2
        ) {
          const payload =
            data as SensorData;

          const peso =
            getNumericWeight(
              payload
            );

          const status =
            getStatus(payload);

          setSensor2(peso);

          if (
            payload.confirmado ===
              true ||
            status ===
              "confirmado"
          ) {
            setSensor2Confirmado(
              true
            );
          }

          return;
        }

        /* ====================================================
           FINGERPRINT
        ==================================================== */

        if (
          topic ===
          MQTT_TOPICS.fingerprint
        ) {
          const payload =
            data as FingerprintData;

          const status =
            getStatus(payload);

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
            getMessage(payload);

          if (
            id !== undefined
          ) {
            setFingerprintIdAtual(
              id
            );
          }

          setFingerprintStatus(
            message ||
              payload.status ||
              payload.estado ||
              ""
          );

          /* ------------------------------------------------
             CADASTRO EM ANDAMENTO
          ------------------------------------------------ */

          if (
            [
              "enrolling",
              "enroll",
              "registering",
              "cadastrando",
              "cadastro",
              "aguardando",
            ].includes(status)
          ) {
            return;
          }

          /* ------------------------------------------------
             RETIRAR DEDO
          ------------------------------------------------ */

          if (
            [
              "remove",
              "removed",
              "removido",
              "retire",
              "retirar",
            ].includes(status)
          ) {
            setFingerprintStatus(
              message ||
                "Retire o dedo do sensor."
            );

            return;
          }

          /* ------------------------------------------------
             CADASTRO CONCLUÍDO
          ------------------------------------------------ */

          if (
            [
              "success",
              "sucesso",
              "registered",
              "registado",
              "registrado",
              "cadastrado",
              "cadastro_sucesso",
              "enrolled",
              "enroll_success",
            ].includes(status)
          ) {
            const cadastro =
              cadastroFingerprintRef.current;

            if (cadastro) {
              const novaPessoa:
                Person = {
                id: cadastro.id,

                nome:
                  nome ||
                  cadastro.nome,

                status:
                  "Cadastrado",

                timestamp:
                  new Date().toISOString(),
              };

              setPessoas(
                (prev) => {
                  const existente =
                    prev.find(
                      (pessoa) =>
                        pessoa.id ===
                        novaPessoa.id
                    );

                  if (
                    existente
                  ) {
                    return prev.map(
                      (pessoa) =>
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

              cadastroFingerprintRef.current =
                null;
            }

            setFingerprintStatus(
              message ||
                "Fingerprint cadastrada com sucesso."
            );

            return;
          }

          /* ------------------------------------------------
             FINGERPRINT RECONHECIDA
          ------------------------------------------------ */

          if (
            [
              "recognized",
              "recognised",
              "reconhecido",
              "reconhecida",
              "recognized_fingerprint",
              "fingerprint_recognized",
              "success_recognition",
            ].includes(status)
          ) {
            const pessoaEncontrada =
              pessoas.find(
                (pessoa) => {
                  if (
                    pessoaId &&
                    String(
                      pessoa.id
                    ) ===
                      pessoaId
                  ) {
                    return true;
                  }

                  if (
                    nome &&
                    pessoa.nome
                      .toLowerCase() ===
                      nome.toLowerCase()
                  ) {
                    return true;
                  }

                  return false;
                }
              );

            if (
              pessoaEncontrada
            ) {
              setPessoaAtual(
                pessoaEncontrada
              );
            } else if (
              pessoaId ||
              nome
            ) {
              setPessoaAtual({
                id: Number(
                  pessoaId ||
                    0
                ),

                nome:
                  nome ||
                  "Pessoa reconhecida",

                status:
                  "Reconhecido",

                timestamp:
                  new Date().toISOString(),
              });
            }

            setFingerprintPending(
              false
            );

            setFingerprintStatus(
              message ||
                "Fingerprint reconhecida."
            );

            return;
          }

          /* ------------------------------------------------
             AUTORIZADO
          ------------------------------------------------ */

          if (
            [
              "authorized",
              "autorizado",
              "autorizada",
            ].includes(status)
          ) {
            setFingerprintPending(
              false
            );

            setFingerprintStatus(
              message ||
                "Fingerprint autorizada."
            );

            return;
          }

          /* ------------------------------------------------
             IMPRESSÃO
          ------------------------------------------------ */

          if (
            [
              "printed",
              "impresso",
              "impressao",
              "confirmado_impresso",
            ].includes(status)
          ) {
            setFingerprintPending(
              false
            );

            setFingerprintStatus(
              message ||
                "Recibo impresso."
            );

            return;
          }

          /* ------------------------------------------------
             NEGADO
          ------------------------------------------------ */

          if (
            [
              "denied",
              "negado",
              "nao_autorizado",
              "não_autorizado",
              "not_found",
              "nao_encontrado",
              "não_encontrado",
            ].includes(status)
          ) {
            setFingerprintPending(
              false
            );

            setFingerprintStatus(
              message ||
                "Fingerprint não autorizada."
            );

            return;
          }

          /* ------------------------------------------------
             ERRO
          ------------------------------------------------ */

          if (
            [
              "error",
              "erro",
              "failed",
              "falhou",
            ].includes(status)
          ) {
            setFingerprintPending(
              false
            );

            setErro(
              message ||
                "Erro no sensor fingerprint."
            );

            return;
          }

          return;
        }

        /* ====================================================
           HISTÓRICO
        ==================================================== */

        if (
          topic ===
          MQTT_TOPICS.history
        ) {
          const payload =
            data as SensorData;

          const produtoHistorico =
            getProduct(
              payload
            );

          const timestamp =
            getTimestamp(
              payload
            );

          const pessoaId =
            getPersonId(
              payload
            );

          const pessoaNome =
            getPersonName(
              payload
            );

          const fingerprintId =
            getFingerprintId(
              payload
            );

          const peso =
            getNumericWeight(
              payload
            );

          const sensor =
            Number(
              payload.sensor ??
                payload.sensor_id ??
                payload.balanca ??
                1
            );

          const statusHistorico =
            getStatus(payload);

          const printed =
            payload.printed ===
              true ||
            statusHistorico ===
              "printed" ||
            statusHistorico ===
              "confirmado_impresso";

          /* ------------------------------------------------
             HISTÓRICO BALANÇA 1
          ------------------------------------------------ */

          if (
            sensor === 1
          ) {
            const registro:
              WeighingSensor1 = {
              id: String(
                payload.id ??
                  `${Date.now()}-1`
              ),

              product:
                produtoHistorico ||
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

              pessoaId:
                pessoaId ||
                undefined,

              pessoaNome:
                pessoaNome ||
                undefined,

              fingerprintId,

              printed,
            };

            setHistoricoSensor1(
              (prev) => [
                registro,
                ...prev,
              ]
            );

            return;
          }

          /* ------------------------------------------------
             HISTÓRICO BALANÇA 2
          ------------------------------------------------ */

          if (
            sensor === 2
          ) {
            const registro:
              WeighingSensor2 = {
              id: String(
                payload.id ??
                  `${Date.now()}-2`
              ),

              product:
                produtoHistorico ||
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

              pessoaId:
                pessoaId ||
                undefined,

              pessoaNome:
                pessoaNome ||
                undefined,

              fingerprintId,
            };

            setHistoricoSensor2(
              (prev) => [
                registro,
                ...prev,
              ]
            );
          }

          return;
        }

        /* ====================================================
           IMPRESSORA
        ==================================================== */

        if (
          topic ===
          MQTT_TOPICS.printerStatus
        ) {
          const payload =
            data as SensorData;

          const status =
            getStatus(payload);

          if (
            [
              "printed",
              "impresso",
              "impressao",
            ].includes(status)
          ) {
            setFingerprintStatus(
              "Recibo impresso com sucesso."
            );
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
          }
        }
      },
    });

    return () => {
      mounted = false;

      if (client) {
        disconnectMqtt();
      }
    };
  }, [pessoas]);

  /* ==========================================================
     CADASTRAR PESSOA
  ========================================================== */

  const cadastrarPessoa =
    useCallback(
      (
        id: number,
        nome: string
      ) => {
        if (!mqttOnline) {
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

        if (!nomeNormalizado) {
          setErro(
            "Informe o nome da pessoa."
          );

          return false;
        }

        const existente =
          pessoas.some(
            (pessoa) =>
              pessoa.id === id
          );

        if (existente) {
          setErro(
            `O ID ${id} já está cadastrado.`
          );

          return false;
        }

        cadastroFingerprintRef.current =
          {
            id,
            nome:
              nomeNormalizado,
          };

        publishMqtt(
          MQTT_TOPICS.command,
          {
            comando:
              "enroll_fingerprint",

            command:
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

        setFingerprintStatus(
          `Coloque o dedo no sensor para cadastrar ${nomeNormalizado}.`
        );

        return true;
      },
      [
        mqttOnline,
        pessoas,
      ]
    );

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

        if (!produtoNome) {
          setErro(
            "Informe o produto."
          );

          return false;
        }

        if (!mqttOnline) {
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

        setFingerprintPending(
          false
        );

        setFingerprintStatus(
          ""
        );

        setPessoaAtual(
          null
        );

        setFingerprintIdAtual(
          undefined
        );

        setAguardandoConfirmacao(
          false
        );

        setMensagem(
          `Produto "${produtoNome}" registado.`
        );

        setProduct(
          produtoNome
        );

        startWeighing();

        return true;
      },
      [mqttOnline]
    );

  /* ==========================================================
     CONFIRMAR BALANÇA 1
  ========================================================== */

  const confirmarBalanca1 =
    useCallback(
      () => {
        if (!mqttOnline) {
          setErro(
            "MQTT não está conectado."
          );

          return false;
        }

        if (!produtoRef.current) {
          setErro(
            "Registe primeiro o produto."
          );

          return false;
        }

        if (sensor1 <= 0) {
          setErro(
            "A balança 1 ainda não possui um peso válido."
          );

          return false;
        }

        /*
         * IMPORTANTE:
         * confirmSensor1 recebe UM argumento.
         */

        confirmSensor1({
          peso: sensor1,
          produto:
            produtoRef.current,
        });

        setAguardandoConfirmacao(
          true
        );

        setMensagem(
          "Aguardando confirmação da Balança 1..."
        );

        return true;
      },
      [
        mqttOnline,
        sensor1,
      ]
    );

  /* ==========================================================
     CONFIRMAR BALANÇA 2
  ========================================================== */

  const confirmarBalanca2 =
    useCallback(
      () => {
        if (!mqttOnline) {
          setErro(
            "MQTT não está conectado."
          );

          return false;
        }

        if (sensor2 <= 0) {
          setErro(
            "A balança 2 ainda não possui um peso válido."
          );

          return false;
        }

        /*
         * IMPORTANTE:
         * confirmSensor2 recebe UM argumento.
         */

        confirmSensor2({
          peso: sensor2,
          produto:
            produtoRef.current,
        });

        setMensagem(
          "Balança 2 confirmada."
        );

        return true;
      },
      [
        mqttOnline,
        sensor2,
      ]
    );

  /* ==========================================================
     NOVA PESAGEM
  ========================================================== */

  const novaPesagem =
    useCallback(() => {
      setSensor1(0);
      setSensor2(0);

      setSensor1Confirmado(
        false
      );

      setSensor2Confirmado(
        false
      );

      setAguardandoConfirmacao(
        false
      );

      setFingerprintPending(
        false
      );

      setFingerprintStatus(
        ""
      );

      setPessoaAtual(
        null
      );

      setFingerprintIdAtual(
        undefined
      );

      setMensagem(
        "Nova pesagem iniciada."
      );

      startWeighing();
    }, []);

  /* ==========================================================
     RESET BALANÇA 1
  ========================================================== */

  const resetBalanca1 =
    useCallback(() => {
      setSensor1(0);

      setSensor1Confirmado(
        false
      );

      setAguardandoConfirmacao(
        false
      );

      setFingerprintPending(
        false
      );

      setFingerprintStatus(
        ""
      );

      setPessoaAtual(
        null
      );

      setFingerprintIdAtual(
        undefined
      );
    }, []);

  /* ==========================================================
     RESET BALANÇA 2
  ========================================================== */

  const resetBalanca2 =
    useCallback(() => {
      setSensor2(0);

      setSensor2Confirmado(
        false
      );
    }, []);

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
    fingerprintStatus,
    fingerprintIdAtual,

    pessoaAtual,
    pessoas,

    historicoSensor1,
    historicoSensor2,

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

    novaPesagem,
    resetBalanca1,
    resetBalanca2,
  };
}