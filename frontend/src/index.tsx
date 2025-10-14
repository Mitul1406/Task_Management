import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloProvider } from "@apollo/client/react";
import App from "./App";
import client from "./lib/apolloClient";
import './index.css'
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthProvider } from "./context/AuthContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <AuthProvider>
      <App />
      </AuthProvider>
    </ApolloProvider>
  </React.StrictMode>
);
