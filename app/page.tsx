
"use client";

import { useArmazemMqtt } from "./hooks/useArmazemMqtt";

import CadastroFingerprint from "./components/fingerprint/CadastroFingerprint";
import ReconhecimentoFingerprint from "./components/fingerprint/ReconhecimentoFingerprint";
import CadastroProduto from "./components/produto/CadastroProduto";

import Balanca1 from "./components/balancas/Balanca1";
import Balanca2 from "./components/balancas/Balanca2";

import HistoricoBalanca1 from "./components/historico/HistoricoBalanca1";
import HistoricoBalanca2 from "./components/historico/HistoricoBalanca2";
import HistoricoFingerprint from "./components/historico/HistoricoFingerprint";

export default function Page() {
  const armazem = useArmazemMqtt();

  // ==========================================================
  // CADASTRAR PESSOA / FINGERPRINT
  // ==========================================================

  function cadastrarPessoa(id: number, nome: string) {
    const sucesso = armazem.cadastrarPessoa(id, nome);

    if (sucesso) {
      armazem.setNomeFingerprint("");
      armazem.setIdFingerprint("");
    }

    return sucesso;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa]">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="bg-[#001431] text-white">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold">
                Gestão de Armazém
              </h1>

              <p className="text-white/70 text-sm mt-1">
                Sistema de pesagem, fingerprint e controlo de acesso
              </p>
            </div>

            {/* ==================================================
                ESTADO MQTT
            ================================================== */}

            <div
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
                armazem.mqttOnline
                  ? "bg-[#10b981]"
                  : "bg-red-500"
              }`}
            >
              {armazem.mqttOnline
                ? "MQTT Online"
                : "MQTT Offline"}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* ======================================================
            ERRO
        ====================================================== */}

        {armazem.erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            {armazem.erro}
          </div>
        )}

        {/* ======================================================
            MENSAGEM
        ====================================================== */}

        {armazem.mensagem && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
            {armazem.mensagem}
          </div>
        )}

        {/* ======================================================
            CADASTRO DE FINGERPRINT
        ====================================================== */}

        <CadastroFingerprint
          nome={armazem.nomeFingerprint}
          setNome={armazem.setNomeFingerprint}
          id={armazem.idFingerprint}
          setId={armazem.setIdFingerprint}
          mqttOnline={armazem.mqttOnline}
          fingerprintStatus={armazem.fingerprintStatus}
          onRegister={cadastrarPessoa}
        />

        {/* ======================================================
            CADASTRO DE PRODUTO
        ====================================================== */}

        <CadastroProduto
          produto={armazem.produto}
          setProduto={armazem.setProduto}
          mqttOnline={armazem.mqttOnline}
          onRegister={armazem.cadastrarProduto}
        />

        {/* ======================================================
            BALANÇAS
        ====================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ====================================================
              BALANÇA 1
              MANUAL
          ==================================================== */}

          <Balanca1
            produto={armazem.produto}
            peso={armazem.sensor1}
            confirmado={armazem.sensor1Confirmado}
            aguardandoConfirmacao={armazem.aguardandoConfirmacao}
            onConfirm={armazem.confirmarBalanca1}
            onReset={armazem.resetBalanca1}
          />

          {/* ====================================================
              BALANÇA 2
              AUTOMÁTICA
          ==================================================== */}

          <Balanca2
            produto={armazem.produto}
            peso={armazem.sensor2}
          />
        </div>

        {/* ======================================================
            RECONHECIMENTO FINGERPRINT
        ====================================================== */}

   <ReconhecimentoFingerprint
  pending={armazem.fingerprintPending}
  status={armazem.fingerprintStatus}
  fingerprintId={armazem.fingerprintIdAtual}
  pessoa={armazem.pessoaAtual}
  fingerprintLeituraIniciada={armazem.fingerprintLeituraIniciada}
  onRecognize={armazem.iniciarReconhecimentoFingerprint}
/>

        {/* ======================================================
            HISTÓRICO BALANÇA 1
        ====================================================== */}

        <HistoricoBalanca1
          historico={armazem.historicoSensor1}
        />

        {/* ======================================================
            HISTÓRICO BALANÇA 2
        ====================================================== */}

        <HistoricoBalanca2
          historico={armazem.historicoSensor2}
        />

        {/* ======================================================
            HISTÓRICO FINGERPRINT
        ====================================================== */}

        <HistoricoFingerprint
          historico={armazem.historicoFingerprint}
        />

        {/* ======================================================
            NOVA PESAGEM
        ====================================================== */}

        <section className="flex justify-end">
          <button
            type="button"
            onClick={armazem.novaPesagem}
            className="bg-[#001431] hover:bg-[#00204d] text-white font-semibold rounded-xl px-6 py-3 transition"
          >
            Nova Pesagem
          </button>
        </section>
      </div>
    </main>
  );
}

