
"use client";

import React from "react";

interface CadastroFingerprintProps {
  nome: string;
  setNome: (value: string) => void;

  id: string;
  setId: (value: string) => void;

  mqttOnline: boolean;

  fingerprintStatus: string;

  onRegister: (
    id: number,
    nome: string
  ) => boolean;
}

export default function CadastroFingerprint({
  nome,
  setNome,
  id,
  setId,
  mqttOnline,
  fingerprintStatus,
  onRegister,
}: CadastroFingerprintProps) {
  // ======================================================
  // ESTADO ATUAL
  // ======================================================

  const status = fingerprintStatus.trim();

  // ======================================================
  // OPERAÇÃO DE CADASTRO EM ANDAMENTO
  // ======================================================

  const operacaoEmAndamento = [
    "aguardando_primeiro_dedo",
    "retire_o_dedo",
    "aguardando_segundo_dedo",
    "cadastro_concluido_retirar_dedo",
  ].includes(status);

  // ======================================================
  // ESTADOS
  // ======================================================

  const fingerprintCadastrada =
    status === "cadastrado";

  const fingerprintOnline =
    status === "online";

  const fingerprintOffline =
    status === "offline";

  // ======================================================
  // SUBMETER CADASTRO
  // ======================================================

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    // ----------------------------------------------------
    // VERIFICAR MQTT
    // ----------------------------------------------------

    if (!mqttOnline) {
      return;
    }

    // ----------------------------------------------------
    // CONVERTER ID
    // ----------------------------------------------------

    const fingerprintId = Number(id);

    // ----------------------------------------------------
    // VALIDAR ID
    // ----------------------------------------------------

    if (
      !Number.isInteger(fingerprintId) ||
      fingerprintId < 1 ||
      fingerprintId > 127
    ) {
      return;
    }

    // ----------------------------------------------------
    // LIMPAR NOME
    // ----------------------------------------------------

    const nomeLimpo = nome.trim();

    // ----------------------------------------------------
    // VALIDAR NOME
    // ----------------------------------------------------

    if (!nomeLimpo) {
      return;
    }

    // ----------------------------------------------------
    // NÃO PERMITIR OUTRO CADASTRO
    // ----------------------------------------------------

    if (operacaoEmAndamento) {
      return;
    }

    // ----------------------------------------------------
    // ENVIAR PARA O HOOK
    // ----------------------------------------------------

    onRegister(
      fingerprintId,
      nomeLimpo
    );
  }

  // ======================================================
  // MENSAGEM DO ESTADO
  // ======================================================

  function obterMensagemStatus(): string {
    switch (status) {
      case "online":
        return "Fingerprint online e pronta para cadastro.";

      case "offline":
        return "Fingerprint offline.";

      case "aguardando_primeiro_dedo":
        return "Coloque o dedo no sensor.";

      case "retire_o_dedo":
        return "Retire o dedo do sensor.";

      case "aguardando_segundo_dedo":
        return "Coloque o mesmo dedo novamente.";

      case "cadastrado":
        return "Fingerprint cadastrada com sucesso.";

      case "cadastro_concluido_retirar_dedo":
        return "Cadastro concluído. Retire o dedo.";

      case "erro_id":
        return "ID inválido. Utilize um valor entre 1 e 127.";

      case "erro_nome":
        return "Informe o nome da pessoa.";

      case "erro_primeiro_dedo":
        return "Erro ao capturar o primeiro dedo.";

      case "erro_segundo_dedo":
        return "Erro ao capturar o segundo dedo.";

      case "erro_captura":
        return "Erro ao capturar a impressão digital.";

      case "erro_conversao":
        return "Erro ao converter a impressão digital.";

      case "erro_gravar":
        return "Erro ao gravar a fingerprint no sensor.";

      case "erro_memoria":
        return "Erro ao guardar os dados na memória do ESP32.";

      case "digitais_nao_correspondem":
        return "As duas leituras não correspondem. Tente novamente.";

      case "timeout":
        return "Tempo limite excedido. Operação encerrada.";

      case "reset":
        return "Fingerprint resetada.";

      default:
        return status || "Aguardando operação...";
    }
  }

  // ======================================================
  // CLASSE VISUAL DO ESTADO
  // ======================================================

  function obterClasseStatus(): string {
    if (fingerprintOffline) {
      return "bg-red-50 text-red-700 border-red-200";
    }

    if (
      fingerprintCadastrada ||
      fingerprintOnline
    ) {
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (operacaoEmAndamento) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (status.startsWith("erro")) {
      return "bg-red-50 text-red-700 border-red-200";
    }

    return "bg-gray-50 text-gray-700 border-gray-200";
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">

      {/* ==================================================
          CABEÇALHO
      ================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

        <div>
          <h2 className="text-xl font-bold text-[#001431]">
            Gestão de Pessoas / Fingerprint
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Cadastre uma pessoa associando o nome ao
            ID da fingerprint.
          </p>
        </div>

        {/* ==================================================
            ESTADO MQTT
        ================================================== */}

        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${
            mqttOnline
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {mqttOnline
            ? "MQTT Online"
            : "MQTT Offline"}
        </div>
      </div>

      {/* ==================================================
          FORMULÁRIO
      ================================================== */}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >

        {/* ==================================================
            NOME
        ================================================== */}

        <div>
          <label className="block text-sm font-semibold text-[#001431] mb-2">
            Nome da pessoa
          </label>

          <input
            type="text"
            value={nome}
            onChange={(event) => {
              setNome(event.target.value);
            }}
            placeholder="Nome completo"
            disabled={
              !mqttOnline ||
              operacaoEmAndamento
            }
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#10b981] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* ==================================================
            ID
        ================================================== */}

        <div>
          <label className="block text-sm font-semibold text-[#001431] mb-2">
            ID da Fingerprint
          </label>

          <input
            type="number"
            min={1}
            max={127}
            value={id}
            onChange={(event) => {
              setId(event.target.value);
            }}
            placeholder="1 - 127"
            disabled={
              !mqttOnline ||
              operacaoEmAndamento
            }
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#10b981] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* ==================================================
            BOTÃO CADASTRAR
        ================================================== */}

        <div className="flex items-end">
          <button
            type="submit"
            disabled={
              !mqttOnline ||
              nome.trim() === "" ||
              id.trim() === "" ||
              operacaoEmAndamento
            }
            className="w-full bg-[#10b981] hover:bg-[#0ea371] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition"
          >
            {operacaoEmAndamento
              ? "Fingerprint em operação..."
              : "Cadastrar Fingerprint"}
          </button>
        </div>
      </form>

      {/* ==================================================
          ESTADO DA FINGERPRINT
      ================================================== */}

      <div
        className={`mt-5 rounded-xl border p-4 ${obterClasseStatus()}`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">

          <div>
            <span className="font-semibold">
              Estado da fingerprint:
            </span>

            <span className="ml-2">
              {obterMensagemStatus()}
            </span>
          </div>

          {status !== "" && (
            <span className="text-xs font-mono opacity-70">
              {status}
            </span>
          )}
        </div>
      </div>

      {/* ==================================================
          FLUXO DE CADASTRO
      ================================================== */}

      <div className="mt-4 rounded-xl bg-[#001431]/5 p-4">

        <p className="text-sm font-semibold text-[#001431] mb-2">
          Fluxo de cadastro
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">

          <div>
            <strong>1.</strong>{" "}
            Informe o nome e o ID.
          </div>

          <div>
            <strong>2.</strong>{" "}
            Coloque o dedo duas vezes quando solicitado.
          </div>

          <div>
            <strong>3.</strong>{" "}
            O ESP32 grava a fingerprint no sensor.
          </div>

        </div>

        <p className="text-sm text-gray-500 mt-3">
          Depois do cadastro, o reconhecimento é iniciado
          separadamente na área de reconhecimento.
        </p>
      </div>

    </section>
  );
}

