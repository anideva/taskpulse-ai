import { useState } from "react";
import API from "../services/api";

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
        // Register user
        await API.post("/users/register", { name, email, password });
        // Automatically log in after registration
        const loginRes = await API.post("/users/login", { email, password });
        localStorage.setItem("token", loginRes.data.token);
        onLogin();
      } else {
        // Login user
        const res = await API.post("/users/login", { email, password });
        localStorage.setItem("token", res.data.token);
        onLogin();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (isRegister ? "Registration failed" : "Login failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError("");
    setSuccess("");
  };

  return (
    <div className="login-container">
      <h3>{isRegister ? "Create an Account" : "Welcome Back"}</h3>
      <p style={{ textAlign: "center", color: "#666", fontSize: "14px", marginTop: "-10px", marginBottom: "20px" }}>
        {isRegister
          ? "Sign up to start organizing tasks with AI"
          : "Sign in to access your dashboard"}
      </p>

      {error && (
        <div style={{
          backgroundColor: "#ffe5e5",
          color: "#d32f2f",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "13px",
          marginBottom: "15px"
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: "#e8f5e9",
          color: "#2e7d32",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "13px",
          marginBottom: "15px"
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <div>
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", marginTop: "12px", opacity: loading ? 0.7 : 1 }}
        >
          {loading
            ? "Please wait..."
            : isRegister
            ? "Sign Up"
            : "Sign In"}
        </button>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "14px", color: "#555" }}>
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={toggleMode}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1976d2",
                  cursor: "pointer",
                  padding: 0,
                  fontWeight: "bold",
                  textDecoration: "underline"
                }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              New user?{" "}
              <button
                type="button"
                onClick={toggleMode}
                style={{
                  background: "none",
                  border: "none",
                  color: "#28a745",
                  cursor: "pointer",
                  padding: 0,
                  fontWeight: "bold",
                  textDecoration: "underline"
                }}
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

export default Login;
