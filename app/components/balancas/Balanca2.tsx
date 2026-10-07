"use client";

interface Balanca2Props {
  produto: string;
  peso: number;
}

export default function Balanca2({
  produto,
  peso,
}: Balanca2Props) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="flex items-center justify-between mb-5">

        <div>
          <h2 className="text-xl font-bold text-[#001431]">
            Balança 2
          </h2>

          <p className="text-sm text-gray-500">
            Pesagem e histórico automáticos.
          </p>
        </div>

        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
          BALANÇA 2
        </span>

      </div>

      {/* =====================================================
          PESO ATUAL
      ====================================================== */}

      <div className="rounded-xl bg-gray-50 p-6 text-center">

        <p className="text-sm text-gray-500">
          Peso atual
        </p>

        <p className="text-5xl font-bold text-[#001431] mt-2">
          {Number.isFinite(peso) ? peso.toFixed(2) : "0.00"}

          <span className="text-xl ml-2">
            kg
          </span>
        </p>

      </div>

      {/* =====================================================
          PRODUTO
      ====================================================== */}

      <div className="mt-4 text-sm text-gray-600">

        Produto:{" "}

        <strong>
          {produto || "Nenhum produto"}
        </strong>

      </div>

      {/* =====================================================
          ESTADO AUTOMÁTICO
      ====================================================== */}

      <div className="mt-5 rounded-xl bg-purple-50 border border-purple-100 px-4 py-3">

        <div className="flex items-center gap-2">

          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />

          <span className="text-sm font-semibold text-purple-700">
            Atualização automática
          </span>

        </div>

        <p className="text-sm text-purple-600 mt-2">
          O histórico da Balança 2 é atualizado
          automaticamente quando a diferença entre
          o peso anterior e o peso atual é superior
          a 1 kg.
        </p>

      </div>

    </section>
  );
}