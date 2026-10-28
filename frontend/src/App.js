import { useState } from "react";
import Login from "./components/Login";
import Tasks from "./components/tasks";

function App() {
  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
  };

  return (
    <div>
      {!loggedIn ? (
        <Login onLogin={() => setLoggedIn(true)} />
      ) : (
        <Tasks onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
