import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, from } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import Swal from "sweetalert2";

let isRedirecting = false; 

const handleSessionExpired = async (message: string) => {
  
  if (isRedirecting) return;
  isRedirecting = true;

  localStorage.removeItem("token");

  const result = await Swal.fire({
    icon: "warning",
    title: "Session Ended",
    text: message,
    confirmButtonText: "Go to Login",
    confirmButtonColor: "#3085d6",
    allowOutsideClick: false,
    customClass:{
      popup:"main-color"
    }
  });

  if (result.isConfirmed) {
    window.location.href = "/login";
  }
};

const httpLink = new HttpLink({
  uri: `${process.env.REACT_APP_BACKEND_URL}/graphql`,
  fetch: async (uri, options) => {
    const response = await fetch(uri, options);

    if (response.status === 401 || response.status === 403) {
      await handleSessionExpired(response.statusText);
      throw new Error("Unauthorized");
    }

    try {
      const clone = response.clone();
      const data = await clone.json();
      if (data?.message?.includes("User no longer exists")) {
        await handleSessionExpired("User no longer exists. Please log in again.");
        throw new Error("User no longer exists");
      }
    } catch {
    }

    return response;
  },
});

const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem("token");
  if (token) {
    operation.setContext({
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  return forward(operation);
});

const errorLink = onError(({ graphQLErrors, networkError }: any) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (
        err.extensions?.code === "UNAUTHENTICATED" ||
        err.message === "Unauthorized" ||
        err.message === "Invalid token"
      ) {
         handleSessionExpired("Session expired. Please log in.");
      }
    }
  }

  if (networkError) {
    const statusCode =
      (networkError as any).statusCode ||
      (networkError as any).status ||
      (networkError as any).result?.statusCode;

    if (statusCode === 401 || statusCode === 403) {
       handleSessionExpired("Session expired. Please log in.");
    }
  }
});

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;
