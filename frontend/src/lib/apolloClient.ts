// src/apolloClient.ts
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, from } from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";
import { toast } from "react-toastify";

const httpLink = new HttpLink({ uri: "http://localhost:4040/graphql" });

const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem("token");
  if (token) {
    operation.setContext({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
  return forward(operation);
});


const errorLink = new ErrorLink((error: any) => {
  const showSessionExpired = () => {
    localStorage.removeItem("token");
    toast.error("Session expired. Please log in.");
    window.location.href = "/login";
  };

  if (error.graphQLErrors) {
    for (let err of error.graphQLErrors) {
      if (err.extensions?.code === "UNAUTHENTICATED" || err.message === "Unauthorized" || err.message === "Invalid token") {
        showSessionExpired();
      }
    }
  }

  if (error.networkError) {
    const statusCode = (error.networkError as any).statusCode || (error.networkError as any).status;
    if (statusCode === 401 || statusCode === 403) {
      showSessionExpired();
    }
  }
});

 const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client
