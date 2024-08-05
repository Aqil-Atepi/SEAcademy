
import { BrowserRouter,Routes,Route } from "react-router-dom"
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";

function App() {
  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route index element={<Dashboard/>}></Route>
        <Route path="/login" element={<Login/>}></Route>
        <Route path="/register" element={<Register/>}></Route>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
