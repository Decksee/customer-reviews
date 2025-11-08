import type { Route } from "./+types/home";
import { useEffect } from "react";
import { useNavigate, redirect } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export function loader() {
  return redirect("/feedback");
}
