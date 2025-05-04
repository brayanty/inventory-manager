import { BrowserRouter } from "react-router";
import "./App.css";
import AppRoutes from "./router/AppRouter";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-center" autoClose={3000} theme="dark" />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
