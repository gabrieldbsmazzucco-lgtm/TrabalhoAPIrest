"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const diasSemana = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

export default function DisponibilidadesClientePage() {
  const router = useRouter();

  const [disponibilidades, setDisponibilidades] = useState([]);
  const [salas, setSalas] = useState([]);
  const [disponibilidadeSelecionada, setDisponibilidadeSelecionada] =
    useState(null);

  const [filtroSala, setFiltroSala] = useState("");
  const [filtroDia, setFiltroDia] = useState("");

  const [carregando, setCarregando] = useState(false);
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
      const usuario = JSON.parse(usuarioSalvo);

      if (usuario.role !== "CLIENT") {
        if (usuario.role === "ADMIN") {
          router.push("/admin");
        } else if (usuario.role === "RECEPTION") {
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
    setMensagem("");
    setDisponibilidadeSelecionada(null);

    try {
      const [respostaDisponibilidades, respostaSalas] = await Promise.all([
        axios.get(`${API_URL}/disponibilidades`, obterConfig()),
        axios.get(`${API_URL}/salas`, obterConfig()),
      ]);

      // O cliente visualiza somente disponibilidades ativas
      // que permitem usuários externos.
      const disponibilidadesVisiveis = respostaDisponibilidades.data.filter(
        (disponibilidade) =>
          disponibilidade.is_active !== false &&
          disponibilidade.is_external_allowed === true,
      );

      // O cliente visualiza somente salas ativas.
      const salasAtivas = respostaSalas.data.filter(
        (sala) => sala.is_active !== false,
      );

      const idsSalasAtivas = salasAtivas.map((sala) => sala.id);

      const disponibilidadesValidas = disponibilidadesVisiveis.filter(
        (disponibilidade) => idsSalasAtivas.includes(disponibilidade.space_id),
      );

      setDisponibilidades(disponibilidadesValidas);
      setSalas(salasAtivas);

      if (disponibilidadesValidas.length === 0) {
        setMensagem("Nenhuma disponibilidade disponível no momento.");
      }
    } catch (erro) {
      setErro(
        erro.response?.data?.message || "Erro ao carregar as disponibilidades.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function nomeSala(spaceId) {
    const sala = salas.find((item) => item.id === spaceId);
    return sala ? sala.name : "Sala não encontrada";
  }

  function nomeDia(numero) {
    return (
      diasSemana.find((dia) => dia.value === Number(numero))?.label ||
      "Dia inválido"
    );
  }

  function proximaDataDia(numero) {
    const hoje = new Date();
    const diaDesejado = Number(numero);
    const diferenca = (diaDesejado - hoje.getDay() + 7) % 7;

    const data = new Date(hoje);
    data.setDate(hoje.getDate() + diferenca);

    return data.toLocaleDateString("pt-BR");
  }

  function diaComData(numero) {
    return `${nomeDia(numero)} (${proximaDataDia(numero)})`;
  }

  function buscarDisponibilidades() {
    setErro("");
    setMensagem("");
    setDisponibilidadeSelecionada(null);

    let resultado = [...disponibilidades];

    if (filtroSala) {
      resultado = resultado.filter(
        (disponibilidade) => disponibilidade.space_id === filtroSala,
      );
    }

    if (filtroDia !== "") {
      resultado = resultado.filter(
        (disponibilidade) =>
          Number(disponibilidade.day_of_week) === Number(filtroDia),
      );
    }

    setDisponibilidadesFiltradas(resultado);

    if (resultado.length === 0) {
      setMensagem("Nenhuma disponibilidade encontrada com esses filtros.");
    }
  }

  const [disponibilidadesFiltradas, setDisponibilidadesFiltradas] = useState(
    [],
  );

  useEffect(() => {
    setDisponibilidadesFiltradas(disponibilidades);
  }, [disponibilidades]);

  function limparFiltros() {
    setFiltroSala("");
    setFiltroDia("");
    setMensagem("");
    setErro("");
    setDisponibilidadeSelecionada(null);
    setDisponibilidadesFiltradas(disponibilidades);
  }

  function visualizarDisponibilidade(disponibilidade) {
    setDisponibilidadeSelecionada(disponibilidade);
  }

  return (
    <main className="crud-container">
      <header className="crud-header">
        <div>
          <h1>Disponibilidades</h1>
          <p>Consulte os dias e horários disponíveis para reservar uma sala.</p>
        </div>

        <button
          className="crud-button secondary"
          onClick={() => router.push("/cliente")}
        >
          Voltar ao painel
        </button>
      </header>

      {mensagem && <div className="crud-success">{mensagem}</div>}

      {erro && <div className="crud-error">{erro}</div>}

      <section className="crud-card">
        <h2>Pesquisar disponibilidades</h2>

        <div className="crud-form-grid">
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
            <label>Dia da semana</label>

            <select
              value={filtroDia}
              onChange={(evento) => setFiltroDia(evento.target.value)}
            >
              <option value="">Todos os dias</option>

              {diasSemana.map((dia) => (
                <option key={dia.value} value={dia.value}>
                  {dia.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="crud-actions">
          <button
            className="crud-button primary"
            onClick={buscarDisponibilidades}
            disabled={carregando}
          >
            Pesquisar
          </button>

          <button className="crud-button secondary" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>
      </section>

      <section className="crud-card">
        <div className="crud-list-header">
          <div>
            <h2>Horários disponíveis</h2>
            <p>Total encontrado: {disponibilidadesFiltradas.length}</p>
          </div>

          <button
            className="crud-button secondary"
            onClick={carregarDados}
            disabled={carregando}
          >
            Atualizar lista
          </button>
        </div>

        {carregando && <p>Carregando disponibilidades...</p>}

        {!carregando && disponibilidadesFiltradas.length === 0 && (
          <p>Nenhum horário disponível para consulta.</p>
        )}

        {!carregando && disponibilidadesFiltradas.length > 0 && (
          <div className="crud-table-wrapper">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Sala</th>
                  <th>Dia e próxima data</th>
                  <th>Horário inicial</th>
                  <th>Horário final</th>
                  <th>Reserva externa</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {disponibilidadesFiltradas.map((disponibilidade) => (
                  <tr key={disponibilidade.id}>
                    <td>{nomeSala(disponibilidade.space_id)}</td>

                    <td>{diaComData(disponibilidade.day_of_week)}</td>

                    <td>{disponibilidade.start_time}</td>

                    <td>{disponibilidade.end_time}</td>

                    <td>Permitida</td>

                    <td>
                      <div className="crud-row-actions">
                        <button
                          className="crud-button secondary"
                          onClick={() =>
                            visualizarDisponibilidade(disponibilidade)
                          }
                        >
                          Ver detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {disponibilidadeSelecionada && (
        <section className="crud-card">
          <h2>Detalhes da disponibilidade</h2>
          <p>
            <strong>Sala:</strong>{" "}
            {nomeSala(disponibilidadeSelecionada.space_id)}
          </p>
          <p>
            <strong>Dia da semana:</strong>{" "}
            {diaComData(disponibilidadeSelecionada.day_of_week)}
          </p>
          <p>
            <strong>Horário inicial:</strong>{" "}
            {disponibilidadeSelecionada.start_time}
          </p>
          <p>
            <strong>Horário final:</strong>{" "}
            {disponibilidadeSelecionada.end_time}
          </p>
          <p>
            <strong>Permitir usuários externos:</strong> Sim
          </p>
          <p>
            <strong>Status:</strong> Ativa
          </p>
          <div className="crud-actions">
            <button
              className="crud-button secondary"
              onClick={() => setDisponibilidadeSelecionada(null)}
            >
              Fechar detalhes
            </button>
          </div>
          a
        </section>
      )}
    </main>
  );
}
