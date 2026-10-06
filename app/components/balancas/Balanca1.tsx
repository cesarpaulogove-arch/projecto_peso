"use client";

interface Balanca1Props {
  produto: string;
  peso: number;
  confirmado: boolean;
  aguardandoConfirmacao: boolean;
  onConfirm: () => boolean;
  onReset: () => void;
}

export default function Balanca1({
  produto,
  peso,
  confirmado,
  aguardandoConfirmacao,
  onConfirm,
  onReset,
}: Balanca1Props) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#001431]">
            Balança 1
          </h2>

          <p className="text-sm text-gray-500">
            Pesagem com fingerprint,
            acesso e impressão.
          </p>
        </div>

        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
          BALANÇA 1
        </span>
      </div>

      <div className="rounded-xl bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">
          Peso atual
        </p>

        <p className="text-5xl font-bold text-[#001431] mt-2">
          {peso.toFixed(2)}
          <span className="text-xl ml-2">
            kg
          </span>
        </p>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Produto:{" "}
        <strong>
          {produto || "Nenhum produto"}
        </strong>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={onConfirm}
          disabled={
            peso <= 0 ||
            confirmado ||
            aguardandoConfirmacao
          }
          className="flex-1 bg-[#10b981] hover:bg-[#0ea371] disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3"
        >
          {aguardandoConfirmacao
            ? "A confirmar..."
            : confirmado
              ? "Confirmada"
              : "Confirmar Balança 1"}
        </button>

        <button
          onClick={onReset}
          className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
        >
          Limpar
        </button>
      </div>
    </section>
  );
}