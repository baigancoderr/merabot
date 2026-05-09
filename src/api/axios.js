// import axios from "axios";

// const api = axios.create({
//   baseURL: "http://localhost:5000",
// });

// export default api;

import axios from "axios";

const api = axios.create({
  baseURL: "https://backend.cipera.net/",
  //  baseURL: "http://localhost:5000",
  
});

// ✅ REQUEST INTERCEPTOR (YAHI ADD KARNA HAI)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;