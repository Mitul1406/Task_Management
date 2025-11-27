import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloProvider } from "@apollo/client/react";
import App from "./App";
import client from "./lib/apolloClient";
import './index.css'
import "bootstrap/dist/css/bootstrap.min.css";
import { SidebarProvider } from "./context/SideBarContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <SidebarProvider>
      <App />
      </SidebarProvider>
    </ApolloProvider>
  </React.StrictMode>
);
