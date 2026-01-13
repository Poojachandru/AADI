import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RestaurantPicker from "./pages/RestaurantPicker.jsx";
import RestaurantMenu from "./pages/RestaurantMenu.jsx";
import Cart from "./pages/Cart.jsx";
import StageOrder from "./pages/StageOrder.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RestaurantPicker />} />
        <Route path="/r/:restaurantId" element={<RestaurantMenu />} />
        <Route path="/r/:restaurantId/cart" element={<Cart />} />
        <Route path="/r/:restaurantId/stage" element={<StageOrder />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
