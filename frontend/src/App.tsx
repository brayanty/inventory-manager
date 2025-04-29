import { BrowserRouter } from "react-router";
import "./App.css";
import AppRoutes from "./router/AppRouter";
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
