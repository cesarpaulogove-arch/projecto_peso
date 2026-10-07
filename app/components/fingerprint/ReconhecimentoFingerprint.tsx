"use client";

import type { Person } from "../../types/armazem";

interface Props {
  pending: boolean;

  /**
   * Indica se "Iniciar Leitura" já foi utilizado
   * nesta operação de pesagem.
   *
   * Depois de true, permanece true até
   * "Nova Pesagem" ser executado.
   */
  fingerprintLeituraIniciada: boolean;

  status: string;

  fingerprintId?: number;

  pessoa: Person | null;

  onRecognize: () => boolean;
}

export default function ReconhecimentoFingerprint({
  pending,
  fingerprintLeituraIniciada,
  status,
  fingerprintId,
  pessoa,
  onRecognize,
}: Props) {
  // ============================================================
  // NORMALIZAR ESTADO
  // ============================================================

  const statusNormalizado = status.trim().toLowerCase();

  // ============================================================
  // ESTADOS DO ESP32
  // ============================================================

  const aguardandoDedo =
    statusNormalizado === "aguardando_dedo";

  const identificado =
    statusNormalizado === "identificado";

  const retirarDedo =
    statusNormalizado ===
    "identificado_retirar_dedo";

  const naoIdentificado =
    statusNormalizado === "nao_identificado" ||
    statusNormalizado === "não_identificado";

  const cadastroEmAndamento =
    statusNormalizado === "aguardando_primeiro_dedo" ||
    statusNormalizado === "retire_o_dedo" ||
    statusNormalizado === "aguardando_segundo_dedo" ||
    statusNormalizado === "cadastro_concluido_retirar_dedo";

  // ============================================================
  // OPERAÇÃO EM ANDAMENTO
  // ============================================================

  const operacaoEmAndamento =
    pending ||
    aguardandoDedo ||
    retirarDedo ||
    cadastroEmAndamento;

  // ============================================================
  // BOTÃO PODE SER UTILIZADO?
  // ============================================================

  /*
   * REGRA PRINCIPAL:
   *
   * O botão só pode ser usado uma única vez por pesagem.
   *
   * Depois que fingerprintLeituraIniciada === true,
   * nunca mais fica ativo nesta operação.
   *
   * Somente "Nova Pesagem" deve alterar esse valor
   * novamente para false.
   */
  const podeIniciar =
    !fingerprintLeituraIniciada &&
    !operacaoEmAndamento;

  // ============================================================
  // INICIAR RECONHECIMENTO
  // ============================================================

  function handleStart() {
    // Proteção contra duplo clique
    if (fingerprintLeituraIniciada) {
      return;
    }

    // Não iniciar enquanto outra operação estiver ativa
    if (operacaoEmAndamento) {
      return;
    }

    // Inicia a leitura
    onRecognize();
  }

  // ============================================================
  // TEXTO DO ESTADO
  // ============================================================

  function obterMensagemStatus(): string {
    switch (statusNormalizado) {
      case "aguardando_dedo":
        return "Coloque o dedo cadastrado no sensor.";

      case "identificado":
        return "Fingerprint reconhecida com sucesso.";

      case "identificado_retirar_dedo":
        return "Pessoa identificada. Retire o dedo do sensor.";

      case "nao_identificado":
      case "não_identificado":
        return "Fingerprint não identificada. Retire o dedo do sensor.";

      case "aguardando_primeiro_dedo":
        return "Cadastro em andamento. Coloque o primeiro dedo.";

      case "retire_o_dedo":
        return "Retire o dedo do sensor.";

      case "aguardando_segundo_dedo":
        return "Coloque o mesmo dedo novamente.";

      case "cadastro_concluido_retirar_dedo":
        return "Cadastro concluído. Retire o dedo.";

      case "cadastrado":
        return "Fingerprint cadastrada com sucesso.";

      case "online":
        return "Leitor de fingerprint online e pronto.";

      case "offline":
        return "Leitor de fingerprint offline.";

      case "reset":
        return "Leitor reiniciado.";

      case "erro_id":
        return "ID de fingerprint inválido.";

      case "erro_nome":
        return "Nome da pessoa inválido.";

      case "erro_captura":
        return "Erro ao capturar a impressão digital.";

      case "erro_busca":
        return "Erro durante a procura da fingerprint.";

      case "nome_nao_encontrado":
        return "Fingerprint encontrada, mas o nome não foi localizado.";

      case "timeout":
        return "Tempo limite excedido. Operação encerrada.";

      default:
        return status || "Nenhuma leitura de fingerprint ativa.";
    }
  }

  // ============================================================
  // COR DO ESTADO
  // ============================================================

  function obterClasseStatus(): string {
    if (identificado) {
      return "bg-green-50 border-green-200 text-green-700";
    }

    if (retirarDedo) {
      return "bg-yellow-50 border-yellow-200 text-yellow-700";
    }

    if (naoIdentificado) {
      return "bg-red-50 border-red-200 text-red-700";
    }

    if (aguardandoDedo || pending) {
      return "bg-blue-50 border-blue-200 text-blue-700";
    }

    if (statusNormalizado.startsWith("erro")) {
      return "bg-red-50 border-red-200 text-red-700";
    }

    return "bg-gray-50 border-gray-200 text-gray-700";
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">

      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>

          <h2 className="text-xl font-bold text-[#001431]">
            Reconhecimento de Fingerprint
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Clique em Iniciar Leitura para identificar
            uma pessoa já cadastrada.
          </p>

        </div>

      </div>

      {/* ======================================================
          ESTADO
      ====================================================== */}

      <div
        className={`mt-5 rounded-xl border p-4 ${obterClasseStatus()}`}
      >

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">

          <div>

            <span className="font-semibold">
              Estado:
            </span>

            <span className="ml-2">
              {obterMensagemStatus()}
            </span>

          </div>

          {status && (
            <span className="text-xs font-mono opacity-70">
              ESP32: {status}
            </span>
          )}

        </div>

      </div>

      {/* ======================================================
          ÁREA PRINCIPAL
      ====================================================== */}

      <div className="mt-5 rounded-xl bg-gray-50 p-6">

        {/* ====================================================
            LEITURA EM ANDAMENTO
        ==================================================== */}

        {operacaoEmAndamento ? (

          <div>

            <div className="flex items-center gap-3">

              <div
                className={`w-4 h-4 rounded-full animate-pulse ${
                  retirarDedo
                    ? "bg-yellow-500"
                    : "bg-blue-500"
                }`}
              />

              <p className="text-lg font-semibold text-[#001431]">

                {retirarDedo
                  ? "Leitura concluída"
                  : "Leitura de Fingerprint ativa"}

              </p>

            </div>

            <p className="text-gray-500 mt-3">
              {obterMensagemStatus()}
            </p>

            <div
              className={`mt-5 rounded-xl border p-5 ${
                retirarDedo
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-white border-gray-200"
              }`}
            >

              <p className="text-sm font-semibold text-[#001431]">
                Ação necessária
              </p>

              <p className="text-gray-500 mt-1">

                {retirarDedo
                  ? "Retire o dedo do sensor."
                  : aguardandoDedo || pending
                    ? "Coloque no sensor um dedo que já tenha sido cadastrado."
                    : "Aguarde a conclusão da operação."}

              </p>

            </div>

          </div>

        ) : fingerprintLeituraIniciada ? (

          /* ==================================================
             LEITURA JÁ UTILIZADA
          ================================================== */

          <div>

            <div className="flex items-center gap-3">

              <div className="w-4 h-4 rounded-full bg-gray-400" />

              <p className="text-lg font-semibold text-[#001431]">
                Leitura já realizada nesta operação
              </p>

            </div>

            <p className="text-gray-500 mt-3">
              O leitor de fingerprint está parado.
            </p>

            <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-5">

              <p className="text-sm font-semibold text-yellow-700">
                Nova leitura bloqueada
              </p>

              <p className="text-sm text-yellow-600 mt-1">
                O botão Iniciar Leitura só poderá ser utilizado
                novamente depois de clicar em Nova Pesagem.
              </p>

            </div>

            <button
              type="button"
              disabled
              className="mt-5 bg-gray-400 text-white font-semibold rounded-xl px-6 py-3 cursor-not-allowed"
            >
              Iniciar Leitura
            </button>

          </div>

        ) : (

          /* ==================================================
             LEITOR DISPONÍVEL
          ================================================== */

          <div>

            <p className="text-sm text-gray-500">
              Leitor de fingerprint
            </p>

            <p className="text-lg font-semibold text-[#001431] mt-1">
              Pronto para uma nova leitura
            </p>

            <p className="text-sm text-gray-500 mt-2">
              Clique no botão abaixo quando quiser iniciar
              a identificação de uma pessoa cadastrada.
            </p>

            <button
              type="button"
              onClick={handleStart}
              disabled={!podeIniciar}
              className="mt-5 bg-[#001431] hover:bg-[#00264f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 transition"
            >
              Iniciar Leitura
            </button>

          </div>

        )}

        {/* ====================================================
            FINGERPRINT NÃO IDENTIFICADA
        ==================================================== */}

        {naoIdentificado && !pessoa && (

          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-5">

            <p className="text-sm font-semibold text-red-700">
              Fingerprint não reconhecida
            </p>

            <p className="text-sm text-red-600 mt-1">
              Retire o dedo do sensor.
              A leitura continuará bloqueada nesta operação.
            </p>

            <div className="mt-3 rounded-lg bg-white/60 border border-red-100 p-3">

              <p className="text-sm font-semibold text-red-700">
                Para tentar novamente
              </p>

              <p className="text-sm text-red-600 mt-1">
                Clique em Nova Pesagem para liberar
                uma nova leitura de fingerprint.
              </p>

            </div>

          </div>

        )}

        {/* ====================================================
            PESSOA AUTORIZADA
        ==================================================== */}

        {pessoa && (

          <div className="mt-6 border-t border-gray-200 pt-5">

            <div className="rounded-xl bg-green-50 border border-green-200 p-5">

              <div className="flex items-center gap-2">

                <div className="w-3 h-3 rounded-full bg-green-500" />

                <p className="text-sm font-semibold text-green-700">
                  Pessoa autorizada
                </p>

              </div>

              <p className="text-2xl font-bold text-[#10b981] mt-2">
                {pessoa.nome}
              </p>

              <div className="mt-3 space-y-1">

                <p className="text-sm text-gray-600">

                  ID da pessoa:{" "}

                  <span className="font-semibold">
                    {pessoa.id}
                  </span>

                </p>

                {fingerprintId !== undefined && (

                  <p className="text-sm text-gray-600">

                    Fingerprint:{" "}

                    <span className="font-semibold">
                      {fingerprintId}
                    </span>

                  </p>

                )}

              </div>

              {retirarDedo && (

                <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">

                  <p className="text-sm font-semibold text-yellow-700">
                    Retire o dedo
                  </p>

                  <p className="text-sm text-yellow-600 mt-1">
                    Depois de retirar o dedo, o leitor ficará
                    parado. Para realizar outra leitura,
                    clique em Nova Pesagem.
                  </p>

                </div>

              )}

              {!operacaoEmAndamento &&
                fingerprintLeituraIniciada && (

                  <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">

                    <p className="text-sm font-semibold text-blue-700">
                      Leitura desta operação concluída
                    </p>

                    <p className="text-sm text-blue-600 mt-1">
                      O uso foi registado no histórico.
                      Clique em Nova Pesagem para habilitar
                      outra leitura.
                    </p>

                  </div>

                )}

            </div>

          </div>

        )}

      </div>

    </section>
  );
}