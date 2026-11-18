"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PageA() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const usuarioSalvo = sessionStorage.getItem("usuario");

    if (!token || !usuarioSalvo) {
      router.replace("/");
      return;
    }

    try {
      const dados = JSON.parse(usuarioSalvo);

      if (dados.role !== "ADMIN") {
        const destinos = {
          RECEPTION: "/recepcao",
          CLIENT: "/cliente",
        };

        router.replace(destinos[dados.role] || "/");
        return;
      }

      setUsuario(dados);
    } catch {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("usuario");
      router.replace("/");
    }
  }, [router]);

  function sair() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    router.replace("/");
  }

  if (!usuario) {
    return <main className="dashboard-loading">Carregando painel...</main>;
  }

  const modulos = [
    {
      nome: "Usuários",
      descricao: "Gerencie os usuários do sistema.",
      caminho: "/admin/usuarios",
      icone: "👥",
    },
    {
      nome: "Empresas",
      descricao: "Gerencie as empresas cadastradas.",
      caminho: "/admin/empresas",
      icone: "🏢",
    },
    {
      nome: "Salas",
      descricao: "Cadastre e gerencie as salas.",
      caminho: "/admin/salas",
      icone: "🚪",
    },
    {
      nome: "Disponibilidades",
      descricao: "Configure os horários disponíveis.",
      caminho: "/admin/disponibilidades",
      icone: "🗓️",
    },
    {
      nome: "Reservas",
      descricao: "Consulte e gerencie as reservas.",
      caminho: "/admin/reservas",
      icone: "📋",
    },
  ];

  return (
    <div className="dashboard">
      <aside className={`sidebar ${menuAberto ? "sidebar-aberta" : ""}`}>
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">S</span>
          <span>SGE</span>
        </div>

        <p className="sidebar-label">MENU PRINCIPAL</p>

        <Link href="/admin" className="menu-item menu-item-ativo">
          <span>▦</span> Visão geral
        </Link>

        {modulos.map((modulo) => (
          <Link href={modulo.caminho} className="menu-item" key={modulo.nome}>
            <span>{modulo.icone}</span>
            {modulo.nome}
          </Link>
        ))}

        <button className="menu-sair" onClick={sair}>
          <span>↪</span> Sair
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <button
            className="menu-mobile"
            onClick={() => setMenuAberto(!menuAberto)}
          >
            ☰
          </button>

          <div>
            <span className="header-subtitle">SISTEMA DE GESTÃO</span>
            <h2>Painel administrativo</h2>
          </div>

          <div className="header-user">
            <div className="avatar">{usuario.name.charAt(0).toUpperCase()}</div>

            <div>
              <strong>{usuario.name}</strong>
              <span>Administrador</span>
            </div>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="welcome-section">
            <div>
              <span className="welcome-tag">VISÃO GERAL</span>
              <h1>Bem-vindo, {usuario.name.split(" ")[0]}!</h1>
              <p>Gerencie os recursos do sistema em um só lugar.</p>
            </div>
          </div>

          <div className="section-heading">
            <div>
              <h2>Gerenciamento</h2>
              <p>Escolha o módulo que deseja acessar.</p>
            </div>
          </div>

          <div className="module-grid">
            {modulos.map((modulo) => (
              <Link
                href={modulo.caminho}
                className="module-card"
                key={modulo.nome}
              >
                <div className="module-icon">{modulo.icone}</div>

                <h3>{modulo.nome}</h3>

                <p>{modulo.descricao}</p>

                <span className="module-link">
                  Acessar módulo <span>→</span>
                </span>
              </Link>
            ))}
          </div>

          <section className="dashboard-info">
            <div>
              <span className="info-icon">ℹ</span>
              <div>
                <strong>Área administrativa</strong>
                <p>
                  Você está conectado como administrador e possui acesso aos
                  módulos de gerenciamento.
                </p>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
