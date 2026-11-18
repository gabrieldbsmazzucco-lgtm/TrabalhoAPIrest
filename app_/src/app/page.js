"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const destinos = {
  ADMIN: "/admin",
  RECEPTION: "/recepcao",
  CLIENT: "/cliente",
};

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function fazerLogin(event) {
    event.preventDefault();

    setErro("");
    setCarregando(true);

    try {
      const resposta = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { token, usuario } = resposta.data;

      if (!token || !usuario || !destinos[usuario.role]) {
        setErro("Dados de autenticação inválidos.");
        return;
      }

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("usuario", JSON.stringify(usuario));

      router.replace(destinos[usuario.role]);
    } catch (error) {
      setErro(
        error.response?.data?.message ||
          "Não foi possível conectar ao servidor.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="container">
      <section className="login-card">
        <div className="logo">SGE</div>

        <h1>Bem-vindo ao sistema</h1>

        <p className="subtitle">Entre com suas credenciais para continuar.</p>

        <form onSubmit={fazerLogin}>
          <div className="campo">
            <label htmlFor="email">E-mail</label>

            <input
              id="email"
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="password">Senha</label>

            <input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {erro && <p className="mensagem-erro">{erro}</p>}

          <button className="botao" type="submit" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="rodape">Sistema de Gestão de Espaços</p>
      </section>
    </main>
  );
}
