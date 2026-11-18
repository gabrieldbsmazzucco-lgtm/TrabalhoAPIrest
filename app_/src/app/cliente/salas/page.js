"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function SalasClientePage() {
  const router = useRouter();

  const [salas, setSalas] = useState([]);
  const [salaSelecionada, setSalaSelecionada] = useState(null);

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroId, setFiltroId] = useState("");

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
      router.replace("/");
      return;
    }

    try {
      const usuario = JSON.parse(usuarioSalvo);

      if (usuario.role !== "CLIENT") {
        const destinos = {
          ADMIN: "/admin",
          RECEPTION: "/recepcao",
        };

        router.replace(destinos[usuario.role] || "/");
        return;
      }

      carregarSalas();
    } catch {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("usuario");
      router.replace("/");
    }
  }, [router]);

  async function carregarSalas() {
    setCarregando(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await axios.get(`${API_URL}/salas`, obterConfig());

      const salasAtivas = resposta.data.filter(
        (sala) => sala.is_active === true,
      );

      setSalas(salasAtivas);

      if (salasAtivas.length === 0) {
        setMensagem("Nenhuma sala disponível no momento.");
      }
    } catch (erro) {
      setErro(erro.response?.data?.message || "Erro ao carregar as salas.");
    } finally {
      setCarregando(false);
    }
  }

  async function buscarSalas() {
    setCarregando(true);
    setErro("");
    setMensagem("");
    setSalaSelecionada(null);

    try {
      const params = {};

      if (filtroNome.trim()) {
        params.name = filtroNome.trim();
      }

      if (filtroTipo) {
        params.type = filtroTipo;
      }

      params.is_active = true;

      const resposta = await axios.get(`${API_URL}/salas`, {
        ...obterConfig(),
        params,
      });

      const salasAtivas = resposta.data.filter(
        (sala) => sala.is_active === true,
      );

      setSalas(salasAtivas);

      if (salasAtivas.length === 0) {
        setMensagem("Nenhuma sala disponível com esses filtros.");
      }
    } catch (erro) {
      setErro(erro.response?.data?.message || "Erro ao pesquisar salas.");
    } finally {
      setCarregando(false);
    }
  }

  async function buscarPorId() {
    if (!filtroId.trim()) {
      setErro("Informe o ID da sala.");
      return;
    }

    setCarregando(true);
    setErro("");
    setMensagem("");
    setSalaSelecionada(null);

    try {
      const resposta = await axios.get(
        `${API_URL}/salas/${encodeURIComponent(filtroId.trim())}`,
        obterConfig(),
      );

      if (!resposta.data.is_active) {
        setSalas([]);
        setMensagem("Esta sala não está disponível para consulta.");
        return;
      }

      setSalas([resposta.data]);
      setSalaSelecionada(resposta.data);
    } catch (erro) {
      setSalas([]);
      setErro(erro.response?.data?.message || "Sala não encontrada.");
    } finally {
      setCarregando(false);
    }
  }

  function limparFiltros() {
    setFiltroNome("");
    setFiltroTipo("");
    setFiltroId("");
    setSalaSelecionada(null);
    setErro("");
    setMensagem("");

    carregarSalas();
  }

  function visualizarSala(sala) {
    setSalaSelecionada(sala);
  }

  return (
    <main className="crud-container">
      <header className="crud-header">
        <div>
          <h1>Consultar Salas</h1>
          <p>Consulte as salas disponíveis para utilização.</p>
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
        <h2>Pesquisar salas</h2>

        <div className="crud-form-grid">
          <div className="crud-field">
            <label>Nome</label>
            <input
              value={filtroNome}
              onChange={(evento) => setFiltroNome(evento.target.value)}
              placeholder="Digite o nome da sala"
            />
          </div>

          <div className="crud-field">
            <label>Tipo</label>
            <select
              value={filtroTipo}
              onChange={(evento) => setFiltroTipo(evento.target.value)}
            >
              <option value="">Todos os tipos</option>
              <option value="COWORKING">Coworking</option>
              <option value="LAB">Laboratório</option>
              <option value="MEETING_ROOM">Sala de reunião</option>
            </select>
          </div>
        </div>

        <div className="crud-actions">
          <button
            className="crud-button primary"
            onClick={buscarSalas}
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
              placeholder="Cole o ID da sala"
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
            <h2>Salas disponíveis</h2>
            <p>Total encontrado: {salas.length}</p>
          </div>

          <button
            className="crud-button secondary"
            onClick={carregarSalas}
            disabled={carregando}
          >
            Atualizar lista
          </button>
        </div>

        {carregando && <p>Carregando salas...</p>}

        {!carregando && salas.length === 0 && <p>Nenhuma sala disponível.</p>}

        {!carregando && salas.length > 0 && (
          <div className="crud-table-wrapper">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Capacidade</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {salas.map((sala) => (
                  <tr key={sala.id}>
                    <td>{sala.name}</td>
                    <td>{sala.type}</td>
                    <td>{sala.capacity}</td>
                    <td>Disponível</td>
                    <td>
                      <button
                        className="crud-button secondary"
                        onClick={() => visualizarSala(sala)}
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {salaSelecionada && (
        <section className="crud-card">
          <h2>Detalhes da sala</h2>

          <p>
            <strong>Nome:</strong> {salaSelecionada.name}
          </p>

          <p>
            <strong>Tipo:</strong> {salaSelecionada.type}
          </p>

          <p>
            <strong>Capacidade:</strong> {salaSelecionada.capacity}
          </p>

          <p>
            <strong>Descrição:</strong>{" "}
            {salaSelecionada.description || "Sem descrição"}
          </p>

          <p>
            <strong>Situação:</strong> Disponível
          </p>

          <div className="crud-actions">
            <button
              className="crud-button secondary"
              onClick={() => setSalaSelecionada(null)}
            >
              Fechar detalhes
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
