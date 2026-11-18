"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const destinos = {
  ADMIN: "/admin",
  RECEPTION: "/recepcao",
  CLIENT: "/cliente",
};

const nomesPerfis = {
  ADMIN: "Administrador",
  RECEPTION: "Recepcionista",
  CLIENT: "Cliente",
};

const rotasRecepcao = {
  "Gerenciar salas": "/admin/salas",
  "Gerenciar disponibilidades": "/admin/disponibilidades",
  "Gerenciar reservas": "/admin/reservas",
};

export default function PainelPerfil({
  perfil,
  titulo,
  descricao,
  funcionalidades,
}) {
  const router = useRouter();

  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const usuarioSalvo = sessionStorage.getItem("usuario");

    if (!token || !usuarioSalvo) {
      router.replace("/");
      return;
    }

    try {
      const dadosUsuario = JSON.parse(usuarioSalvo);

      if (!destinos[dadosUsuario.role]) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("usuario");
        router.replace("/");
        return;
      }

      if (dadosUsuario.role !== perfil) {
        router.replace(destinos[dadosUsuario.role]);
        return;
      }

      setUsuario(dadosUsuario);
      setVerificando(false);
    } catch {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("usuario");
      router.replace("/");
    }
  }, [perfil, router]);

  function sair() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");

    router.replace("/");
  }

  function acessarFuncionalidade(funcionalidade) {
    const rota = rotasRecepcao[funcionalidade];

    if (rota) {
      router.push(rota);
    }
  }

  if (verificando || !usuario) {
    return <main className="container">Carregando painel...</main>;
  }

  return (
    <main className="container">
      <section className="login-card">
        <div className="logo">SGE</div>

        <h1>{titulo}</h1>

        <p className="subtitle">{descricao}</p>

        <div className="usuario-info">
          <p>
            <strong>Nome:</strong> {usuario.name}
          </p>

          <p>
            <strong>E-mail:</strong> {usuario.email}
          </p>

          <p>
            <strong>Perfil:</strong> {nomesPerfis[usuario.role]}
          </p>
        </div>

        <h2 className="titulo-funcionalidades">Funcionalidades</h2>

        <ul className="lista-funcionalidades">
          {funcionalidades.map((funcionalidade) => {
            const rota =
              perfil === "RECEPTION" ? rotasRecepcao[funcionalidade] : null;

            return (
              <li key={funcionalidade}>
                {rota ? (
                  <button
                    type="button"
                    className="botao"
                    onClick={() => acessarFuncionalidade(funcionalidade)}
                  >
                    {funcionalidade}
                  </button>
                ) : (
                  funcionalidade
                )}
              </li>
            );
          })}
        </ul>

        <button className="botao" onClick={sair}>
          Sair
        </button>
      </section>
    </main>
  );
}
