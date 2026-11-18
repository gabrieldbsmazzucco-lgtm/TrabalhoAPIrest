"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function EmpresasPage() {
  const router = useRouter();

  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [editando, setEditando] = useState(null);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);

  const formularioInicial = {
    Nome_corporativo: "",
    Nome_Trade: "",
    CNPJ: "",
    telefone: "",
    Data_criacao: "",
  };

  const [formulario, setFormulario] = useState(formularioInicial);
  const [termoNome, setTermoNome] = useState("");
  const [termoId, setTermoId] = useState("");

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

      carregarEmpresas();
    } catch {
      router.replace("/");
    }
  }, [router]);

  async function carregarEmpresas() {
    setCarregando(true);
    setErro("");
    setEmpresaSelecionada(null);

    try {
      const resposta = await axios.get(`${API_URL}/empresas`, obterConfig());

      setEmpresas(resposta.data);
    } catch (error) {
      setErro(error.response?.data?.message || "Erro ao listar empresas.");
    } finally {
      setCarregando(false);
    }
  }

  async function buscarPorNome(event) {
    event.preventDefault();

    if (!termoNome.trim()) {
      carregarEmpresas();
      return;
    }

    setCarregando(true);
    setErro("");
    setMensagem("");
    setEmpresaSelecionada(null);

    try {
      const resposta = await axios.get(
        `${API_URL}/empresas/nome/${encodeURIComponent(termoNome.trim())}`,
        obterConfig(),
      );

      setEmpresas(resposta.data);
    } catch (error) {
      setEmpresas([]);
      setErro(error.response?.data?.message || "Nenhuma empresa encontrada.");
    } finally {
      setCarregando(false);
    }
  }

  async function buscarPorId(event) {
    event.preventDefault();

    if (!termoId.trim()) {
      setErro("Informe o ID da empresa.");
      return;
    }

    setCarregando(true);
    setErro("");
    setMensagem("");
    setEmpresaSelecionada(null);

    try {
      const resposta = await axios.get(
        `${API_URL}/empresas/${encodeURIComponent(termoId.trim())}`,
        obterConfig(),
      );

      setEmpresas([resposta.data]);
      setEmpresaSelecionada(resposta.data);
    } catch (error) {
      setEmpresas([]);
      setErro(error.response?.data?.message || "Empresa não encontrada.");
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

  async function salvarEmpresa(event) {
    event.preventDefault();
    setErro("");
    setMensagem("");

    try {
      if (editando) {
        await axios.put(
          `${API_URL}/empresas/${editando}`,
          formulario,
          obterConfig(),
        );

        setMensagem("Empresa atualizada com sucesso!");
      } else {
        await axios.post(`${API_URL}/empresas`, formulario, obterConfig());

        setMensagem("Empresa cadastrada com sucesso!");
      }

      limparFormulario();
      await carregarEmpresas();
    } catch (error) {
      setErro(error.response?.data?.message || "Erro ao salvar empresa.");
    }
  }

  function prepararEdicao(empresa) {
    setEditando(empresa.ID);

    setFormulario({
      Nome_corporativo: empresa.Nome_corporativo || "",
      Nome_Trade: empresa.Nome_Trade || "",
      CNPJ: empresa.CNPJ || "",
      telefone: empresa.telefone || "",
      Data_criacao: empresa.Data_criacao || "",
    });

    setEmpresaSelecionada(null);
    setErro("");
    setMensagem("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirEmpresa(id) {
    if (!window.confirm("Deseja realmente excluir esta empresa?")) {
      return;
    }

    setErro("");
    setMensagem("");

    try {
      await axios.delete(`${API_URL}/empresas/${id}`, obterConfig());

      setMensagem("Empresa excluída com sucesso!");
      setEmpresaSelecionada(null);
      limparFormulario();
      await carregarEmpresas();
    } catch (error) {
      setErro(error.response?.data?.message || "Erro ao excluir empresa.");
    }
  }

  function visualizarEmpresa(empresa) {
    setEmpresaSelecionada(empresa);
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
          <h1>Gerenciamento de Empresas</h1>
          <p>Gerencie os registros das empresas.</p>
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
        <h2>{editando ? "Editar empresa" : "Cadastrar empresa"}</h2>

        <form onSubmit={salvarEmpresa}>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label>Nome corporativo</label>
              <input
                name="Nome_corporativo"
                value={formulario.Nome_corporativo}
                onChange={atualizarCampo}
                required
              />
            </div>

            <div className="crud-field">
              <label>Nome fantasia</label>
              <input
                name="Nome_Trade"
                value={formulario.Nome_Trade}
                onChange={atualizarCampo}
                required
              />
            </div>

            <div className="crud-field">
              <label>CNPJ</label>
              <input
                name="CNPJ"
                value={formulario.CNPJ}
                onChange={atualizarCampo}
                required
              />
            </div>

            <div className="crud-field">
              <label>Telefone</label>
              <input
                name="telefone"
                value={formulario.telefone}
                onChange={atualizarCampo}
                required
              />
            </div>

            <div className="crud-field">
              <label>Data de criação</label>
              <input
                type="date"
                name="Data_criacao"
                value={formulario.Data_criacao}
                onChange={atualizarCampo}
                required
              />
            </div>
          </div>

          <div className="crud-actions">
            <button className="crud-button primary" type="submit">
              {editando ? "Salvar alterações" : "Cadastrar empresa"}
            </button>

            {editando && (
              <button
                className="crud-button secondary"
                type="button"
                onClick={limparFormulario}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="crud-card">
        <h2>Pesquisar empresas</h2>

        <form onSubmit={buscarPorNome} className="crud-search">
          <div className="crud-field">
            <label>Buscar por nome</label>
            <input
              value={termoNome}
              onChange={(event) => setTermoNome(event.target.value)}
              placeholder="Nome corporativo ou fantasia"
            />
          </div>

          <button className="crud-button primary" type="submit">
            Buscar nome
          </button>
        </form>

        <form onSubmit={buscarPorId} className="crud-search">
          <div className="crud-field">
            <label>Buscar por ID</label>
            <input
              value={termoId}
              onChange={(event) => setTermoId(event.target.value)}
              placeholder="Informe o ID da empresa"
            />
          </div>

          <button className="crud-button primary" type="submit">
            Buscar ID
          </button>
        </form>

        <button
          className="crud-button secondary"
          type="button"
          onClick={() => {
            setTermoNome("");
            setTermoId("");
            carregarEmpresas();
          }}
        >
          Listar todas
        </button>
      </section>

      {empresaSelecionada && (
        <section className="crud-card">
          <h2>Detalhes da empresa</h2>

          <p>
            <strong>ID:</strong> {empresaSelecionada.ID}
          </p>
          <p>
            <strong>Nome corporativo:</strong>{" "}
            {empresaSelecionada.Nome_corporativo}
          </p>
          <p>
            <strong>Nome fantasia:</strong> {empresaSelecionada.Nome_Trade}
          </p>
          <p>
            <strong>CNPJ:</strong> {empresaSelecionada.CNPJ}
          </p>
          <p>
            <strong>Telefone:</strong> {empresaSelecionada.telefone}
          </p>
          <p>
            <strong>Data de criação:</strong> {empresaSelecionada.Data_criacao}
          </p>

          <button
            className="crud-button secondary"
            onClick={() => setEmpresaSelecionada(null)}
          >
            Fechar detalhes
          </button>
        </section>
      )}

      <section className="crud-card">
        <div className="crud-list-header">
          <div>
            <h2>Empresas cadastradas</h2>
            <p>Total: {empresas.length}</p>
          </div>

          <button className="crud-button secondary" onClick={carregarEmpresas}>
            Atualizar
          </button>
        </div>

        {carregando ? (
          <p>Carregando...</p>
        ) : empresas.length === 0 ? (
          <p>Nenhuma empresa encontrada.</p>
        ) : (
          <div className="crud-table-wrapper">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Nome corporativo</th>
                  <th>Nome fantasia</th>
                  <th>CNPJ</th>
                  <th>Telefone</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {empresas.map((empresa) => (
                  <tr key={empresa.ID}>
                    <td>{empresa.Nome_corporativo}</td>
                    <td>{empresa.Nome_Trade}</td>
                    <td>{empresa.CNPJ}</td>
                    <td>{empresa.telefone}</td>
                    <td>
                      <div className="crud-row-actions">
                        <button
                          className="crud-button secondary"
                          onClick={() => visualizarEmpresa(empresa)}
                        >
                          Visualizar
                        </button>

                        <button
                          className="crud-button edit"
                          onClick={() => prepararEdicao(empresa)}
                        >
                          Editar
                        </button>

                        <button
                          className="crud-button delete"
                          onClick={() => excluirEmpresa(empresa.ID)}
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
