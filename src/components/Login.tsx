import { useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const { reloadUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
  setLoading(true);

  await supabase.auth.signOut();

  const { error } =
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

  if (error) {
    setLoading(false);
    alert(error.message);
    return;
  }

  await reloadUser();

  setLoading(false);
}

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🅿️</div>

          <h1>SPP Warszawa</h1>

          <p>Monitoring Parkomatów</p>
        </div>

        <div className="login-form">
          <h3>🔐 Logowanie</h3>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <button
            onClick={login}
            disabled={loading}
          >
            {loading
              ? "Logowanie..."
              : "Zaloguj się"}
          </button>
        </div>

        <div className="login-footer">
          <div>
            Wersja 2.0
          </div>

          <div className="author">
            Projekt i wykonanie
            <br />
            <strong>
              Piotr Mądrzak
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}