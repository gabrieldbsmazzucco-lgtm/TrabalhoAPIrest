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

function novoDia() {
  return {
    day_of_week: "",
    start_time: "08:00",
    end_time: "12:00",
    is_external_allowed: true,
  };
}

const formularioInicial = {
  space_id: "",
  quantidade: 1,
  dias: [novoDia()],
};

export default function DisponibilidadesPage() {
  const router = useRouter();

  const [disponibilidades, setDisponibilidades] = useState([]);
  const [salas, setSalas] = useState([]);
  const [perfilUsuario, setPerfilUsuario] = useState("");

  const [formulario, setFormulario] = useState(formularioInicial);
  const [editando, setEditando] = useState(false);
  const [disponibilidadeSelecionada, setDisponibilidadeSelecionada] =
    useState(null);

  const [filtroSala, setFiltroSala] = useState("");
  const [filtroDia, setFiltroDia] = useState("");
  const [filtroExterno, setFiltroExterno] = useState("");
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

  function obterConfigComInativas() {
    return {
      ...obterConfig(),
      params: {
        include_inactive: "true",
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

      if (usuario.role !== "ADMIN" && usuario.role !== "RECEPTION") {
        if (usuario.role === "CLIENT") {
          router.push("/cliente");
        } else {
          router.push("/");
        }

        return;
      }

      setPerfilUsuario(usuario.role);
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
      const [respostaDisponibilidades, respostaSalas] = await Promise.all([
        axios.get(`${API_URL}/disponibilidades`, obterConfigComInativas()),
        axios.get(`${API_URL}/salas`, obterConfig()),
      ]);

      setDisponibilidades(respostaDisponibilidades.data);
      setSalas(respostaSalas.data);
    } catch (erro) {
      setErro(
        erro.response?.data?.message ||
          "Erro ao carregar disponibilidades e salas.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function carregarDisponibilidades() {
    setCarregando(true);

    try {
      const resposta = await axios.get(
        `${API_URL}/disponibilidades`,
        obterConfigComInativas(),
      );

      setDisponibilidades(resposta.data);
    } catch (erro) {
      setErro(
        erro.response?.data?.message || "Erro ao carregar disponibilidades.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function alterarQuantidade(evento) {
    const quantidade = Number(evento.target.value);

    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 7) {
      return;
    }

    setFormulario((atual) => {
      const dias = [...atual.dias];

      while (dias.length < quantidade) {
        dias.push(novoDia());
      }

      return {
        ...atual,
        quantidade,
        dias: dias.slice(0, quantidade),
      };
    });
  }

  function atualizarDia(index, campo, valor) {
    setFormulario((atual) => {
      const dias = [...atual.dias];

      dias[index] = {
        ...dias[index],
        [campo]: valor,
      };

      return {
        ...atual,
        dias,
      };
    });
  }

  function nomeSala(spaceId) {
    const sala = salas.find((item) => item.id === spaceId);
    return sala ? sala.name : spaceId;
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

  async function buscarDisponibilidades() {
    setCarregando(true);
    setErro("");
    setMensagem("");
    setDisponibilidadeSelecionada(null);

    try {
      const params = {
        include_inactive: "true",
      };

      if (filtroSala) params.space_id = filtroSala;
      if (filtroDia !== "") params.day_of_week = filtroDia;

      if (filtroExterno !== "") {
        params.is_external_allowed = filtroExterno;
      }

      const resposta = await axios.get(`${API_URL}/disponibilidades`, {
        ...obterConfig(),
        params,
      });

      setDisponibilidades(resposta.data);

      if (resposta.data.length === 0) {
        setMensagem("Nenhuma disponibilidade encontrada.");
      }
    } catch (erro) {
      setErro(
        erro.response?.data?.message || "Erro ao pesquisar disponibilidades.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function buscarPorId() {
    if (!filtroId.trim()) {
      setErro("Informe o ID da disponibilidade.");
      return;
    }

    setCarregando(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await axios.get(
        `${API_URL}/disponibilidades/${encodeURIComponent(filtroId.trim())}`,
        obterConfig(),
      );

      setDisponibilidades([resposta.data]);
      setDisponibilidadeSelecionada(resposta.data);
    } catch (erro) {
      setDisponibilidades([]);
      setDisponibilidadeSelecionada(null);

      setErro(
        erro.response?.data?.message || "Disponibilidade não encontrada.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function prepararEdicao(disponibilidade) {
    setFormulario({
      space_id: disponibilidade.space_id,
      quantidade: 1,
      dias: [
        {
          day_of_week: String(disponibilidade.day_of_week),
          start_time: disponibilidade.start_time,
          end_time: disponibilidade.end_time,
          is_external_allowed: disponibilidade.is_external_allowed,
        },
      ],
    });

    setDisponibilidadeSelecionada(disponibilidade);
    setEditando(true);
    setErro("");
    setMensagem("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limparFormulario() {
    setFormulario({
      ...formularioInicial,
      dias: [novoDia()],
    });

    setEditando(false);
    setDisponibilidadeSelecionada(null);
    setErro("");
    setMensagem("");
  }

  async function salvarDisponibilidade(evento) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    if (!formulario.space_id) {
      setErro("Selecione uma sala.");
      return;
    }

    const dias = formulario.dias;

    if (dias.length !== formulario.quantidade) {
      setErro("A quantidade de dias configurados está incorreta.");
      return;
    }

    const diasEscolhidos = dias.map((dia) => Number(dia.day_of_week));

    if (dias.some((dia) => dia.day_of_week === "")) {
      setErro("Selecione um dia para cada configuração.");
      return;
    }

    if (new Set(diasEscolhidos).size !== diasEscolhidos.length) {
      setErro("Não é possível selecionar o mesmo dia mais de uma vez.");
      return;
    }

    for (let i = 0; i < dias.length; i++) {
      const dia = dias[i];

      if (dia.start_time >= dia.end_time) {
        setErro(
          `O horário inicial deve ser anterior ao final em ${nomeDia(
            dia.day_of_week,
          )}.`,
        );
        return;
      }
    }

    setCarregando(true);

    let sucessos = 0;
    const falhas = [];

    try {
      if (editando) {
        const dia = dias[0];

        const dados = {
          day_of_week: Number(dia.day_of_week),
          start_time: dia.start_time,
          end_time: dia.end_time,
          is_external_allowed: dia.is_external_allowed,
        };

        await axios.put(
          `${API_URL}/disponibilidades/${disponibilidadeSelecionada.id}`,
          dados,
          obterConfig(),
        );

        sucessos = 1;
      } else {
        for (const dia of dias) {
          const dados = {
            space_id: formulario.space_id,
            day_of_week: Number(dia.day_of_week),
            start_time: dia.start_time,
            end_time: dia.end_time,
            is_external_allowed: dia.is_external_allowed,
          };

          try {
            await axios.post(
              `${API_URL}/disponibilidades`,
              dados,
              obterConfig(),
            );

            sucessos++;
          } catch (erroDia) {
            falhas.push({
              dia: nomeDia(dia.day_of_week),
              mensagem:
                erroDia.response?.data?.message ||
                "Erro ao cadastrar este dia.",
            });
          }
        }
      }

      if (editando) {
        setMensagem("Disponibilidade atualizada com sucesso!");
      } else if (falhas.length === 0) {
        setMensagem(
          `${sucessos} disponibilidade(s) cadastrada(s) com sucesso!`,
        );
      } else {
        setMensagem(
          `${sucessos} dia(s) cadastrado(s) com sucesso. ${falhas.length} dia(s) apresentaram erro.`,
        );
      }

      setFormulario({
        ...formularioInicial,
        dias: [novoDia()],
      });

      setEditando(false);
      setDisponibilidadeSelecionada(null);

      if (falhas.length > 0) {
        setErro(
          falhas.map((falha) => `${falha.dia}: ${falha.mensagem}`).join("\n"),
        );
      }

      await carregarDisponibilidades();
    } catch (erro) {
      setErro(
        erro.response?.data?.message || "Erro ao salvar disponibilidade.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function excluirDisponibilidade(disponibilidade) {
    const confirmar = window.confirm(
      "Deseja realmente excluir esta disponibilidade?",
    );

    if (!confirmar) return;

    setErro("");
    setMensagem("");

    try {
      const resposta = await axios.delete(
        `${API_URL}/disponibilidades/${disponibilidade.id}`,
        obterConfig(),
      );

      if (
        resposta.data.acao === "DESATIVADA" ||
        resposta.data.acao === "JA_INATIVA"
      ) {
        setMensagem(
          "A disponibilidade possui reserva vinculada e foi desativada. O registro foi preservado.",
        );
      } else {
        setMensagem("Disponibilidade excluída com sucesso!");
      }

      setDisponibilidadeSelecionada(null);

      await carregarDisponibilidades();
    } catch (erro) {
      setErro(
        erro.response?.data?.message || "Erro ao excluir disponibilidade.",
      );
    }
  }

  async function reativarDisponibilidade(disponibilidade) {
    const confirmar = window.confirm(
      `Deseja reativar a disponibilidade de ${nomeSala(
        disponibilidade.space_id,
      )} para ${nomeDia(disponibilidade.day_of_week)}?`,
    );

    if (!confirmar) return;

    setErro("");
    setMensagem("");
    setCarregando(true);

    try {
      const resposta = await axios.put(
        `${API_URL}/disponibilidades/${disponibilidade.id}`,
        {
          is_active: true,
        },
        obterConfig(),
      );

      setMensagem(
        resposta.data.message || "Disponibilidade reativada com sucesso!",
      );

      setDisponibilidadeSelecionada(null);

      await carregarDisponibilidades();
    } catch (erro) {
      setErro(
        erro.response?.data?.message || "Erro ao reativar disponibilidade.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function visualizarDisponibilidade(disponibilidade) {
    setDisponibilidadeSelecionada(disponibilidade);
    setEditando(false);
  }

  function voltarPainel() {
    if (perfilUsuario === "ADMIN") {
      router.push("/admin");
    } else {
      router.push("/recepcao");
    }
  }

  return (
    <main className="crud-container">
      <header className="crud-header">
        <div>
          <h1>Gerenciamento de Disponibilidades</h1>
          <p>Gerencie os horários disponíveis de cada sala.</p>
        </div>

        <button className="crud-button secondary" onClick={voltarPainel}>
          Voltar ao painel
        </button>
      </header>

      {mensagem && <div className="crud-success">{mensagem}</div>}

      {erro && (
        <div className="crud-error" style={{ whiteSpace: "pre-line" }}>
          {erro}
        </div>
      )}

      <section className="crud-card">
        <h2>
          {editando ? "Editar disponibilidade" : "Cadastrar disponibilidades"}
        </h2>

        <form onSubmit={salvarDisponibilidade}>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label>Sala</label>

              <select
                value={formulario.space_id}
                onChange={(evento) =>
                  setFormulario((atual) => ({
                    ...atual,
                    space_id: evento.target.value,
                  }))
                }
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

            {!editando && (
              <div className="crud-field">
                <label>Quantidade de dias da semana</label>

                <select
                  value={formulario.quantidade}
                  onChange={alterarQuantidade}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((quantidade) => (
                    <option key={quantidade} value={quantidade}>
                      {quantidade} {quantidade === 1 ? "dia" : "dias"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ marginTop: "25px" }}>
            <h3>
              {editando
                ? "Configuração do dia"
                : "Configure os dias selecionados"}
            </h3>

            {formulario.dias.map((dia, index) => (
              <div
                key={index}
                className="crud-card"
                style={{
                  marginTop: "18px",
                  marginBottom: "18px",
                  background: "#f8f9fb",
                }}
              >
                <h3>
                  {editando
                    ? "Disponibilidade selecionada"
                    : `Configuração ${index + 1}`}
                </h3>

                <div className="crud-form-grid">
                  <div className="crud-field">
                    <label>Dia da semana</label>

                    <select
                      value={dia.day_of_week}
                      onChange={(evento) =>
                        atualizarDia(index, "day_of_week", evento.target.value)
                      }
                      required
                    >
                      <option value="">Selecione o dia</option>

                      {diasSemana.map((diaSemana) => {
                        const selecionadoEmOutroCampo = formulario.dias.some(
                          (outroDia, outroIndex) =>
                            outroIndex !== index &&
                            String(outroDia.day_of_week) ===
                              String(diaSemana.value),
                        );

                        return (
                          <option
                            key={diaSemana.value}
                            value={diaSemana.value}
                            disabled={selecionadoEmOutroCampo}
                          >
                            {diaSemana.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="crud-field">
                    <label>Horário inicial</label>

                    <input
                      type="time"
                      value={dia.start_time}
                      onChange={(evento) =>
                        atualizarDia(index, "start_time", evento.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="crud-field">
                    <label>Horário final</label>

                    <input
                      type="time"
                      value={dia.end_time}
                      onChange={(evento) =>
                        atualizarDia(index, "end_time", evento.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="crud-field">
                    <label>Permitir usuários externos?</label>

                    <select
                      value={String(dia.is_external_allowed)}
                      onChange={(evento) =>
                        atualizarDia(
                          index,
                          "is_external_allowed",
                          evento.target.value === "true",
                        )
                      }
                    >
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
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
                  : "Cadastrar disponibilidades"}
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

          <div className="crud-field">
            <label>Permissão externa</label>

            <select
              value={filtroExterno}
              onChange={(evento) => setFiltroExterno(evento.target.value)}
            >
              <option value="">Todas</option>
              <option value="true">Permitida</option>
              <option value="false">Não permitida</option>
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

          <button
            className="crud-button secondary"
            onClick={() => {
              setFiltroSala("");
              setFiltroDia("");
              setFiltroExterno("");
              carregarDisponibilidades();
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
              placeholder="Cole o ID da disponibilidade"
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
            <h2>Disponibilidades cadastradas</h2>
            <p>Total encontrado: {disponibilidades.length}</p>
          </div>

          <button
            className="crud-button secondary"
            onClick={carregarDisponibilidades}
            disabled={carregando}
          >
            Atualizar lista
          </button>
        </div>

        {carregando && <p>Carregando...</p>}

        {!carregando && disponibilidades.length === 0 && (
          <p>Nenhuma disponibilidade cadastrada.</p>
        )}

        {!carregando && disponibilidades.length > 0 && (
          <div className="crud-table-wrapper">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Sala</th>
                  <th>Dia e próxima data</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Externo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {disponibilidades.map((disponibilidade) => {
                  const inativa = disponibilidade.is_active === false;

                  return (
                    <tr key={disponibilidade.id}>
                      <td>{nomeSala(disponibilidade.space_id)}</td>
                      <td>{diaComData(disponibilidade.day_of_week)}</td>
                      <td>{disponibilidade.start_time}</td>
                      <td>{disponibilidade.end_time}</td>
                      <td>
                        {disponibilidade.is_external_allowed ? "Sim" : "Não"}
                      </td>
                      <td>{inativa ? "Inativa" : "Ativa"}</td>

                      <td>
                        <div className="crud-row-actions">
                          <button
                            className="crud-button secondary"
                            onClick={() =>
                              visualizarDisponibilidade(disponibilidade)
                            }
                          >
                            Ver
                          </button>

                          <button
                            className="crud-button edit"
                            onClick={() => prepararEdicao(disponibilidade)}
                          >
                            Editar
                          </button>

                          {inativa ? (
                            <button
                              className="crud-button primary"
                              onClick={() =>
                                reativarDisponibilidade(disponibilidade)
                              }
                              disabled={carregando}
                            >
                              Reativar
                            </button>
                          ) : (
                            <button
                              className="crud-button delete"
                              onClick={() =>
                                excluirDisponibilidade(disponibilidade)
                              }
                              disabled={carregando}
                            >
                              Excluir
                            </button>
                          )}
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

      {disponibilidadeSelecionada && !editando && (
        <section className="crud-card">
          <h2>Detalhes da disponibilidade</h2>

          <p>
            <strong>ID:</strong> {disponibilidadeSelecionada.id}
          </p>

          <p>
            <strong>Sala:</strong>{" "}
            {nomeSala(disponibilidadeSelecionada.space_id)}
          </p>

          <p>
            <strong>ID da sala:</strong> {disponibilidadeSelecionada.space_id}
          </p>

          <p>
            <strong>Dia e próxima data:</strong>{" "}
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
            <strong>Permitir usuários externos:</strong>{" "}
            {disponibilidadeSelecionada.is_external_allowed ? "Sim" : "Não"}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {disponibilidadeSelecionada.is_active === false
              ? "Inativa"
              : "Ativa"}
          </p>

          <div className="crud-actions">
            {disponibilidadeSelecionada.is_active === false && (
              <button
                className="crud-button primary"
                onClick={() =>
                  reativarDisponibilidade(disponibilidadeSelecionada)
                }
                disabled={carregando}
              >
                Reativar disponibilidade
              </button>
            )}

            <button
              className="crud-button secondary"
              onClick={() => setDisponibilidadeSelecionada(null)}
            >
              Fechar detalhes
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
