"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const statusOpcoes = [
  { value: "PENDING", label: "Pendente" },
  { value: "APPROVED", label: "Aprovada" },
  { value: "REJECTED", label: "Rejeitada" },
  { value: "CANCELLED", label: "Cancelada" },
];

const formularioInicial = {
  space_id: "",
  user_id: "",
  start_datetime: "",
  end_datetime: "",
};

function nomeStatus(status) {
  return statusOpcoes.find((item) => item.value === status)?.label || status;
}

function classeStatus(status) {
  const classes = {
    PENDING: {
      background: "#fff7db",
      color: "#946200",
    },
    APPROVED: {
      background: "#dcfce7",
      color: "#166534",
    },
    REJECTED: {
      background: "#fee2e2",
      color: "#991b1b",
    },
    CANCELLED: {
      background: "#e5e7eb",
      color: "#374151",
    },
  };

  return (
    classes[status] || {
      background: "#e5e7eb",
      color: "#374151",
    }
  );
}

function formatarData(data) {
  if (!data) return "-";

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) return data;

  return dataObj.toLocaleString("pt-BR");
}

function dataParaInput(data) {
  if (!data) return "";
  return String(data).slice(0, 16);
}

function minutosParaHora(minutos) {
  const horas = Math.floor(minutos / 60);
  const restante = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(restante).padStart(2, "0")}`;
}

function horaParaMinutos(hora) {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

function reservasSeSobrepoem(reservaA, reservaB) {
  if (String(reservaA.space_id) !== String(reservaB.space_id)) {
    return false;
  }

  const inicioA = new Date(reservaA.start_datetime);
  const fimA = new Date(reservaA.end_datetime);
  const inicioB = new Date(reservaB.start_datetime);
  const fimB = new Date(reservaB.end_datetime);

  if (
    Number.isNaN(inicioA.getTime()) ||
    Number.isNaN(fimA.getTime()) ||
    Number.isNaN(inicioB.getTime()) ||
    Number.isNaN(fimB.getTime())
  ) {
    return false;
  }

  return inicioA < fimB && fimA > inicioB;
}

export default function ReservasPage() {
  const router = useRouter();

  const [reservas, setReservas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [formulario, setFormulario] = useState(formularioInicial);

  const [editando, setEditando] = useState(false);
  const [reservaSelecionada, setReservaSelecionada] = useState(null);

  const [novoStatus, setNovoStatus] = useState("PENDING");
  const [motivoRejeicao, setMotivoRejeicao] = useState("");

  const [dataEscolhida, setDataEscolhida] = useState("");
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);

  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroSala, setFiltroSala] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroId, setFiltroId] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

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
      const usuario = JSON.parse(usuarioSalvo);

      if (usuario.role !== "ADMIN") {
        if (usuario.role === "RECEPTION") {
          router.push("/recepcao");
        } else if (usuario.role === "CLIENT") {
          router.push("/cliente");
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

  function obterMensagemErro(error, mensagemPadrao) {
    return (
      error.response?.data?.mensagem ||
      error.response?.data?.message ||
      mensagemPadrao
    );
  }

  async function carregarDados() {
    setCarregando(true);
    setErro("");

    try {
      const [respostaReservas, respostaSalas, respostaUsuarios] =
        await Promise.all([
          axios.get(`${API_URL}/reservas`, obterConfig()),
          axios.get(`${API_URL}/salas`, obterConfig()),
          axios.get(`${API_URL}/usuarios`, obterConfig()),
        ]);

      setReservas(
        Array.isArray(respostaReservas.data) ? respostaReservas.data : [],
      );

      setSalas(Array.isArray(respostaSalas.data) ? respostaSalas.data : []);

      setUsuarios(
        Array.isArray(respostaUsuarios.data) ? respostaUsuarios.data : [],
      );
    } catch (error) {
      setErro(obterMensagemErro(error, "Erro ao carregar os dados."));
    } finally {
      setCarregando(false);
    }
  }

  async function carregarReservas() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await axios.get(`${API_URL}/reservas`, obterConfig());

      const lista = Array.isArray(resposta.data) ? resposta.data : [];

      setReservas(lista);

      return lista;
    } catch (error) {
      setErro(obterMensagemErro(error, "Erro ao carregar reservas."));
      return null;
    } finally {
      setCarregando(false);
    }
  }

  function nomeSala(spaceId) {
    const sala = salas.find((item) => String(item.id) === String(spaceId));

    return sala ? sala.name : spaceId || "-";
  }

  function nomeUsuario(userId) {
    const usuario = usuarios.find((item) => String(item.id) === String(userId));

    if (!usuario) return userId || "-";

    return `${usuario.name} (${usuario.email})`;
  }

  function atualizarCampo(campo, valor) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function limparHorarios() {
    setHorariosDisponiveis([]);
    setHorarioSelecionado("");

    setFormulario((atual) => ({
      ...atual,
      start_datetime: "",
      end_datetime: "",
    }));
  }

  function limparFormulario() {
    setFormulario(formularioInicial);
    setEditando(false);
    setReservaSelecionada(null);
    setNovoStatus("PENDING");
    setMotivoRejeicao("");
    setDataEscolhida("");
    setHorariosDisponiveis([]);
    setHorarioSelecionado("");
    setErro("");
    setMensagem("");
  }

  async function buscarHorariosDisponiveis() {
    setErro("");
    setMensagem("");
    setHorariosDisponiveis([]);
    setHorarioSelecionado("");

    setFormulario((atual) => ({
      ...atual,
      start_datetime: "",
      end_datetime: "",
    }));

    if (!formulario.space_id) {
      setErro("Selecione uma sala.");
      return;
    }

    if (!formulario.user_id) {
      setErro("Selecione o usuário da reserva.");
      return;
    }

    if (!dataEscolhida) {
      setErro("Selecione uma data.");
      return;
    }

    const dataSelecionada = new Date(`${dataEscolhida}T12:00:00`);

    if (Number.isNaN(dataSelecionada.getTime())) {
      setErro("Data inválida.");
      return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataSelecionada <= hoje) {
      setErro("Escolha uma data futura.");
      return;
    }

    setBuscandoHorarios(true);

    try {
      const usuario = usuarios.find(
        (item) => String(item.id) === String(formulario.user_id),
      );

      if (!usuario) {
        setErro("Usuário não encontrado.");
        return;
      }

      const diaSemana = dataSelecionada.getDay();

      const respostaDisponibilidades = await axios.get(
        `${API_URL}/disponibilidades`,
        {
          ...obterConfig(),
          params: {
            space_id: formulario.space_id,
            day_of_week: diaSemana,
          },
        },
      );

      const disponibilidades = Array.isArray(respostaDisponibilidades.data)
        ? respostaDisponibilidades.data
        : [];

      if (disponibilidades.length === 0) {
        setMensagem(
          "Não existem horários cadastrados para esta sala neste dia.",
        );
        return;
      }

      const respostaReservas = await axios.get(`${API_URL}/reservas`, {
        ...obterConfig(),
        params: {
          space_id: formulario.space_id,
          status: "APPROVED",
        },
      });

      const reservasAprovadas = Array.isArray(respostaReservas.data)
        ? respostaReservas.data
        : [];

      const usuarioExterno = !usuario.company_id;
      const horarios = [];

      disponibilidades.forEach((disponibilidade) => {
        if (usuarioExterno && !disponibilidade.is_external_allowed) {
          return;
        }

        const inicioDisponibilidade = horaParaMinutos(
          disponibilidade.start_time,
        );

        const fimDisponibilidade = horaParaMinutos(disponibilidade.end_time);

        for (
          let inicio = inicioDisponibilidade;
          inicio + 60 <= fimDisponibilidade;
          inicio += 60
        ) {
          const fim = inicio + 60;

          const horaInicio = minutosParaHora(inicio);
          const horaFim = minutosParaHora(fim);

          const inicioCompleto = new Date(`${dataEscolhida}T${horaInicio}:00`);

          const fimCompleto = new Date(`${dataEscolhida}T${horaFim}:00`);

          const ocupado = reservasAprovadas.some((reserva) => {
            const inicioReserva = new Date(reserva.start_datetime);
            const fimReserva = new Date(reserva.end_datetime);

            return inicioCompleto < fimReserva && fimCompleto > inicioReserva;
          });

          if (!ocupado) {
            horarios.push({
              inicio: horaInicio,
              fim: horaFim,
            });
          }
        }
      });

      const horariosUnicos = Array.from(
        new Map(
          horarios.map((horario) => [
            `${horario.inicio}-${horario.fim}`,
            horario,
          ]),
        ).values(),
      ).sort((a, b) => a.inicio.localeCompare(b.inicio));

      setHorariosDisponiveis(horariosUnicos);

      if (horariosUnicos.length === 0) {
        setMensagem(
          "Não existem blocos de uma hora livres para esta sala e data.",
        );
      } else {
        setMensagem(
          `${horariosUnicos.length} horário(s) disponível(is) encontrado(s).`,
        );
      }
    } catch (error) {
      setErro(
        obterMensagemErro(error, "Erro ao consultar os horários disponíveis."),
      );
    } finally {
      setBuscandoHorarios(false);
    }
  }

  function selecionarHorario(horario) {
    const inicio = `${dataEscolhida}T${horario.inicio}`;
    const fim = `${dataEscolhida}T${horario.fim}`;

    setHorarioSelecionado(`${horario.inicio}-${horario.fim}`);

    setFormulario((atual) => ({
      ...atual,
      start_datetime: inicio,
      end_datetime: fim,
    }));

    setErro("");
  }

  async function buscarReservas() {
    setCarregando(true);
    setErro("");
    setMensagem("");
    setReservaSelecionada(null);

    try {
      const params = {};

      if (filtroStatus) params.status = filtroStatus;
      if (filtroSala) params.space_id = filtroSala;
      if (filtroUsuario) params.user_id = filtroUsuario;

      const resposta = await axios.get(`${API_URL}/reservas`, {
        ...obterConfig(),
        params,
      });

      const lista = Array.isArray(resposta.data) ? resposta.data : [];

      setReservas(lista);

      if (lista.length === 0) {
        setMensagem("Nenhuma reserva encontrada.");
      }
    } catch (error) {
      setErro(obterMensagemErro(error, "Erro ao pesquisar reservas."));
    } finally {
      setCarregando(false);
    }
  }

  async function buscarPorId() {
    if (!filtroId.trim()) {
      setErro("Informe o ID da reserva.");
      return;
    }

    setCarregando(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await axios.get(
        `${API_URL}/reservas/${encodeURIComponent(filtroId.trim())}`,
        obterConfig(),
      );

      setReservas([resposta.data]);
      setReservaSelecionada(resposta.data);
      setEditando(false);
    } catch (error) {
      setReservas([]);
      setReservaSelecionada(null);

      setErro(obterMensagemErro(error, "Reserva não encontrada."));
    } finally {
      setCarregando(false);
    }
  }

  function visualizarReserva(reserva) {
    setReservaSelecionada(reserva);
    setEditando(false);
    setErro("");
    setMensagem("");
  }

  function prepararEdicao(reserva) {
    setFormulario({
      space_id: reserva.space_id,
      user_id: reserva.user_id,
      start_datetime: dataParaInput(reserva.start_datetime),
      end_datetime: dataParaInput(reserva.end_datetime),
    });

    setNovoStatus(reserva.status);
    setMotivoRejeicao(reserva.rejection_reason || "");

    setReservaSelecionada(reserva);
    setEditando(true);
    setDataEscolhida("");
    setHorariosDisponiveis([]);
    setHorarioSelecionado("");
    setErro("");
    setMensagem("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarReserva(evento) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    if (
      !formulario.space_id ||
      !formulario.user_id ||
      !formulario.start_datetime ||
      !formulario.end_datetime
    ) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    const inicio = new Date(formulario.start_datetime);
    const fim = new Date(formulario.end_datetime);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      setErro("Informe datas válidas.");
      return;
    }

    if (fim <= inicio) {
      setErro("A data final deve ser posterior à data inicial.");
      return;
    }

    if (
      inicio.getFullYear() !== fim.getFullYear() ||
      inicio.getMonth() !== fim.getMonth() ||
      inicio.getDate() !== fim.getDate()
    ) {
      setErro("A reserva deve começar e terminar no mesmo dia.");
      return;
    }

    const datasForamAlteradas =
      editando &&
      (formulario.start_datetime !==
        dataParaInput(reservaSelecionada.start_datetime) ||
        formulario.end_datetime !==
          dataParaInput(reservaSelecionada.end_datetime));

    if ((!editando || datasForamAlteradas) && inicio <= new Date()) {
      setErro("A reserva deve começar em uma data futura.");
      return;
    }

    if (editando && novoStatus === "REJECTED" && !motivoRejeicao.trim()) {
      setErro("Informe o motivo da rejeição.");
      return;
    }

    setCarregando(true);

    try {
      if (editando) {
        // Guarda a situação das reservas antes da atualização.
        const respostaAntes = await axios.get(
          `${API_URL}/reservas`,
          obterConfig(),
        );

        const reservasAntes = Array.isArray(respostaAntes.data)
          ? respostaAntes.data
          : [];

        const dados = {
          start_datetime: formulario.start_datetime,
          end_datetime: formulario.end_datetime,
          status: novoStatus,
          rejection_reason:
            novoStatus === "REJECTED" ? motivoRejeicao.trim() : null,
        };

        const resposta = await axios.put(
          `${API_URL}/reservas/${reservaSelecionada.id}`,
          dados,
          obterConfig(),
        );

        // Busca novamente para obter os status atualizados pelo backend.
        const respostaDepois = await axios.get(
          `${API_URL}/reservas`,
          obterConfig(),
        );

        const reservasDepois = Array.isArray(respostaDepois.data)
          ? respostaDepois.data
          : [];

        setReservas(reservasDepois);

        let quantidadeRejeitada = 0;

        if (novoStatus === "APPROVED") {
          const reservasPendentesAntes = reservasAntes.filter(
            (reserva) =>
              reserva.id !== reservaSelecionada.id &&
              reserva.status === "PENDING" &&
              reservasSeSobrepoem(reserva, resposta.data),
          );

          quantidadeRejeitada = reservasPendentesAntes.filter(
            (reservaAntes) => {
              const reservaDepois = reservasDepois.find(
                (item) => item.id === reservaAntes.id,
              );

              return reservaDepois?.status === "REJECTED";
            },
          ).length;
        }

        setReservaSelecionada(resposta.data);

        if (novoStatus === "APPROVED" && quantidadeRejeitada > 0) {
          setMensagem(
            `Reserva aprovada com sucesso! ${quantidadeRejeitada} reserva(s) conflitante(s) foi(foram) rejeitada(s) automaticamente.`,
          );
        } else if (novoStatus === "APPROVED") {
          setMensagem(
            "Reserva aprovada com sucesso! Nenhuma outra reserva pendente foi rejeitada automaticamente.",
          );
        } else {
          setMensagem("Reserva atualizada com sucesso!");
        }
      } else {
        const dados = {
          space_id: formulario.space_id,
          user_id: formulario.user_id,
          start_datetime: formulario.start_datetime,
          end_datetime: formulario.end_datetime,
        };

        await axios.post(`${API_URL}/reservas`, dados, obterConfig());

        setMensagem("Reserva cadastrada com sucesso!");

        await carregarReservas();
      }

      setFormulario(formularioInicial);
      setEditando(false);
      setNovoStatus("PENDING");
      setMotivoRejeicao("");
      setDataEscolhida("");
      setHorariosDisponiveis([]);
      setHorarioSelecionado("");
    } catch (error) {
      setErro(obterMensagemErro(error, "Erro ao salvar reserva."));
    } finally {
      setCarregando(false);
    }
  }

  async function excluirReserva(reserva) {
    const confirmar = window.confirm("Deseja realmente excluir esta reserva?");

    if (!confirmar) return;

    setErro("");
    setMensagem("");
    setCarregando(true);

    try {
      await axios.delete(`${API_URL}/reservas/${reserva.id}`, obterConfig());

      setMensagem("Reserva excluída com sucesso!");
      setReservaSelecionada(null);

      const resposta = await axios.get(`${API_URL}/reservas`, obterConfig());

      setReservas(Array.isArray(resposta.data) ? resposta.data : []);
    } catch (error) {
      setErro(obterMensagemErro(error, "Erro ao excluir reserva."));
    } finally {
      setCarregando(false);
    }
  }

  function limparFiltros() {
    setFiltroStatus("");
    setFiltroSala("");
    setFiltroUsuario("");
    setFiltroId("");
    setReservaSelecionada(null);

    carregarReservas();
  }

  const dataMinima = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 10);

  return (
    <main className="crud-container">
      <header className="crud-header">
        <div>
          <h1>Gerenciamento de Reservas</h1>
          <p>Gerencie solicitações e reservas das salas.</p>
        </div>

        <button
          className="crud-button secondary"
          onClick={() => router.push("/admin")}
        >
          Voltar ao painel
        </button>
      </header>

      {mensagem && (
        <div className="crud-success" style={{ whiteSpace: "pre-line" }}>
          {mensagem}
        </div>
      )}

      {erro && (
        <div className="crud-error" style={{ whiteSpace: "pre-line" }}>
          {erro}
        </div>
      )}

      <section className="crud-card">
        <h2>{editando ? "Editar reserva" : "Cadastrar reserva"}</h2>

        <form onSubmit={salvarReserva}>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label>Sala</label>

              <select
                value={formulario.space_id}
                onChange={(evento) => {
                  atualizarCampo("space_id", evento.target.value);
                  limparHorarios();
                }}
                required
                disabled={editando}
              >
                <option value="">Selecione uma sala</option>

                {salas.map((sala) => (
                  <option key={sala.id} value={sala.id}>
                    {sala.name}
                    {sala.is_active ? "" : " (Inativa)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="crud-field">
              <label>Usuário</label>

              <select
                value={formulario.user_id}
                onChange={(evento) => {
                  atualizarCampo("user_id", evento.target.value);
                  limparHorarios();
                }}
                required
                disabled={editando}
              >
                <option value="">Selecione um usuário</option>

                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.name} - {usuario.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!editando && (
            <div style={{ marginTop: "22px" }}>
              <div className="crud-field">
                <label>Data da reserva</label>

                <input
                  type="date"
                  value={dataEscolhida}
                  min={dataMinima}
                  onChange={(evento) => {
                    setDataEscolhida(evento.target.value);
                    limparHorarios();
                    setMensagem("");
                    setErro("");
                  }}
                  required
                />
              </div>

              <div className="crud-actions">
                <button
                  type="button"
                  className="crud-button primary"
                  onClick={buscarHorariosDisponiveis}
                  disabled={buscandoHorarios}
                >
                  {buscandoHorarios
                    ? "Consultando horários..."
                    : "Ver horários disponíveis"}
                </button>
              </div>

              {horariosDisponiveis.length > 0 && (
                <div style={{ marginTop: "25px" }}>
                  <h3>Horários disponíveis</h3>

                  <p style={{ color: "#687386", marginTop: "8px" }}>
                    Selecione um bloco de uma hora para a reserva.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(130px, 1fr))",
                      gap: "12px",
                      marginTop: "18px",
                    }}
                  >
                    {horariosDisponiveis.map((horario) => {
                      const identificador = `${horario.inicio}-${horario.fim}`;

                      const selecionado = horarioSelecionado === identificador;

                      return (
                        <button
                          key={identificador}
                          type="button"
                          onClick={() => selecionarHorario(horario)}
                          style={{
                            padding: "15px 10px",
                            borderRadius: "8px",
                            border: selecionado
                              ? "2px solid #2563eb"
                              : "1px solid #dce1e8",
                            background: selecionado ? "#e0ecff" : "#ffffff",
                            color: selecionado ? "#1d4ed8" : "#202938",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          {horario.inicio} – {horario.fim}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {horarioSelecionado && (
                <div className="crud-success" style={{ marginTop: "20px" }}>
                  Horário selecionado:{" "}
                  {horarioSelecionado.replace("-", " até ")}
                </div>
              )}
            </div>
          )}

          {editando && (
            <div className="crud-form-grid" style={{ marginTop: "22px" }}>
              <div className="crud-field">
                <label>Data e horário inicial</label>

                <input
                  type="datetime-local"
                  value={formulario.start_datetime}
                  onChange={(evento) =>
                    atualizarCampo("start_datetime", evento.target.value)
                  }
                  required
                />
              </div>

              <div className="crud-field">
                <label>Data e horário final</label>

                <input
                  type="datetime-local"
                  value={formulario.end_datetime}
                  onChange={(evento) =>
                    atualizarCampo("end_datetime", evento.target.value)
                  }
                  required
                />
              </div>
            </div>
          )}

          {editando && (
            <div style={{ marginTop: "22px" }}>
              <div className="crud-field">
                <label>Status da reserva</label>

                <select
                  value={novoStatus}
                  onChange={(evento) => {
                    setNovoStatus(evento.target.value);

                    if (evento.target.value !== "REJECTED") {
                      setMotivoRejeicao("");
                    }
                  }}
                >
                  {statusOpcoes.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {novoStatus === "REJECTED" && (
                <div className="crud-field" style={{ marginTop: "18px" }}>
                  <label>Motivo da rejeição</label>

                  <textarea
                    value={motivoRejeicao}
                    onChange={(evento) =>
                      setMotivoRejeicao(evento.target.value)
                    }
                    placeholder="Informe o motivo da rejeição"
                    rows={3}
                    required
                    style={{
                      padding: "12px",
                      border: "1px solid #dce1e8",
                      borderRadius: "7px",
                      fontSize: "14px",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="crud-actions">
            <button
              type="submit"
              className="crud-button primary"
              disabled={carregando || (!editando && !horarioSelecionado)}
            >
              {carregando
                ? "Salvando..."
                : editando
                  ? "Salvar alterações"
                  : "Cadastrar reserva"}
            </button>

            {editando && (
              <button
                type="button"
                className="crud-button secondary"
                onClick={limparFormulario}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="crud-card">
        <h2>Pesquisar reservas</h2>

        <div className="crud-form-grid">
          <div className="crud-field">
            <label>Status</label>

            <select
              value={filtroStatus}
              onChange={(evento) => setFiltroStatus(evento.target.value)}
            >
              <option value="">Todos os status</option>

              {statusOpcoes.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="crud-field">
            <label>Sala</label>

            <select
              value={filtroSala}
              onChange={(evento) => setFiltroSala(evento.target.value)}
            >
              <option value="">Todas as salas</option>

              {salas.map((sala) => (
                <option key={sala.id} value={sala.id}>
                  {sala.name}
                </option>
              ))}
            </select>
          </div>

          <div className="crud-field">
            <label>Usuário</label>

            <select
              value={filtroUsuario}
              onChange={(evento) => setFiltroUsuario(evento.target.value)}
            >
              <option value="">Todos os usuários</option>

              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="crud-actions">
          <button
            className="crud-button primary"
            onClick={buscarReservas}
            disabled={carregando}
          >
            Pesquisar
          </button>

          <button
            className="crud-button secondary"
            onClick={limparFiltros}
            disabled={carregando}
          >
            Limpar filtros
          </button>
        </div>

        <div className="crud-search">
          <div className="crud-field">
            <label>Buscar por ID</label>

            <input
              value={filtroId}
              onChange={(evento) => setFiltroId(evento.target.value)}
              placeholder="Cole o ID da reserva"
            />
          </div>

          <button
            className="crud-button primary"
            onClick={buscarPorId}
            disabled={carregando}
          >
            Buscar ID
          </button>
        </div>
      </section>

      <section className="crud-card">
        <div className="crud-list-header">
          <div>
            <h2>Reservas cadastradas</h2>
            <p>Total encontrado: {reservas.length}</p>
          </div>

          <button
            className="crud-button secondary"
            onClick={carregarReservas}
            disabled={carregando}
          >
            Atualizar lista
          </button>
        </div>

        {carregando && <p>Carregando...</p>}

        {!carregando && reservas.length === 0 && (
          <p>Nenhuma reserva cadastrada.</p>
        )}

        {!carregando && reservas.length > 0 && (
          <div className="crud-table-wrapper" style={{ overflowX: "auto" }}>
            <table className="crud-table" style={{ minWidth: "1050px" }}>
              <thead>
                <tr>
                  <th>Sala</th>
                  <th>Usuário</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Status</th>
                  <th>Motivo da rejeição</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {reservas.map((reserva) => {
                  const estiloStatus = classeStatus(reserva.status);

                  return (
                    <tr key={reserva.id}>
                      <td>{nomeSala(reserva.space_id)}</td>

                      <td>{nomeUsuario(reserva.user_id)}</td>

                      <td>{formatarData(reserva.start_datetime)}</td>

                      <td>{formatarData(reserva.end_datetime)}</td>

                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            whiteSpace: "nowrap",
                            background: estiloStatus.background,
                            color: estiloStatus.color,
                          }}
                        >
                          {nomeStatus(reserva.status)}
                        </span>
                      </td>

                      <td>
                        {reserva.status === "REJECTED"
                          ? reserva.rejection_reason || "Não informado"
                          : "-"}
                      </td>

                      <td>
                        <div
                          className="crud-row-actions"
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "8px",
                            minWidth: "210px",
                          }}
                        >
                          <button
                            className="crud-button secondary"
                            onClick={() => visualizarReserva(reserva)}
                          >
                            Ver
                          </button>

                          <button
                            className="crud-button edit"
                            onClick={() => prepararEdicao(reserva)}
                          >
                            Editar
                          </button>

                          <button
                            className="crud-button delete"
                            onClick={() => excluirReserva(reserva)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {reservaSelecionada && !editando && (
        <section className="crud-card">
          <h2>Detalhes da reserva</h2>

          <p>
            <strong>ID:</strong> {reservaSelecionada.id}
          </p>

          <p>
            <strong>Sala:</strong> {nomeSala(reservaSelecionada.space_id)}
          </p>

          <p>
            <strong>ID da sala:</strong> {reservaSelecionada.space_id}
          </p>

          <p>
            <strong>Usuário:</strong> {nomeUsuario(reservaSelecionada.user_id)}
          </p>

          <p>
            <strong>ID do usuário:</strong> {reservaSelecionada.user_id}
          </p>

          <p>
            <strong>Início:</strong>{" "}
            {formatarData(reservaSelecionada.start_datetime)}
          </p>

          <p>
            <strong>Fim:</strong>{" "}
            {formatarData(reservaSelecionada.end_datetime)}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            <span
              style={{
                display: "inline-block",
                padding: "5px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "700",
                ...classeStatus(reservaSelecionada.status),
              }}
            >
              {nomeStatus(reservaSelecionada.status)}
            </span>
          </p>

          <p>
            <strong>Motivo da rejeição:</strong>{" "}
            {reservaSelecionada.rejection_reason || "Não informado"}
          </p>

          <p>
            <strong>Data de criação:</strong>{" "}
            {formatarData(reservaSelecionada.created_at)}
          </p>

          <div className="crud-actions">
            <button
              className="crud-button secondary"
              onClick={() => setReservaSelecionada(null)}
            >
              Fechar detalhes
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
