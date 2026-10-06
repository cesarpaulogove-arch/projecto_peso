"use client";

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
  function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    const fingerprintId =
      Number(id);

    onRegister(
      fingerprintId,
      nome
    );
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#001431]">
            Gestão de Pessoas / Fingerprint
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            O cadastro da fingerprint é feito
            primeiro e funciona independentemente
            das balanças.
          </p>
        </div>

        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
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

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div>
          <label className="block text-sm font-semibold text-[#001431] mb-2">
            Nome da pessoa
          </label>

          <input
            value={nome}
            onChange={(event) =>
              setNome(
                event.target.value
              )
            }
            placeholder="Nome completo"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#10b981]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#001431] mb-2">
            ID da Fingerprint
          </label>

          <input
            type="number"
            min={1}
            max={127}
            value={id}
            onChange={(event) =>
              setId(
                event.target.value
              )
            }
            placeholder="1 - 127"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#10b981]"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={!mqttOnline}
            className="w-full bg-[#10b981] hover:bg-[#0ea371] disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 transition"
          >
            Cadastrar Fingerprint
          </button>
        </div>
      </form>

      <div className="mt-5 rounded-xl bg-gray-50 p-4">
        <span className="font-semibold text-[#001431]">
          Estado da fingerprint:
        </span>

        <span className="ml-2 text-gray-600">
          {fingerprintStatus ||
            "Aguardando operação..."}
        </span>
      </div>
    </section>
  );
}