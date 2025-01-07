import axios from "axios";

// Create an Axios instance with base URL
const api = axios.create({
  baseURL: "http://localhost:3000/api" || "https://crm-0y3x.onrender.com/",
  withCredentials: true,
});
// https://code-dev-crm.onrender.com/api"||
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('error', error)
    if (error.response && error.response.status === 401) {
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/"
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
export default api;
// http://localhost:3000/signup