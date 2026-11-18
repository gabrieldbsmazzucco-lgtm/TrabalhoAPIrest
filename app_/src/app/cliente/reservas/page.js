"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const statusOpcoes = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

function formatarData(data) {
  if (!data) return "-";

  const partes = data.split("T");
  const [ano, mes, dia] = partes[0].split("-");

  return `${dia}/${mes}/${ano}`;
}

function formatarHorario(data) {
  if (!data) return "-";

  return data.split("T")[1]?.slice(0, 5) || "-";
}

function formatarStatus(status) {
  return statusOpcoes[status] || status;
}

export default function MinhasReservasPage() {
  const router = useRouter();

  const [reservas, setReservas] = useState([]);
  const [salas, setSalas] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  function obterConfig() {
    const token = sessionStorage.getItem("token");

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const usuarioSalvo = sessionStorage.getItem("usuario");

    if (!token || !usuarioSalvo) {
      router.push("/");
      return;
    }

    try {
      const usuarioLogado = JSON.parse(usuarioSalvo);

      if (usuarioLogado.role !== "CLIENT") {
        if (usuarioLogado.role === "ADMIN") {
          router.push("/admin");
        } else if (usuarioLogado.role === "RECEPTION") {
          router.push("/recepcao");
        } else {
          router.push("/");
        }

        return;
      }

      carregarDados();
    } catch {
      sessionStorage.clear();
      router.push("/");
    }
  }, [router]);

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    try {
      const [respostaReservas, respostaSalas] = await Promise.all([
        axios.get(`${API_URL}/reservas`, obterConfig()),
        axios.get(`${API_URL}/salas`, obterConfig()),
      ]);

      if (
        !Array.isArray(respostaReservas.data) ||
        !Array.isArray(respostaSalas.data)
      ) {
        throw new Error("O servidor retornou dados em formato inválido.");
      }

      setReservas(respostaReservas.data);
      setSalas(respostaSalas.data);
    } catch (erro) {
      setErro(
        erro.response?.data?.mensagem ||
          erro.response?.data?.message ||
          "Não foi possível carregar suas reservas.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function obterNomeSala(spaceId) {
    const sala = salas.find((item) => item.id === spaceId);

    return sala ? sala.name : "Sala não encontrada";
  }

  async function cancelarReserva(reserva) {
    const confirmar = window.confirm(
      "Deseja realmente cancelar esta solicitação de reserva?",
    );

    if (!confirmar) return;

    setCancelando(reserva.id);
    setErro("");
    setMensagem("");

    try {
      await axios.put(
        `${API_URL}/reservas/${reserva.id}`,
        {
          status: "CANCELLED",
        },
        obterConfig(),
      );

      setMensagem("Reserva cancelada com sucesso.");

      await carregarDados();
    } catch (erro) {
      setErro(
        erro.response?.data?.mensagem ||
          erro.response?.data?.message ||
          "Não foi possível cancelar a reserva.",
      );
    } finally {
      setCancelando("");
    }
  }

  return (
    <main className="crud-container">
      <header className="crud-header">
        <div>
          <h1>Minhas reservas</h1>
          <p>
            Consulte suas solicitações e acompanhe o andamento das reservas.
          </p>
        </div>

        <div className="crud-actions">
          <button
            type="button"
            className="crud-button primary"
            onClick={() => router.push("/cliente/reservas/nova")}
          >
            Nova reserva
          </button>

          <button
            type="button"
            className="crud-button secondary"
            onClick={() => router.push("/cliente")}
          >
            Voltar ao painel
          </button>
        </div>
      </header>

      {mensagem && <div className="crud-success">{mensagem}</div>}

      {erro && <div className="crud-error">{erro}</div>}

      <section className="crud-card">
        <h2>Histórico de reservas</h2>

        {carregando ? (
          <p>Carregando suas reservas...</p>
        ) : reservas.length === 0 ? (
          <div>
            <p>Você ainda não possui reservas.</p>

            <button
              type="button"
              className="crud-button primary"
              onClick={() => router.push("/cliente/reservas/nova")}
            >
              Realizar primeira reserva
            </button>
          </div>
        ) : (
          <div className="crud-table-container">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Sala</th>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Pessoas</th>
                  <th>Status</th>
                  <th>Motivo da rejeição</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {reservas.map((reserva) => (
                  <tr key={reserva.id}>
                    <td>{obterNomeSala(reserva.space_id)}</td>

                    <td>{formatarData(reserva.start_datetime)}</td>

                    <td>
                      {formatarHorario(reserva.start_datetime)} até{" "}
                      {formatarHorario(reserva.end_datetime)}
                    </td>

                    <td>{reserva.number_of_people ?? "-"}</td>

                    <td>{formatarStatus(reserva.status)}</td>

                    <td>{reserva.rejection_reason || "-"}</td>

                    <td>
                      {reserva.status === "PENDING" ? (
                        <button
                          type="button"
                          className="crud-button secondary"
                          onClick={() => cancelarReserva(reserva)}
                          disabled={cancelando === reserva.id}
                        >
                          {cancelando === reserva.id
                            ? "Cancelando..."
                            : "Cancelar"}
                        </button>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
