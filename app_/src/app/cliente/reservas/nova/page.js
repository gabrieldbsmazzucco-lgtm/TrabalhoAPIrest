"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const diasSemana = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function obterDataLocal() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function converterMinutos(horario) {
  const [horas, minutos] = horario.split(":").map(Number);
  return horas * 60 + minutos;
}

function horarioCurto(horario) {
  return String(horario || "").slice(0, 5);
}

export default function NovaReservaClientePage() {
  const router = useRouter();

  const [salas, setSalas] = useState([]);
  const [disponibilidades, setDisponibilidades] = useState([]);

  const [salaId, setSalaId] = useState("");
  const [dataReserva, setDataReserva] = useState("");
  const [disponibilidadeId, setDisponibilidadeId] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [quantidadePessoas, setQuantidadePessoas] = useState("1");

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

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

      carregarDados(usuarioLogado);
    } catch {
      sessionStorage.clear();
      router.push("/");
    }
  }, [router]);

  async function carregarDados(usuarioLogado) {
    setCarregando(true);
    setErro("");

    try {
      const [respostaSalas, respostaDisponibilidades] = await Promise.all([
        axios.get(`${API_URL}/salas`, obterConfig()),
        axios.get(`${API_URL}/disponibilidades`, obterConfig()),
      ]);

      if (
        !Array.isArray(respostaSalas.data) ||
        !Array.isArray(respostaDisponibilidades.data)
      ) {
        throw new Error("O servidor retornou dados em formato inválido.");
      }

      const salasAtivas = respostaSalas.data.filter(
        (sala) => sala.is_active !== false,
      );

      const disponibilidadesAtivas = respostaDisponibilidades.data.filter(
        (disponibilidade) => {
          if (disponibilidade.is_active === false) {
            return false;
          }

          if (!usuarioLogado.company_id) {
            return disponibilidade.is_external_allowed === true;
          }

          return true;
        },
      );

      setSalas(salasAtivas);
      setDisponibilidades(disponibilidadesAtivas);
    } catch (erro) {
      setErro(
        erro.response?.data?.mensagem ||
          erro.response?.data?.message ||
          erro.message ||
          "Erro ao carregar os dados da reserva.",
      );
    } finally {
      setCarregando(false);
    }
  }

  const salaSelecionada = salas.find((sala) => sala.id === salaId);

  const capacidadeSala = Number(salaSelecionada?.capacity);

  const diaSelecionado = dataReserva
    ? new Date(`${dataReserva}T12:00:00`).getDay()
    : null;

  const disponibilidadesDoDia = disponibilidades.filter(
    (disponibilidade) =>
      disponibilidade.space_id === salaId &&
      Number(disponibilidade.day_of_week) === diaSelecionado,
  );

  const disponibilidadeSelecionada = disponibilidades.find(
    (disponibilidade) => disponibilidade.id === disponibilidadeId,
  );

  function selecionarSala(valor) {
    setSalaId(valor);
    setDisponibilidadeId("");
    setHoraInicio("");
    setHoraFim("");
    setQuantidadePessoas("1");
    setErro("");
    setMensagem("");
  }

  function selecionarData(valor) {
    setDataReserva(valor);
    setDisponibilidadeId("");
    setHoraInicio("");
    setHoraFim("");
    setErro("");
    setMensagem("");
  }

  function selecionarDisponibilidade(valor) {
    setDisponibilidadeId(valor);

    const disponibilidade = disponibilidades.find((item) => item.id === valor);

    if (disponibilidade) {
      setHoraInicio(horarioCurto(disponibilidade.start_time));
      setHoraFim(horarioCurto(disponibilidade.end_time));
    }

    setErro("");
    setMensagem("");
  }

  function alterarQuantidadePessoas(valor) {
    if (valor === "") {
      setQuantidadePessoas("");
      return;
    }

    const quantidade = Number(valor);

    if (!Number.isInteger(quantidade) || quantidade < 1) {
      return;
    }

    if (
      Number.isInteger(capacidadeSala) &&
      capacidadeSala > 0 &&
      quantidade <= capacidadeSala
    ) {
      setQuantidadePessoas(valor);
    }
  }

  async function realizarReserva(evento) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    if (!salaId || !dataReserva || !disponibilidadeId) {
      setErro("Preencha a sala, a data e a disponibilidade.");
      return;
    }

    if (
      !Number.isInteger(Number(quantidadePessoas)) ||
      Number(quantidadePessoas) < 1
    ) {
      setErro("Informe uma quantidade válida de pessoas.");
      return;
    }

    if (
      !Number.isInteger(capacidadeSala) ||
      capacidadeSala < 1 ||
      Number(quantidadePessoas) > capacidadeSala
    ) {
      setErro(
        "A quantidade de pessoas não pode ultrapassar a capacidade da sala.",
      );
      return;
    }

    if (!horaInicio || !horaFim) {
      setErro("Informe o horário inicial e final.");
      return;
    }

    const inicioMinutos = converterMinutos(horaInicio);
    const fimMinutos = converterMinutos(horaFim);

    if (fimMinutos <= inicioMinutos) {
      setErro("O horário final deve ser posterior ao inicial.");
      return;
    }

    if (
      !disponibilidadeSelecionada ||
      inicioMinutos <
        converterMinutos(horarioCurto(disponibilidadeSelecionada.start_time)) ||
      fimMinutos >
        converterMinutos(horarioCurto(disponibilidadeSelecionada.end_time))
    ) {
      setErro(
        "O horário escolhido precisa estar dentro da disponibilidade da sala.",
      );
      return;
    }

    const inicio = new Date(`${dataReserva}T${horaInicio}:00`);
    const fim = new Date(`${dataReserva}T${horaFim}:00`);

    if (inicio <= new Date()) {
      setErro("A reserva precisa começar em uma data e horário futuros.");
      return;
    }

    if (fim <= inicio) {
      setErro("O horário final deve ser posterior ao inicial.");
      return;
    }

    setEnviando(true);

    try {
      const dadosReserva = {
        space_id: salaId,
        number_of_people: Number(quantidadePessoas),
        start_datetime: `${dataReserva}T${horaInicio}:00`,
        end_datetime: `${dataReserva}T${horaFim}:00`,
      };

      await axios.post(`${API_URL}/reservas`, dadosReserva, obterConfig());

      setMensagem(
        "Solicitação de reserva enviada com sucesso! Aguarde a aprovação.",
      );

      setSalaId("");
      setDataReserva("");
      setDisponibilidadeId("");
      setHoraInicio("");
      setHoraFim("");
      setQuantidadePessoas("1");
    } catch (erro) {
      setErro(
        erro.response?.data?.mensagem ||
          erro.response?.data?.message ||
          "Não foi possível realizar a solicitação de reserva.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="crud-container">
      <header className="crud-header">
        <div>
          <h1>Realizar reserva</h1>
          <p>
            Escolha uma sala, uma data e um horário para solicitar sua reserva.
          </p>
        </div>

        <button
          type="button"
          className="crud-button secondary"
          onClick={() => router.push("/cliente")}
        >
          Voltar ao painel
        </button>
      </header>

      {mensagem && <div className="crud-success">{mensagem}</div>}

      {erro && <div className="crud-error">{erro}</div>}

      <section className="crud-card">
        <h2>Dados da reserva</h2>

        {carregando ? (
          <p>Carregando salas e disponibilidades...</p>
        ) : (
          <form onSubmit={realizarReserva}>
            <div className="crud-form-grid">
              <div className="crud-field">
                <label htmlFor="sala">Sala</label>

                <select
                  id="sala"
                  value={salaId}
                  onChange={(evento) => selecionarSala(evento.target.value)}
                  required
                >
                  <option value="">Selecione uma sala</option>

                  {salas.map((sala) => (
                    <option key={sala.id} value={sala.id}>
                      {sala.name} - Capacidade: {sala.capacity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="crud-field">
                <label htmlFor="quantidadePessoas">Quantidade de pessoas</label>

                <input
                  id="quantidadePessoas"
                  type="number"
                  min="1"
                  max={salaSelecionada ? capacidadeSala : undefined}
                  step="1"
                  value={quantidadePessoas}
                  onChange={(evento) =>
                    alterarQuantidadePessoas(evento.target.value)
                  }
                  disabled={!salaSelecionada}
                  required
                />

                {salaSelecionada && (
                  <small>Capacidade máxima: {capacidadeSala} pessoas.</small>
                )}
              </div>

              <div className="crud-field">
                <label htmlFor="dataReserva">Data da reserva</label>

                <input
                  id="dataReserva"
                  type="date"
                  min={obterDataLocal()}
                  value={dataReserva}
                  onChange={(evento) => selecionarData(evento.target.value)}
                  disabled={!salaId}
                  required
                />
              </div>

              <div className="crud-field">
                <label htmlFor="disponibilidade">Disponibilidade</label>

                <select
                  id="disponibilidade"
                  value={disponibilidadeId}
                  onChange={(evento) =>
                    selecionarDisponibilidade(evento.target.value)
                  }
                  disabled={!salaId || !dataReserva}
                  required
                >
                  <option value="">Selecione um horário disponível</option>

                  {disponibilidadesDoDia.map((item) => (
                    <option key={item.id} value={item.id}>
                      {horarioCurto(item.start_time)} até{" "}
                      {horarioCurto(item.end_time)}
                    </option>
                  ))}
                </select>

                {salaId &&
                  dataReserva &&
                  disponibilidadesDoDia.length === 0 && (
                    <small>
                      Não existem disponibilidades para essa sala nesse dia.
                    </small>
                  )}
              </div>

              <div className="crud-field">
                <label htmlFor="horaInicio">Horário inicial</label>

                <input
                  id="horaInicio"
                  type="time"
                  value={horaInicio}
                  min={
                    disponibilidadeSelecionada
                      ? horarioCurto(disponibilidadeSelecionada.start_time)
                      : undefined
                  }
                  max={
                    disponibilidadeSelecionada
                      ? horarioCurto(disponibilidadeSelecionada.end_time)
                      : undefined
                  }
                  onChange={(evento) => setHoraInicio(evento.target.value)}
                  disabled={!disponibilidadeId}
                  required
                />
              </div>

              <div className="crud-field">
                <label htmlFor="horaFim">Horário final</label>

                <input
                  id="horaFim"
                  type="time"
                  value={horaFim}
                  min={horaInicio || undefined}
                  max={
                    disponibilidadeSelecionada
                      ? horarioCurto(disponibilidadeSelecionada.end_time)
                      : undefined
                  }
                  onChange={(evento) => setHoraFim(evento.target.value)}
                  disabled={!disponibilidadeId}
                  required
                />
              </div>
            </div>

            {salaSelecionada && dataReserva && (
              <div className="crud-card">
                <h3>Resumo da solicitação</h3>

                <p>
                  <strong>Sala:</strong> {salaSelecionada.name}
                </p>

                <p>
                  <strong>Quantidade de pessoas:</strong>{" "}
                  {quantidadePessoas || "Não informada"} de {capacidadeSala}
                </p>

                <p>
                  <strong>Dia:</strong> {diasSemana[diaSelecionado]}
                </p>

                <p>
                  <strong>Data:</strong>{" "}
                  {new Date(`${dataReserva}T12:00:00`).toLocaleDateString(
                    "pt-BR",
                  )}
                </p>

                {horaInicio && horaFim && (
                  <p>
                    <strong>Horário:</strong> {horaInicio} até {horaFim}
                  </p>
                )}

                <p>
                  <strong>Status inicial:</strong> Pendente de aprovação
                </p>
              </div>
            )}

            <div className="crud-actions">
              <button
                type="submit"
                className="crud-button primary"
                disabled={enviando || carregando}
              >
                {enviando ? "Enviando solicitação..." : "Solicitar reserva"}
              </button>

              <button
                type="button"
                className="crud-button secondary"
                onClick={() => {
                  setSalaId("");
                  setDataReserva("");
                  setDisponibilidadeId("");
                  setHoraInicio("");
                  setHoraFim("");
                  setQuantidadePessoas("1");
                  setErro("");
                  setMensagem("");
                }}
                disabled={enviando}
              >
                Limpar formulário
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
