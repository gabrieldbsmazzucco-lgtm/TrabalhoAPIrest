"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const formularioInicial = {
  name: "",
  type: "MEETING_ROOM",
  capacity: "",
  description: "",
  is_active: true,
};

export default function SalasPage() {
  const router = useRouter();

  const [salas, setSalas] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(false);
  const [salaSelecionada, setSalaSelecionada] = useState(null);

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroAtiva, setFiltroAtiva] = useState("");
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

      carregarSalas();
    } catch {
      sessionStorage.clear();
      router.push("/");
    }
  }, [router]);

  async function carregarSalas() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await axios.get(`${API_URL}/salas`, obterConfig());

      setSalas(resposta.data);
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

      if (filtroNome.trim()) params.name = filtroNome.trim();
      if (filtroTipo) params.type = filtroTipo;
      if (filtroAtiva) params.is_active = filtroAtiva;

      const resposta = await axios.get(`${API_URL}/salas`, {
        ...obterConfig(),
        params,
      });

      setSalas(resposta.data);

      if (resposta.data.length === 0) {
        setMensagem("Nenhuma sala encontrada.");
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

    try {
      const resposta = await axios.get(
        `${API_URL}/salas/${encodeURIComponent(filtroId.trim())}`,
        obterConfig(),
      );

      setSalas([resposta.data]);
      setSalaSelecionada(resposta.data);
    } catch (erro) {
      setSalas([]);
      setSalaSelecionada(null);
      setErro(erro.response?.data?.message || "Sala não encontrada.");
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(evento) {
    const { name, value, type, checked } = evento.target;

    setFormulario((atual) => ({
      ...atual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function prepararEdicao(sala) {
    setFormulario({
      name: sala.name || "",
      type: sala.type || "MEETING_ROOM",
      capacity: String(sala.capacity ?? ""),
      description: sala.description || "",
      is_active: sala.is_active ?? true,
    });

    setSalaSelecionada(sala);
    setEditando(true);
    setMensagem("");
    setErro("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limparFormulario() {
    setFormulario(formularioInicial);
    setEditando(false);
    setSalaSelecionada(null);
    setErro("");
    setMensagem("");
  }

  async function salvarSala(evento) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    const dados = {
      name: formulario.name.trim(),
      type: formulario.type,
      capacity: Number(formulario.capacity),
      description: formulario.description.trim(),
      is_active: formulario.is_active,
    };

    if (!dados.name) {
      setErro("Informe o nome da sala.");
      return;
    }

    if (!Number.isInteger(dados.capacity) || dados.capacity <= 0) {
      setErro("A capacidade deve ser um número inteiro maior que zero.");
      return;
    }

    setCarregando(true);

    try {
      if (editando) {
        await axios.put(
          `${API_URL}/salas/${salaSelecionada.id}`,
          dados,
          obterConfig(),
        );

        setMensagem("Sala atualizada com sucesso!");
      } else {
        await axios.post(`${API_URL}/salas`, dados, obterConfig());

        setMensagem("Sala cadastrada com sucesso!");
      }

      limparFormulario();
      await carregarSalas();
    } catch (erro) {
      setErro(erro.response?.data?.message || "Erro ao salvar a sala.");
    } finally {
      setCarregando(false);
    }
  }

  async function excluirSala(sala) {
    const confirmar = window.confirm(
      `Deseja realmente excluir a sala "${sala.name}"?`,
    );

    if (!confirmar) return;

    setErro("");
    setMensagem("");

    try {
      await axios.delete(`${API_URL}/salas/${sala.id}`, obterConfig());

      setMensagem("Sala excluída com sucesso!");
      setSalaSelecionada(null);
      await carregarSalas();
    } catch (erro) {
      setErro(erro.response?.data?.message || "Erro ao excluir a sala.");
    }
  }

  function visualizarSala(sala) {
    setSalaSelecionada(sala);
  }

  return (
    <main className="crud-container">
      <header className="crud-header">
        <div>
          <h1>Gerenciamento de Salas</h1>
          <p>Cadastre, consulte, edite e remova salas.</p>
        </div>

        <button
          className="crud-button secondary"
          onClick={() => router.push("/admin")}
        >
          Voltar ao painel
        </button>
      </header>

      {mensagem && <div className="crud-success">{mensagem}</div>}

      {erro && <div className="crud-error">{erro}</div>}

      <section className="crud-card">
        <h2>{editando ? "Editar sala" : "Cadastrar nova sala"}</h2>

        <form onSubmit={salvarSala}>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label>Nome da sala</label>
              <input
                name="name"
                value={formulario.name}
                onChange={atualizarCampo}
                placeholder="Ex.: Sala de Reunião 1"
                required
              />
            </div>

            <div className="crud-field">
              <label>Tipo</label>
              <select
                name="type"
                value={formulario.type}
                onChange={atualizarCampo}
                required
              >
                <option value="COWORKING">Coworking</option>
                <option value="LAB">Laboratório</option>
                <option value="MEETING_ROOM">Sala de reunião</option>
              </select>
            </div>

            <div className="crud-field">
              <label>Capacidade</label>
              <input
                type="number"
                name="capacity"
                value={formulario.capacity}
                onChange={atualizarCampo}
                min="1"
                step="1"
                placeholder="Ex.: 10"
                required
              />
            </div>

            <div className="crud-field">
              <label>Descrição</label>
              <input
                name="description"
                value={formulario.description}
                onChange={atualizarCampo}
                placeholder="Descrição da sala"
              />
            </div>

            <div className="crud-field">
              <label>Situação</label>
              <select
                name="is_active"
                value={String(formulario.is_active)}
                onChange={(evento) =>
                  setFormulario((atual) => ({
                    ...atual,
                    is_active: evento.target.value === "true",
                  }))
                }
              >
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </select>
            </div>
          </div>

          <div className="crud-actions">
            <button
              type="submit"
              className="crud-button primary"
              disabled={carregando}
            >
              {carregando
                ? "Salvando..."
                : editando
                  ? "Salvar alterações"
                  : "Cadastrar sala"}
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

          <div className="crud-field">
            <label>Situação</label>
            <select
              value={filtroAtiva}
              onChange={(evento) => setFiltroAtiva(evento.target.value)}
            >
              <option value="">Todas</option>
              <option value="true">Ativas</option>
              <option value="false">Inativas</option>
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
            onClick={() => {
              setFiltroNome("");
              setFiltroTipo("");
              setFiltroAtiva("");
              carregarSalas();
            }}
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
            <h2>Salas cadastradas</h2>
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

        {carregando && <p>Carregando...</p>}

        {!carregando && salas.length === 0 && <p>Nenhuma sala cadastrada.</p>}

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
                    <td>{sala.is_active ? "Ativa" : "Inativa"}</td>
                    <td>
                      <div className="crud-row-actions">
                        <button
                          className="crud-button secondary"
                          onClick={() => visualizarSala(sala)}
                        >
                          Ver
                        </button>

                        <button
                          className="crud-button edit"
                          onClick={() => prepararEdicao(sala)}
                        >
                          Editar
                        </button>

                        <button
                          className="crud-button delete"
                          onClick={() => excluirSala(sala)}
                        >
                          Excluir
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

      {salaSelecionada && !editando && (
        <section className="crud-card">
          <h2>Detalhes da sala</h2>

          <p>
            <strong>ID:</strong> {salaSelecionada.id}
          </p>
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
            <strong>Situação:</strong>{" "}
            {salaSelecionada.is_active ? "Ativa" : "Inativa"}
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
