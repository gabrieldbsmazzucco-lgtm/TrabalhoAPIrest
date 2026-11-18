"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const formularioInicial = {
  name: "",
  email: "",
  password: "",
  role: "CLIENT",
  cpf_cnpj: "",
  company_id: "",
};

export default function UsuariosPage() {
  const router = useRouter();

  const [usuarios, setUsuarios] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(null);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroRole, setFiltroRole] = useState("");
  const [filtroId, setFiltroId] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  function obterConfig() {
    return {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
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

      if (usuario.role !== "ADMIN") {
        router.replace(usuario.role === "RECEPTION" ? "/recepcao" : "/cliente");
        return;
      }

      carregarUsuarios();
    } catch {
      router.replace("/");
    }
  }, [router]);

  function limparMensagens() {
    setErro("");
    setMensagem("");
  }

  async function carregarUsuarios() {
    setCarregando(true);
    setErro("");
    setUsuarioSelecionado(null);

    try {
      const resposta = await axios.get(`${API_URL}/usuarios`, obterConfig());

      setUsuarios(resposta.data);
    } catch (error) {
      setErro(error.response?.data?.message || "Erro ao listar usuários.");
    } finally {
      setCarregando(false);
    }
  }

  async function buscarUsuarios(event) {
    event.preventDefault();

    setCarregando(true);
    limparMensagens();
    setUsuarioSelecionado(null);

    try {
      const resposta = await axios.get(`${API_URL}/usuarios`, {
        ...obterConfig(),
        params: {
          name: filtroNome.trim() || undefined,
          role: filtroRole || undefined,
        },
      });

      setUsuarios(resposta.data);

      if (resposta.data.length === 0) {
        setMensagem("Nenhum usuário encontrado.");
      }
    } catch (error) {
      setUsuarios([]);
      setErro(error.response?.data?.message || "Erro ao pesquisar usuários.");
    } finally {
      setCarregando(false);
    }
  }

  async function buscarPorId(event) {
    event.preventDefault();

    if (!filtroId.trim()) {
      setErro("Informe o ID do usuário.");
      return;
    }

    setCarregando(true);
    limparMensagens();
    setUsuarioSelecionado(null);

    try {
      const resposta = await axios.get(
        `${API_URL}/usuarios/${encodeURIComponent(filtroId.trim())}`,
        obterConfig(),
      );

      setUsuarios([resposta.data]);
      setUsuarioSelecionado(resposta.data);
    } catch (error) {
      setUsuarios([]);
      setErro(error.response?.data?.message || "Usuário não encontrado.");
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(event) {
    const { name, value } = event.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  function limparFormulario() {
    setFormulario(formularioInicial);
    setEditando(null);
  }

  async function salvarUsuario(event) {
    event.preventDefault();

    limparMensagens();

    const dados = {
      name: formulario.name.trim(),
      email: formulario.email.trim(),
      role: formulario.role,
      cpf_cnpj: formulario.cpf_cnpj.trim() || null,
      company_id: formulario.company_id.trim() || null,
    };

    if (!editando) {
      dados.password = formulario.password;
    } else if (formulario.password.trim()) {
      dados.password = formulario.password;
    }

    try {
      if (editando) {
        await axios.put(
          `${API_URL}/usuarios/${editando}`,
          dados,
          obterConfig(),
        );

        setMensagem("Usuário atualizado com sucesso!");
      } else {
        await axios.post(`${API_URL}/usuarios`, dados, obterConfig());

        setMensagem("Usuário cadastrado com sucesso!");
      }

      limparFormulario();
      await carregarUsuarios();
    } catch (error) {
      setErro(error.response?.data?.message || "Erro ao salvar usuário.");
    }
  }

  function prepararEdicao(usuario) {
    setEditando(usuario.id);

    setFormulario({
      name: usuario.name || "",
      email: usuario.email || "",
      password: "",
      role: usuario.role || "CLIENT",
      cpf_cnpj: usuario.cpf_cnpj || "",
      company_id: usuario.company_id || "",
    });

    setUsuarioSelecionado(null);
    limparMensagens();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirUsuario(id) {
    const confirmar = window.confirm(
      "Tem certeza de que deseja excluir este usuário?",
    );

    if (!confirmar) return;

    limparMensagens();

    try {
      await axios.delete(`${API_URL}/usuarios/${id}`, obterConfig());

      setMensagem("Usuário excluído com sucesso!");
      setUsuarioSelecionado(null);

      if (editando === id) {
        limparFormulario();
      }

      await carregarUsuarios();
    } catch (error) {
      setErro(error.response?.data?.message || "Erro ao excluir usuário.");
    }
  }

  function visualizarUsuario(usuario) {
    setUsuarioSelecionado(usuario);
  }

  function listarTodos() {
    setFiltroNome("");
    setFiltroRole("");
    setFiltroId("");
    limparMensagens();
    carregarUsuarios();
  }

  function sair() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    router.replace("/");
  }

  return (
    <main className="crud-container">
      <header className="crud-header">
        <div>
          <h1>Gerenciamento de Usuários</h1>
          <p>Cadastre, consulte, edite e exclua usuários.</p>
        </div>

        <button
          type="button"
          className="crud-button secondary"
          onClick={() => router.push("/admin")}
        >
          Voltar ao painel
        </button>
      </header>

      {mensagem && <div className="crud-success">{mensagem}</div>}

      {erro && <div className="crud-error">{erro}</div>}

      <section className="crud-card">
        <h2>{editando ? "Editar usuário" : "Cadastrar usuário"}</h2>

        <form onSubmit={salvarUsuario}>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                name="name"
                value={formulario.name}
                onChange={atualizarCampo}
                required
              />
            </div>

            <div className="crud-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formulario.email}
                onChange={atualizarCampo}
                required
              />
            </div>

            <div className="crud-field">
              <label htmlFor="password">
                Senha {editando ? "(deixe vazia para manter)" : ""}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formulario.password}
                onChange={atualizarCampo}
                required={!editando}
                minLength={6}
                placeholder={
                  editando ? "Nova senha (opcional)" : "Mínimo de 6 caracteres"
                }
              />
            </div>

            <div className="crud-field">
              <label htmlFor="role">Perfil</label>
              <select
                id="role"
                name="role"
                value={formulario.role}
                onChange={atualizarCampo}
                required
              >
                <option value="ADMIN">ADMIN</option>
                <option value="CLIENT">CLIENT</option>
                <option value="RECEPTION">RECEPTION</option>
              </select>
            </div>

            <div className="crud-field">
              <label htmlFor="cpf_cnpj">CPF/CNPJ</label>
              <input
                id="cpf_cnpj"
                name="cpf_cnpj"
                value={formulario.cpf_cnpj}
                onChange={atualizarCampo}
              />
            </div>

            <div className="crud-field">
              <label htmlFor="company_id">ID da empresa</label>
              <input
                id="company_id"
                name="company_id"
                value={formulario.company_id}
                onChange={atualizarCampo}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="crud-actions">
            <button type="submit" className="crud-button primary">
              {editando ? "Salvar alterações" : "Cadastrar usuário"}
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
        <h2>Pesquisar usuários</h2>

        <form onSubmit={buscarUsuarios} className="crud-search">
          <div className="crud-field">
            <label htmlFor="filtroNome">Nome</label>
            <input
              id="filtroNome"
              value={filtroNome}
              onChange={(event) => setFiltroNome(event.target.value)}
              placeholder="Digite o nome"
            />
          </div>

          <div className="crud-field">
            <label htmlFor="filtroRole">Perfil</label>
            <select
              id="filtroRole"
              value={filtroRole}
              onChange={(event) => setFiltroRole(event.target.value)}
            >
              <option value="">Todos os perfis</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CLIENT">CLIENT</option>
              <option value="RECEPTION">RECEPTION</option>
            </select>
          </div>

          <button className="crud-button primary" type="submit">
            Pesquisar
          </button>
        </form>

        <form onSubmit={buscarPorId} className="crud-search">
          <div className="crud-field">
            <label htmlFor="filtroId">Buscar por ID</label>
            <input
              id="filtroId"
              value={filtroId}
              onChange={(event) => setFiltroId(event.target.value)}
              placeholder="Informe o ID do usuário"
            />
          </div>

          <button className="crud-button primary" type="submit">
            Buscar ID
          </button>
        </form>

        <button
          type="button"
          className="crud-button secondary"
          onClick={listarTodos}
        >
          Listar todos
        </button>
      </section>

      {usuarioSelecionado && (
        <section className="crud-card">
          <h2>Detalhes do usuário</h2>

          <p>
            <strong>ID:</strong> {usuarioSelecionado.id}
          </p>
          <p>
            <strong>Nome:</strong> {usuarioSelecionado.name}
          </p>
          <p>
            <strong>E-mail:</strong> {usuarioSelecionado.email}
          </p>
          <p>
            <strong>Perfil:</strong> {usuarioSelecionado.role}
          </p>
          <p>
            <strong>CPF/CNPJ:</strong>{" "}
            {usuarioSelecionado.cpf_cnpj || "Não informado"}
          </p>
          <p>
            <strong>ID da empresa:</strong>{" "}
            {usuarioSelecionado.company_id || "Não informado"}
          </p>
          <p>
            <strong>Data de cadastro:</strong>{" "}
            {usuarioSelecionado.created_at
              ? new Date(usuarioSelecionado.created_at).toLocaleString("pt-BR")
              : "Não informado"}
          </p>

          <button
            type="button"
            className="crud-button secondary"
            onClick={() => setUsuarioSelecionado(null)}
          >
            Fechar detalhes
          </button>
        </section>
      )}

      <section className="crud-card">
        <div className="crud-list-header">
          <div>
            <h2>Usuários cadastrados</h2>
            <p>Total: {usuarios.length}</p>
          </div>

          <button
            type="button"
            className="crud-button secondary"
            onClick={carregarUsuarios}
          >
            Atualizar lista
          </button>
        </div>

        {carregando ? (
          <p>Carregando usuários...</p>
        ) : usuarios.length === 0 ? (
          <p>Nenhum usuário encontrado.</p>
        ) : (
          <div className="crud-table-wrapper">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>CPF/CNPJ</th>
                  <th>Empresa</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>{usuario.name}</td>
                    <td>{usuario.email}</td>
                    <td>{usuario.role}</td>
                    <td>{usuario.cpf_cnpj || "—"}</td>
                    <td>{usuario.company_id || "—"}</td>
                    <td>
                      <div className="crud-row-actions">
                        <button
                          type="button"
                          className="crud-button secondary"
                          onClick={() => visualizarUsuario(usuario)}
                        >
                          Visualizar
                        </button>

                        <button
                          type="button"
                          className="crud-button edit"
                          onClick={() => prepararEdicao(usuario)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="crud-button delete"
                          onClick={() => excluirUsuario(usuario.id)}
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
    </main>
  );
}
